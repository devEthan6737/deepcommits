import * as vscode from 'vscode';
import { ConfigService } from './ConfigService';
import { DeepSeekClient } from './DeepSeekClient';
import { GitRepositoryService } from './GitRepositoryService';
import type { GitApiRepository, GitCommit } from './GitRepository.types';

/**
 * A message sent from the webview to the extension host.
 * @property {'generate'|'commit'|'refresh'} type - The action requested by the webview.
 * @property {string} message - The edited commit message, present for 'commit' actions.
 */
interface InboundMessage {
    type: 'generate' | 'commit' | 'refresh';
    message?: string;
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
     * "generate and commit" keyboard shortcut.
     *
     * @returns {Promise<void>} A promise that resolves once the commit attempt has finished.
     */
    public async generateAndCommit(): Promise<void> {
        const message = await this.generate();
        if (message) {
            await this.commitMessage(message);
        }
    }

    /**
     * Routes a message received from the webview to the matching action.
     *
     * @param {InboundMessage} message - The message sent by the webview script.
     * @returns {Promise<void>} A promise that resolves once the action has completed.
     */
    private async handleMessage(message: InboundMessage): Promise<void> {
        switch (message.type) {
            case 'generate':
                await this.generate();
                return;
            case 'commit':
                await this.commitMessage(message.message ?? '');
                return;
            case 'refresh':
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
        this.post({ type: 'status', status: 'generating' });

        try {
            const gitRepositoryService = await this.getGitRepositoryService();
            const repository = gitRepositoryService.pickRepository();
            const diff = await gitRepositoryService.getRelevantDiff(repository);

            if (!diff.trim()) {
                this.post({ type: 'error', message: 'No changes to commit were found.' });
                return undefined;
            }

            const apiKey = await this.configService.resolveApiKey();
            if (!apiKey) {
                this.post({ type: 'error', message: 'A DeepSeek API key is required.' });
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

            this.post({ type: 'generated', message: result.message, usage: result.usage });
            return result.message;
        } catch (error) {
            this.post({ type: 'error', message: (error as Error).message });
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
            this.post({ type: 'error', message: 'The commit message is empty.' });
            return;
        }

        try {
            const gitRepositoryService = await this.getGitRepositoryService();
            const repository = gitRepositoryService.pickRepository();
            await gitRepositoryService.commit(repository, message);
            this.post({ type: 'committed' });
            await this.refresh();
        } catch (error) {
            this.post({ type: 'error', message: (error as Error).message });
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
                type: 'info',
                repository: this.describeRepository(repository),
                commits: commits.map((commit) => this.describeCommit(commit))
            });
        } catch (error) {
            this.post({ type: 'error', message: (error as Error).message });
        }
    }

    /**
     * Builds the repository summary shown at the top of the panel.
     *
     * @param {GitApiRepository} repository - The repository to describe.
     * @returns {{ name: string; branch: string; stagedCount: number; changedCount: number }} A plain summary object.
     */
    private describeRepository(repository: GitApiRepository) {
        return {
            name: repository.rootUri.path.split('/').filter(Boolean).pop() ?? repository.rootUri.path,
            branch: repository.state.HEAD?.name ?? 'detached',
            stagedCount: repository.state.indexChanges.length,
            changedCount: repository.state.workingTreeChanges.length
        };
    }

