import * as vscode from 'vscode';
import { ConfigService } from '../config/ConfigService';
import { DeepSeekClient } from '../deepseek/DeepSeekClient';
import { GitRepositoryService } from '../git/GitRepositoryService';
import type { GitApiRepository, GitCommit } from '../git/GitRepository.types';
import { ConfirmActionEnum } from '../commit/Commit.types';
import commitPanelHtml from './CommitPanel.html';

enum InboundMessageEnum {
    /** Request a new commit message from the diff. */
    Generate = 'generate',
    /** Commit staged changes using the provided message. */
    Commit = 'commit',
    /** Reload the panel's diff/commit data. */
    Refresh = 'refresh'
}

/**
 * A message sent from the webview to the extension host.
 * @property {InboundMessageEnum} type - The action requested by the webview.
 * @property {string} message - The edited commit message, present for 'commit' actions.
 */
interface InboundMessage {
    type: InboundMessageEnum;
    message?: string;
}

/** The kind of message posted from the extension host to the webview script. */
enum OutboundMessageEnum {
    /** A long-running action started or progressed. */
    Status = 'status',
    /** A commit message and its token usage were generated. */
    Generated = 'generated',
    /** The commit message was committed successfully. */
    Committed = 'committed',
    /** An action failed. */
    Error = 'error',
    /** Repository info and recent commit history were refreshed. */
    Info = 'info'
}

/** Status values sent alongside an {@link OutboundMessageEnum.Status} message. */
enum GenerationStatusEnum {
    Generating = 'generating'
}

/** View identifier used for the DeepCommits webview panel. */
const ViewType = 'deepcommits.panel';

/**
 * A Notion-style panel that generates, previews, and commits AI-written commit messages, and
 * shows the repository's recent history and token usage for the last generation.
 */
export class CommitPanel {
    private static currentPanel: CommitPanel | undefined;

    private readonly panel: vscode.WebviewPanel;
    private readonly configService: ConfigService;
    private readonly disposables: vscode.Disposable[] = [];
    private gitRepositoryService?: GitRepositoryService;

    /**
     * @param {vscode.WebviewPanel} panel - The underlying VS Code webview panel.
     * @param {ConfigService} configService - Resolves DeepCommits settings and the API key.
     */
    private constructor(panel: vscode.WebviewPanel, configService: ConfigService) {
        this.panel = panel;
        this.configService = configService;

        this.panel.webview.html = this.getHtml();
        this.panel.webview.onDidReceiveMessage((message: InboundMessage) => this.handleMessage(message), null, this.disposables);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        void this.refresh();
    }

    /**
     * Opens the DeepCommits panel, creating it if it does not exist yet, or revealing it if it does.
     *
     * @param {ConfigService} configService - Resolves DeepCommits settings and the API key.
     * @returns {CommitPanel} The active panel instance.
     */
    public static createOrShow(configService: ConfigService): CommitPanel {
        if (CommitPanel.currentPanel) {
            CommitPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
            return CommitPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(ViewType, 'DeepCommits', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });

        CommitPanel.currentPanel = new CommitPanel(panel, configService);
        return CommitPanel.currentPanel;
    }

    /**
     * Generates a commit message from the current diff and immediately commits it, for use by the
     * "generate and commit" keyboard shortcut. When `deepcommits.confirmBeforeCommit` is enabled, asks
     * for confirmation first.
     *
     * @returns {Promise<void>} A promise that resolves once the commit attempt has finished.
     */
    public async generateAndCommit(): Promise<void> {
        const message = await this.generate();
        if (!message) return;

        if (this.configService.getSettings().confirmBeforeCommit && !(await this.confirmCommit(message))) return;

        await this.commitMessage(message);
    }

    /**
     * Asks the user to confirm a generated commit message before it is used to commit.
     *
     * @param {string} message - The generated commit message to show.
     * @returns {Promise<boolean>} A promise that resolves to true if the user accepted the commit.
     */
    private async confirmCommit(message: string): Promise<boolean> {
        const choice = await vscode.window.showWarningMessage(
            'DeepCommits: commit with this message?',
            { modal: true, detail: message },
            ConfirmActionEnum.Commit
        );

        return choice === ConfirmActionEnum.Commit;
    }

    /**
     * Routes a message received from the webview to the matching action.
     *
     * @param {InboundMessage} message - The message sent by the webview script.
     * @returns {Promise<void>} A promise that resolves once the action has completed.
     */
    private async handleMessage(message: InboundMessage): Promise<void> {
        switch (message.type) {
            case InboundMessageEnum.Generate:
                await this.generate();
                return;
            case InboundMessageEnum.Commit:
                await this.commitMessage(message.message ?? '');
                return;
            case InboundMessageEnum.Refresh:
                await this.refresh();
                return;
        }
    }

