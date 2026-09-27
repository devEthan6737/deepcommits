/**
 * Resolved DeepCommits settings used to generate a commit message.
 * @property {string} model - The DeepSeek model identifier to use.
 * @property {string} language - The language the commit message should be written in.
 * @property {'conventional'|'freeform'} commitConvention - Whether to enforce Conventional Commits formatting.
 * @property {string} customInstructions - Extra user-provided style instructions for the AI.
 */
export interface DeepCommitsSettings {
    model: string;
    language: string;
    commitConvention: 'conventional' | 'freeform';
    customInstructions: string;
}
