import * as vscode from 'vscode';
import {
    ConfigSection,
    DefaultCommitConvention,
    DefaultLanguage,
    DefaultModel,
    SecretKey
} from './Config.constants';
import type { DeepCommitsSettings } from './Config.types';

/**
 * Reads DeepCommits settings and resolves the DeepSeek API key, storing it securely in VS Code's
 * secret storage when the user has not set it in `settings.json`.
 */
export class ConfigService {
    private readonly context: vscode.ExtensionContext;

    /**
     * @param {vscode.ExtensionContext} context - The extension context, used to access secret storage.
     */
    public constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Reads the non-secret DeepCommits settings from the workspace configuration.
     *
     * @returns {DeepCommitsSettings} The resolved model, language, and commit convention settings.
     */
    public getSettings(): DeepCommitsSettings {
        const config = this.getConfiguration();
        return {
            model: config.get<string>('model', DefaultModel),
            language: config.get<string>('language', DefaultLanguage),
            commitConvention: config.get<'conventional' | 'freeform'>('commitConvention', DefaultCommitConvention)
        };
    }

    /**
     * Retrieves the DeepSeek API key, checking user settings first and falling back to the secure
     * secret storage. If neither holds a key, the user is prompted to enter one, which is then saved
     * to secret storage for future use.
     *
     * @returns {Promise<string | undefined>} A promise that resolves to the API key, or undefined if the user cancels.
     */
    public async resolveApiKey(): Promise<string | undefined> {
        const settingsKey = this.getConfiguration().get<string>('apiKey', '').trim();
        if (settingsKey) {
            return settingsKey;
        }

        const storedKey = await this.context.secrets.get(SecretKey);
        if (storedKey) {
            return storedKey;
        }

        const enteredKey = await this.promptForApiKey();
        if (!enteredKey) {
            return undefined;
        }

        await this.context.secrets.store(SecretKey, enteredKey);
        return enteredKey;
    }

    /**
     * Removes the DeepSeek API key from secret storage, so the user is prompted again next time.
     *
     * @returns {Promise<void>} A promise that resolves once the stored key has been removed.
     */
    public async clearApiKey(): Promise<void> {
        await this.context.secrets.delete(SecretKey);
    }

    /**
     * Prompts the user to enter their DeepSeek API key.
     *
     * @returns {Promise<string | undefined>} A promise that resolves to the trimmed key, or undefined if cancelled.
     */
    private async promptForApiKey(): Promise<string | undefined> {
        const enteredKey = await vscode.window.showInputBox({
            title: 'DeepCommits: DeepSeek API Key',
            prompt: 'Enter your DeepSeek API key. It will be stored securely for future use.',
            password: true,
            ignoreFocusOut: true
        });

        return enteredKey?.trim() || undefined;
    }

    /**
     * Reads DeepCommits' workspace configuration section.
     *
     * @returns {vscode.WorkspaceConfiguration} The DeepCommits configuration section.
     */
    private getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(ConfigSection);
    }
}
