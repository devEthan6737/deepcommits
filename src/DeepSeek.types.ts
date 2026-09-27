/**
 * A single message exchanged with the DeepSeek chat completions API.
 * @property {'system'|'user'|'assistant'} role - The role of the message author.
 * @property {string} content - The text content of the message.
 */
export interface DeepSeekMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Options required to generate a commit message from a staged diff.
 * @property {string} diff - The staged git diff to summarize into a commit message.
 * @property {string} language - The language the commit message should be written in.
 * @property {'conventional'|'freeform'} commitConvention - Whether to enforce Conventional Commits formatting.
 */
export interface GenerateCommitMessageOptions {
    diff: string;
    language: string;
    commitConvention: 'conventional' | 'freeform';
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
 * The response payload returned by the DeepSeek chat completions API.
 * @property {DeepSeekChatChoice[]} choices - The list of completion choices returned by the API.
 */
export interface DeepSeekChatResponse {
    choices: DeepSeekChatChoice[];
}
