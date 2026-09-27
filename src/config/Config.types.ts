/** Whether generated commit messages should follow Conventional Commits formatting. */
export enum DeepCommitsSettingsEnum {
    Conventional = 'conventional',
    FreeForm = 'freeform'
}

/** Keys of the `deepcommits.*` settings read from the workspace configuration. */
export enum ConfigKeyEnum {
    ApiKey = 'apiKey',
    Model = 'model',
    Language = 'language',
    CommitConvention = 'commitConvention',
    CustomInstructions = 'customInstructions'
}

/**
 * Resolved DeepCommits settings used to generate a commit message.
 * @property {string} model - The DeepSeek model identifier to use.
 * @property {string} language - The language the commit message should be written in.
 * @property {DeepCommitsSettingsEnum} commitConvention - Whether to enforce Conventional Commits formatting.
 * @property {string} customInstructions - Extra user-provided style instructions for the AI.
 */
export interface DeepCommitsSettings {
    model: string;
    language: string;
    commitConvention: DeepCommitsSettingsEnum;
    customInstructions: string;
}
