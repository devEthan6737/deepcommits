import { DeepCommitsSettingsEnum } from './Config.types';

/** Root section name for DeepCommits settings in `settings.json`. */
export const ConfigSection = 'deepcommits';

/** Key used to store the DeepSeek API key in VS Code's secret storage. */
export const SecretKey = 'deepcommits.apiKey';

/** Default DeepSeek model presented to the user when no model is configured. */
export const DefaultModel = 'deepseek-chat';

/** Default language for generated commit messages. */
export const DefaultLanguage = 'en';

/** Default commit message convention. */
export const DefaultCommitConvention = DeepCommitsSettingsEnum.Conventional;

/** Default custom instructions for the AI (none). */
export const DefaultCustomInstructions = '';

/** Whether a confirmation is required before committing a generated message, by default. */
export const DefaultConfirmBeforeCommit = true;

/** Whether "Generate and Commit Instantly" runs headless by default. */
export const DefaultAutoCommit = false;

/** Whether the headless auto-commit flow splits commits by directory by default. */
export const DefaultSplitCommitsByDirectory = false;
