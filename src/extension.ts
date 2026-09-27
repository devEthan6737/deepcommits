import * as vscode from 'vscode';
import { generateCommitMessage } from './deepseekClient';
import { resolveApiKey, getSettings } from './config';
import { getGitApi, pickRepository, getRelevantDiff } from './gitRepository';

const MaxDiffLength = 12000;

/**
 * Activates the DeepCommits extension, registering its commands.
 *
 * @param {vscode.ExtensionContext} context - The extension context provided by VS Code.
 * @returns {void} Nothing.
 */
export function activate(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('deepcommits.generateCommitMessage', () =>
        handleGenerateCommitMessage(context)
    );

    context.subscriptions.push(disposable);
}

/**
 * Deactivates the DeepCommits extension. No cleanup is currently required.
 *
 * @returns {void} Nothing.
 */
export function deactivate(): void {
    // No resources to release.
}

/**
 * Orchestrates the end-to-end flow for generating a commit message: reads the staged diff,
 * calls the DeepSeek API, and writes the result into the Source Control input box.
 *
 * @param {vscode.ExtensionContext} context - The extension context, used to resolve the API key.
 * @returns {Promise<void>} A promise that resolves once the commit message has been generated.
 */
async function handleGenerateCommitMessage(context: vscode.ExtensionContext): Promise<void> {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.SourceControl,
            title: 'DeepCommits: generating commit message...'
        },
        async () => {
            try {
                const gitApi = await getGitApi();
                const repository = pickRepository(gitApi);
                const diff = await getRelevantDiff(repository);

                if (!diff.trim()) {
                    vscode.window.showWarningMessage('DeepCommits: no changes to commit were found.');
                    return;
                }

                const apiKey = await resolveApiKey(context);
                if (!apiKey) {
                    vscode.window.showWarningMessage('DeepCommits: a DeepSeek API key is required.');
                    return;
                }

                const settings = getSettings();
                const message = await generateCommitMessage({
                    apiKey,
                    model: settings.model,
                    language: settings.language,
                    commitConvention: settings.commitConvention,
                    diff: truncateDiff(diff)
                });

                repository.inputBox.value = message;
            } catch (error) {
                vscode.window.showErrorMessage(`DeepCommits: ${(error as Error).message}`);
            }
        }
    );
}

/**
 * Truncates an overly large diff so it stays within a reasonable prompt size for the DeepSeek API.
 *
 * @param {string} diff - The full diff text.
 * @returns {string} The diff, truncated with a notice if it exceeded the maximum length.
 */
function truncateDiff(diff: string): string {
    if (diff.length <= MaxDiffLength) {
        return diff;
    }

    return `${diff.slice(0, MaxDiffLength)}\n\n[diff truncated for length]`;
}
