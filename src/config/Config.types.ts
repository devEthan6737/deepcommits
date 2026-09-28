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
    CustomInstructions = 'customInstructions',
    ConfirmBeforeCommit = 'confirmBeforeCommit',
    AutoCommit = 'autoCommit',
    SplitCommitsByDirectory = 'splitCommitsByDirectory'
}

/**
 * Resolved DeepCommits settings used to generate a commit message.
 * @property {string} model - The DeepSeek model identifier to use.
 * @property {string} language - The language the commit message should be written in.
 * @property {DeepCommitsSettingsEnum} commitConvention - Whether to enforce Conventional Commits formatting.
 * @property {string} customInstructions - Extra user-provided style instructions for the AI.
 * @property {boolean} confirmBeforeCommit - Whether to ask for confirmation before committing a generated message.
 * @property {boolean} autoCommit - Whether "Generate and Commit Instantly" runs headless (no panel), committing and notifying instead.
 * @property {boolean} splitCommitsByDirectory - Whether the headless auto-commit flow creates one commit per top-level changed directory instead of a single combined commit.
 */
export interface DeepCommitsSettings {
    model: string;
    language: string;
    commitConvention: DeepCommitsSettingsEnum;
    customInstructions: string;
    confirmBeforeCommit: boolean;
    autoCommit: boolean;
    splitCommitsByDirectory: boolean;
}
