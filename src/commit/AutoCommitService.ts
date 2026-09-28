import * as vscode from 'vscode';
import { ConfigService } from '../config/ConfigService';
import { DeepSeekClient } from '../deepseek/DeepSeekClient';
import { GitRepositoryService } from '../git/GitRepositoryService';
import type { ChangedFileGroup } from '../git/GitRepository.types';
import { ConfirmActionEnum } from './Commit.types';
import type { AutoCommitContext } from './Commit.types';

/**
 * Runs the "generate and commit" flow headlessly, with no panel: it reads the settings, generates
 * one or more commit messages (one per changed directory when splitting is enabled), optionally
 * asks for confirmation, commits, and reports the outcome through VS Code notifications.
 */
export class AutoCommitService {
    private readonly configService: ConfigService;

    /**
     * @param {ConfigService} configService - Resolves DeepCommits settings and the DeepSeek API key.
     */
    public constructor(configService: ConfigService) {
        this.configService = configService;
    }

    /**
     * Generates and commits the repository's pending changes according to the current settings.
     *
     * @returns {Promise<void>} A promise that resolves once the flow has finished (committed, cancelled, or failed).
     */
    public async run(): Promise<void> {
        try {
            const gitRepositoryService = await GitRepositoryService.connect();
            const repository = gitRepositoryService.pickRepository();
            const settings = this.configService.getSettings();

            const apiKey = await this.configService.resolveApiKey();
            if (!apiKey) {
                vscode.window.showWarningMessage('DeepCommits: a DeepSeek API key is required.');
                return;
            }

            const context: AutoCommitContext = {
                gitRepositoryService,
                repository,
                client: new DeepSeekClient(apiKey, settings.model),
                settings
            };

            const committedMessages = settings.splitCommitsByDirectory
                ? await this.commitByGroup(context)
                : await this.commitEverything(context);

            this.notifyResult(committedMessages);
        } catch (error) {
            vscode.window.showErrorMessage(`DeepCommits: ${(error as Error).message}`);
        }
    }

    /**
     * Generates one message for the repository's entire pending diff and commits it as a single commit.
     *
     * @param {AutoCommitContext} context - The dependencies and settings for this run.
     * @returns {Promise<string[]>} A promise that resolves to the committed message, or an empty array if nothing was committed.
     */
    private async commitEverything(context: AutoCommitContext): Promise<string[]> {
        const { gitRepositoryService, repository, client, settings } = context;
        const diff = await gitRepositoryService.getRelevantDiff(repository);

        if (!diff.trim()) return [];

        const result = await client.generateCommitMessage({
            language: settings.language,
            commitConvention: settings.commitConvention,
            customInstructions: settings.customInstructions,
            diff
        });

        if (settings.confirmBeforeCommit && !(await this.confirm(result.message))) return [];

        await gitRepositoryService.commit(repository, result.message);
        return [ result.message ];
    }

    /**
     * Generates one message per top-level changed directory and commits each group separately.
     *
     * @param {AutoCommitContext} context - The dependencies and settings for this run.
     * @returns {Promise<string[]>} A promise that resolves to the committed messages, in group order.
     */
    private async commitByGroup(context: AutoCommitContext): Promise<string[]> {
        const groups = context.gitRepositoryService.getChangedFileGroups(context.repository);
        const committedMessages: string[] = [];

        for (const group of groups) {
            const message = await this.commitOneGroup(context, group);
            if (message) committedMessages.push(message);
        }

        return committedMessages;
    }

    /**
     * Generates and, once confirmed, commits a single changed-file group.
     *
     * @param {AutoCommitContext} context - The dependencies and settings for this run.
     * @param {ChangedFileGroup} group - The group of files to generate a message for and commit.
     * @returns {Promise<string | undefined>} A promise that resolves to the committed message, or undefined if skipped.
     */
    private async commitOneGroup(context: AutoCommitContext, group: ChangedFileGroup): Promise<string | undefined> {
        const { gitRepositoryService, repository, client, settings } = context;
        const diff = await gitRepositoryService.getDiffForGroup(repository, group);
        if (!diff.trim()) return undefined;

        const result = await client.generateCommitMessage({
            language: settings.language,
            commitConvention: settings.commitConvention,
            customInstructions: settings.customInstructions,
            diff
        });

        if (settings.confirmBeforeCommit && !(await this.confirm(result.message, group.directory))) return undefined;

        await gitRepositoryService.commitGroup(repository, result.message, group);
        return result.message;
    }

    /**
     * Asks the user to confirm a generated commit message before it is used to commit.
     *
     * @param {string} message - The generated commit message to show.
     * @param {string} scope - An optional label (e.g. a directory name) describing what this commit covers.
     * @returns {Promise<boolean>} A promise that resolves to true if the user accepted the commit.
     */
    private async confirm(message: string, scope?: string): Promise<boolean> {
        const prompt = scope
            ? `DeepCommits: commit "${scope}" with this message?`
            : 'DeepCommits: commit with this message?';

        const choice = await vscode.window.showWarningMessage(prompt, { modal: true, detail: message }, ConfirmActionEnum.Commit);
        return choice === ConfirmActionEnum.Commit;
    }

    /**
     * Reports the outcome of the auto-commit flow through a VS Code notification.
     *
     * @param {string[]} committedMessages - The first line of each commit message that was created, in order.
     * @returns {void} Nothing.
     */
    private notifyResult(committedMessages: string[]): void {
        if (committedMessages.length === 0) {
            vscode.window.showInformationMessage('DeepCommits: no commit was made.');
            return;
        }

        const summary = committedMessages.map((message) => `- ${message.split('\n')[0]}`).join('\n');
        const count = committedMessages.length === 1 ? '1 commit' : `${committedMessages.length} commits`;
        vscode.window.showInformationMessage(`DeepCommits: created ${count}.\n${summary}`);
    }
}