    /**
     * Generates a commit message for the current diff and pushes it to the webview along with its
     * token usage.
     *
     * @returns {Promise<string | undefined>} A promise that resolves to the generated message, or undefined on failure.
     */
    private async generate(): Promise<string | undefined> {
        this.post({ type: OutboundMessageEnum.Status, status: GenerationStatusEnum.Generating });

        try {
            const gitRepositoryService = await this.getGitRepositoryService();
            const repository = gitRepositoryService.pickRepository();
            const diff = await gitRepositoryService.getRelevantDiff(repository);

            if (!diff.trim()) {
                this.post({ type: OutboundMessageEnum.Error, message: 'No changes to commit were found.' });
                return undefined;
            }

            const apiKey = await this.configService.resolveApiKey();
            if (!apiKey) {
                this.post({ type: OutboundMessageEnum.Error, message: 'A DeepSeek API key is required.' });
                return undefined;
            }

            const settings = this.configService.getSettings();
            const client = new DeepSeekClient(apiKey, settings.model);
            const result = await client.generateCommitMessage({
                language: settings.language,
                commitConvention: settings.commitConvention,
                customInstructions: settings.customInstructions,
                diff
            });

            this.post({ type: OutboundMessageEnum.Generated, message: result.message, usage: result.usage });
            return result.message;
        } catch (error) {
            this.post({ type: OutboundMessageEnum.Error, message: (error as Error).message });
            return undefined;
        }
    }

    /**
     * Commits the given message in the active repository and refreshes the panel's history.
     *
     * @param {string} message - The commit message to use.
     * @returns {Promise<void>} A promise that resolves once the commit and refresh have finished.
     */
    private async commitMessage(message: string): Promise<void> {
        if (!message.trim()) {
            this.post({ type: OutboundMessageEnum.Error, message: 'The commit message is empty.' });
            return;
        }

        try {
            const gitRepositoryService = await this.getGitRepositoryService();
            const repository = gitRepositoryService.pickRepository();
            await gitRepositoryService.commit(repository, message);
            this.post({ type: OutboundMessageEnum.Committed });
            await this.refresh();
        } catch (error) {
            this.post({ type: OutboundMessageEnum.Error, message: (error as Error).message });
        }
    }

    /**
     * Refreshes the repository info and recent commit history shown in the panel.
     *
     * @returns {Promise<void>} A promise that resolves once the refreshed data has been sent.
     */
    private async refresh(): Promise<void> {
        try {
            const gitRepositoryService = await this.getGitRepositoryService();
            const repository = gitRepositoryService.pickRepository();
            const commits = await gitRepositoryService.getRecentCommits(repository);

            this.post({
                type: OutboundMessageEnum.Info,
                repository: this.describeRepository(repository),
                commits: commits.map((commit) => this.describeCommit(commit))
            });
        } catch (error) {
            this.post({ type: OutboundMessageEnum.Error, message: (error as Error).message });
        }
    }

    /**
     * Builds the repository summary shown at the top of the panel.
     *
     * @param {GitApiRepository} repository - The repository to describe.
     * @returns {{ name: string; branch: string; stagedCount: number }} A plain summary object.
     */
    private describeRepository(repository: GitApiRepository) {
        return {
            name: repository.rootUri.path.split('/').filter(Boolean).pop() ?? repository.rootUri.path,
            branch: repository.state.HEAD?.name ?? 'detached',
            stagedCount: repository.state.indexChanges.length
        };
    }

    /**
     * Builds the plain object sent to the webview for a single commit entry.
     *
     * @param {GitCommit} commit - The commit to describe.
     * @returns {{ hash: string; message: string; date: string }} A plain summary object.
     */
    private describeCommit(commit: GitCommit) {
        return {
            hash: commit.hash.slice(0, 7),
            message: commit.message.split('\n')[0],
            date: commit.commitDate ? new Date(commit.commitDate).toLocaleString() : ''
        };
    }

    /**
     * Lazily connects to the built-in Git extension, reusing the connection across calls.
     *
     * @returns {Promise<GitRepositoryService>} A promise that resolves to a ready-to-use service.
     */
    private async getGitRepositoryService(): Promise<GitRepositoryService> {
        if (!this.gitRepositoryService) {
            this.gitRepositoryService = await GitRepositoryService.connect();
        }

        return this.gitRepositoryService;
    }

    /**
     * Sends a message to the webview script.
     *
     * @param {Record<string, unknown>} message - The payload to post to the webview.
     * @returns {void} Nothing.
     */
    private post(message: Record<string, unknown>): void {
        void this.panel.webview.postMessage(message);
    }

    /**
     * Disposes the panel and its resources.
     *
     * @returns {void} Nothing.
     */
    private dispose(): void {
        CommitPanel.currentPanel = undefined;
        for (const disposable of this.disposables.splice(0)) {
            disposable.dispose();
        }
    }

    /**
     * Builds the webview's HTML, styled with VS Code theme variables so it matches the active theme.
     *
     * @returns {string} The full HTML document for the webview.
     */
    private getHtml(): string {
        const nonce = String(Date.now());

        return commitPanelHtml.split('__NONCE__').join(nonce);
    }
}
