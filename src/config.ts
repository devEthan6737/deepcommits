import * as vscode from 'vscode';

const CONFIG_SECTION = 'deepcommits';
const SECRET_KEY = 'deepcommits.apiKey';

/**
 * Resolved DeepCommits settings used to generate a commit message.
 * @property {string} model - The DeepSeek model identifier to use.
 * @property {string} language - The language the commit message should be written in.
 * @property {'conventional'|'freeform'} commitConvention - Whether to enforce Conventional Commits formatting.
 */
export interface DeepCommitsSettings {
  model: string;
  language: string;
  commitConvention: 'conventional' | 'freeform';
}

/**
 * Reads the non-secret DeepCommits settings from the workspace configuration.
 *
 * @returns {DeepCommitsSettings} The resolved model, language, and commit convention settings.
 */
export function getSettings(): DeepCommitsSettings {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    model: config.get<string>('model', 'deepseek-chat'),
    language: config.get<string>('language', 'en'),
    commitConvention: config.get<'conventional' | 'freeform'>('commitConvention', 'conventional')
  };
}

/**
 * Retrieves the DeepSeek API key, checking user settings first and falling back to the secure
 * secret storage. If neither holds a key, the user is prompted to enter one, which is then saved
 * to secret storage for future use.
 *
 * @param {vscode.ExtensionContext} context - The extension context, used to access secret storage.
 * @returns {Promise<string | undefined>} A promise that resolves to the API key, or undefined if the user cancels.
 */
export async function resolveApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const settingsKey = config.get<string>('apiKey', '').trim();
  if (settingsKey) {
    return settingsKey;
  }

  const storedKey = await context.secrets.get(SECRET_KEY);
  if (storedKey) {
    return storedKey;
  }

  const enteredKey = await vscode.window.showInputBox({
    title: 'DeepCommits: DeepSeek API Key',
    prompt: 'Enter your DeepSeek API key. It will be stored securely for future use.',
    password: true,
    ignoreFocusOut: true
  });

  if (!enteredKey) {
    return undefined;
  }

  await context.secrets.store(SECRET_KEY, enteredKey.trim());
  return enteredKey.trim();
}
