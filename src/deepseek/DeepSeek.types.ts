import type { DeepCommitsSettingsEnum } from '../config/Config.types';

/** The role of a message author in the DeepSeek chat completions API. */
export enum DeepSeekRoleEnum {
    System = 'system',
    User = 'user',
    Assistant = 'assistant'
}

/**
 * A single message exchanged with the DeepSeek chat completions API.
 * @property {DeepSeekRoleEnum} role - The role of the message author.
 * @property {string} content - The text content of the message.
 */
export interface DeepSeekMessage {
    role: DeepSeekRoleEnum;
    content: string;
}

/**
 * Options required to generate a commit message from a staged diff.
 * @property {string} diff - The staged git diff to summarize into a commit message.
 * @property {string} language - The language the commit message should be written in.
 * @property {DeepCommitsSettingsEnum} commitConvention - Whether to enforce Conventional Commits formatting.
 * @property {string} customInstructions - Extra user-provided style instructions for the AI, if any.
 */
export interface GenerateCommitMessageOptions {
    diff: string;
    language: string;
    commitConvention: DeepCommitsSettingsEnum;
    customInstructions: string;
}

/**
 * Token usage reported by the DeepSeek API for a single request.
 * @property {number} promptTokens - Tokens consumed by the prompt (diff + instructions).
 * @property {number} completionTokens - Tokens consumed by the generated commit message.
 * @property {number} totalTokens - Total tokens billed for the request.
 */
export interface DeepSeekUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

/**
 * The result of generating a commit message: the text itself plus the token usage it cost.
 * @property {string} message - The generated commit message.
 * @property {DeepSeekUsage} usage - The token usage reported by the API for this request.
 */
export interface GenerateCommitMessageResult {
    message: string;
    usage: DeepSeekUsage;
}

/**
 * A single completion choice returned by the DeepSeek chat completions API.
 * @property {Object} message - The generated message object.
 * @property {string} message.content - The generated text content.
 */
export interface DeepSeekChatChoice {
    message: {
        content: string;
    };
}

/**
 * The raw token usage block returned by the DeepSeek chat completions API.
 * @property {number} prompt_tokens - Tokens consumed by the prompt.
 * @property {number} completion_tokens - Tokens consumed by the completion.
 * @property {number} total_tokens - Total tokens billed for the request.
 */
export interface DeepSeekRawUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

/**
 * The response payload returned by the DeepSeek chat completions API.
 * @property {DeepSeekChatChoice[]} choices - The list of completion choices returned by the API.
 * @property {DeepSeekRawUsage} usage - The token usage for this request.
 */
export interface DeepSeekChatResponse {
    choices: DeepSeekChatChoice[];
    usage?: DeepSeekRawUsage;
}
