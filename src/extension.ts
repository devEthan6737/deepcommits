import * as vscode from 'vscode';
import { CommitPanel } from './CommitPanel';
import { ConfigService } from './ConfigService';
import { DeepSeekClient } from './DeepSeekClient';
import { GitRepositoryService } from './GitRepositoryService';

/**
 * Activates the DeepCommits extension, registering its commands.
 *
 * @param {vscode.ExtensionContext} context - The extension context provided by VS Code.
 * @returns {void} Nothing.
 */
export function activate(context: vscode.ExtensionContext): void {
    const configService = new ConfigService(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('deepcommits.generateCommitMessage', () =>
            handleGenerateCommitMessage(configService)
        ),
        vscode.commands.registerCommand('deepcommits.clearApiKey', () => handleClearApiKey(configService)),
        vscode.commands.registerCommand('deepcommits.openPanel', () => {
            CommitPanel.createOrShow(configService);
        }),
        vscode.commands.registerCommand('deepcommits.generateAndCommit', () =>
            CommitPanel.createOrShow(configService).generateAndCommit()
        )
    );
}

/**
 * Deactivates the DeepCommits extension. No cleanup is currently required.
 *
 * @returns {void} Nothing.
 */
export function deactivate(): void {
    // no resources to release
}

/**
 * Orchestrates the end-to-end flow for generating a commit message: reads the staged diff,
 * calls the DeepSeek API, and writes the result into the Source Control input box.
 *
 * @param {ConfigService} configService - Resolves DeepCommits settings and the DeepSeek API key.
 * @returns {Promise<void>} A promise that resolves once the commit message has been generated.
 */
async function handleGenerateCommitMessage(configService: ConfigService): Promise<void> {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.SourceControl,
            title: 'DeepCommits: generating commit message...'
        },
        async () => {
            try {
                const gitRepositoryService = await GitRepositoryService.connect();
                const repository = gitRepositoryService.pickRepository();
                const diff = await gitRepositoryService.getRelevantDiff(repository);

                if (!diff.trim()) {
                    vscode.window.showWarningMessage('DeepCommits: no changes to commit were found.');
                    return;
                }

                const apiKey = await configService.resolveApiKey();
                if (!apiKey) {
                    vscode.window.showWarningMessage('DeepCommits: a DeepSeek API key is required.');
                    return;
                }

                const settings = configService.getSettings();
                const deepSeekClient = new DeepSeekClient(apiKey, settings.model);
                const result = await deepSeekClient.generateCommitMessage({
                    language: settings.language,
                    commitConvention: settings.commitConvention,
                    customInstructions: settings.customInstructions,
                    diff
                });

                repository.inputBox.value = result.message;
            } catch (error) {
                vscode.window.showErrorMessage(`DeepCommits: ${(error as Error).message}`);
            }
        }
    );
}

/**
 * Clears the stored DeepSeek API key so the user is prompted for a new one next time.
 *
 * @param {ConfigService} configService - Manages the stored DeepSeek API key.
 * @returns {Promise<void>} A promise that resolves once the key has been cleared.
 */
async function handleClearApiKey(configService: ConfigService): Promise<void> {
    await configService.clearApiKey();
    vscode.window.showInformationMessage('DeepCommits: stored DeepSeek API key cleared.');
}