    /**
     * Builds the plain object sent to the webview for a single commit entry.
     *
     * @param {GitCommit} commit - The commit to describe.
     * @returns {{ hash: string; message: string; authorName: string; date: string }} A plain summary object.
     */
    private describeCommit(commit: GitCommit) {
        return {
            hash: commit.hash.slice(0, 7),
            message: commit.message.split('\n')[0],
            authorName: commit.authorName ?? '',
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

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <title>DeepCommits</title>
    <style>
        :root {
            color-scheme: light dark;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }

        .card {
            background-color: var(--vscode-sideBar-background, var(--vscode-editor-background));
            border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .card h2 {
            margin: 0 0 12px 0;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--vscode-descriptionForeground);
        }

        .repo-info {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 20px;
            font-size: 13px;
        }

        .repo-info span b {
            color: var(--vscode-foreground);
        }

        textarea {
            width: 100%;
            min-height: 110px;
            resize: vertical;
            font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
            font-size: 13px;
            padding: 10px;
            border-radius: 8px;
            border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
        }

        textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        .usage-line {
            margin-top: 8px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            min-height: 16px;
        }

        .actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        button {
            border: none;
            border-radius: 6px;
            padding: 6px 14px;
            font-size: 13px;
            cursor: pointer;
            background-color: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
            color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
        }

        button.primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.5;
            cursor: default;
        }

        .error {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            margin-top: 8px;
            min-height: 16px;
        }

        ul.commits {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        ul.commits li {
            display: flex;
            gap: 10px;
            align-items: baseline;
            font-size: 12px;
            border-bottom: 1px solid var(--vscode-widget-border, transparent);
            padding-bottom: 8px;
        }

        ul.commits li:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }

        .commit-hash {
            font-family: var(--vscode-editor-font-family, monospace);
            color: var(--vscode-textLink-foreground);
        }

        .commit-meta {
            color: var(--vscode-descriptionForeground);
        }

        .empty {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>Repository</h2>
        <div class="repo-info" id="repo-info">
            <span class="empty">Loading...</span>
        </div>
    </div>

    <div class="card">
        <h2>Commit message</h2>
        <textarea id="message" placeholder="Click Generate to draft a commit message from your staged diff..."></textarea>
        <div class="usage-line" id="usage"></div>
        <div class="error" id="error"></div>
        <div class="actions">
            <button class="primary" id="generate">Generate</button>
            <button id="commit">Commit</button>
        </div>
    </div>

    <div class="card">
        <h2>Recent commits</h2>
        <ul class="commits" id="commits">
            <li class="empty">Loading...</li>
        </ul>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const messageBox = document.getElementById('message');
        const usageLine = document.getElementById('usage');
        const errorLine = document.getElementById('error');
        const generateButton = document.getElementById('generate');
        const commitButton = document.getElementById('commit');
        const repoInfo = document.getElementById('repo-info');
        const commitsList = document.getElementById('commits');

        function setBusy(busy) {
            generateButton.disabled = busy;
            commitButton.disabled = busy;
        }

        generateButton.addEventListener('click', () => {
            errorLine.textContent = '';
            setBusy(true);
            vscode.postMessage({ type: 'generate' });
        });

        commitButton.addEventListener('click', () => {
            errorLine.textContent = '';
            setBusy(true);
            vscode.postMessage({ type: 'commit', message: messageBox.value });
        });

        window.addEventListener('message', (event) => {
            const data = event.data;

            switch (data.type) {
                case 'status':
                    if (data.status === 'generating') {
                        usageLine.textContent = 'Generating...';
                    }
                    return;
                case 'generated':
                    messageBox.value = data.message;
                    usageLine.textContent =
                        data.usage.totalTokens +
                        ' tokens (' +
                        data.usage.promptTokens +
                        ' prompt + ' +
                        data.usage.completionTokens +
                        ' completion)';
                    setBusy(false);
                    return;
                case 'committed':
                    messageBox.value = '';
                    usageLine.textContent = '';
                    setBusy(false);
                    return;
                case 'error':
                    errorLine.textContent = data.message;
                    setBusy(false);
                    return;
                case 'info':
                    repoInfo.innerHTML =
                        '<span><b>' + data.repository.name + '</b></span>' +
                        '<span>branch: <b>' + data.repository.branch + '</b></span>' +
                        '<span>staged: <b>' + data.repository.stagedCount + '</b></span>' +
                        '<span>changed: <b>' + data.repository.changedCount + '</b></span>';

                    if (data.commits.length === 0) {
                        commitsList.innerHTML = '<li class="empty">No commits yet.</li>';
                        return;
                    }

                    commitsList.innerHTML = data.commits
                        .map(
                            (commit) =>
                                '<li><span class="commit-hash">' +
                                commit.hash +
                                '</span><span>' +
                                commit.message +
                                '</span><span class="commit-meta">' +
                                commit.authorName +
                                (commit.date ? ' &middot; ' + commit.date : '') +
                                '</span></li>'
                        )
                        .join('');
                    return;
            }
        });

        vscode.postMessage({ type: 'refresh' });
    </script>
</body>
</html>`;
    }
}
