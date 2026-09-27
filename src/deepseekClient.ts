import * as https from 'https';

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
 * @property {string} apiKey - The DeepSeek API key used to authenticate the request.
 * @property {string} model - The DeepSeek model identifier to use (e.g. "deepseek-chat").
 * @property {string} diff - The staged git diff to summarize into a commit message.
 * @property {string} language - The language the commit message should be written in.
 * @property {'conventional'|'freeform'} commitConvention - Whether to enforce Conventional Commits formatting.
 */
export interface GenerateCommitMessageOptions {
    apiKey: string;
    model: string;
    diff: string;
    language: string;
    commitConvention: 'conventional' | 'freeform';
}

const DeepSeekApiHost = 'api.deepseek.com';
const DeepSeekApiPath = '/chat/completions';

/**
 * A single completion choice returned by the DeepSeek chat completions API.
 * @property {Object} message - The generated message object.
 * @property {string} message.content - The generated text content.
 */
interface DeepSeekChatChoice {
    message: {
        content: string;
    };
}

/**
 * The response payload returned by the DeepSeek chat completions API.
 * @property {DeepSeekChatChoice[]} choices - The list of completion choices returned by the API.
 */
interface DeepSeekChatResponse {
    choices: DeepSeekChatChoice[];
}

/**
 * Builds the system and user prompt messages sent to the DeepSeek chat completion endpoint.
 *
 * @param {GenerateCommitMessageOptions} options - The options describing the diff and formatting rules.
 * @returns {DeepSeekMessage[]} The ordered list of messages to send to the API.
 */
function buildPrompt(options: GenerateCommitMessageOptions): DeepSeekMessage[] {
    const conventionInstructions =
        options.commitConvention === 'conventional'
            ? 'Follow the Conventional Commits specification (e.g. "feat: ...", "fix: ...", "refactor: ...", "chore: ...").'
            : 'Write a concise, plain-English summary without a required prefix.';

    return [
        {
            role: 'system',
            content:
                'You are a senior software engineer who writes clear, precise git commit messages. ' +
                'You only output the commit message itself, with no extra commentary, quotes, or markdown fences.'
        },
        {
            role: 'user',
            content:
                `Write a git commit message in "${options.language}" for the following staged diff. ` +
                `${conventionInstructions} ` +
                'Keep the first line under 72 characters. Add a short body only if it adds real value.\n\n' +
                '```diff\n' +
                options.diff +
                '\n```'
        }
    ];
}

/**
 * Calls the DeepSeek chat completions API and returns the generated commit message.
 *
 * @param {GenerateCommitMessageOptions} options - The API key, model, diff, and formatting preferences.
 * @returns {Promise<string>} A promise that resolves to the generated commit message text.
 */
export async function generateCommitMessage(options: GenerateCommitMessageOptions): Promise<string> {
    const messages = buildPrompt(options);

    const body = JSON.stringify({
        model: options.model,
        messages,
        temperature: 0.2,
        stream: false
    });

    const response = await performRequest(body, options.apiKey);
    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
        throw new Error('DeepSeek returned an empty commit message.');
    }

    return stripCodeFences(content);
}

/**
 * Removes surrounding markdown code fences from a model response, if present.
 *
 * @param {string} text - The raw text returned by the model.
 * @returns {string} The text with any leading/trailing code fences removed.
 */
function stripCodeFences(text: string): string {
    const fenceMatch = text.match(/^```[a-z]*\n([\s\S]*?)\n```$/i);
    return fenceMatch ? fenceMatch[1].trim() : text;
}

/**
 * Performs the raw HTTPS request to the DeepSeek chat completions endpoint.
 *
 * @param {string} body - The JSON-encoded request body.
 * @param {string} apiKey - The DeepSeek API key used for bearer authentication.
 * @returns {Promise<DeepSeekChatResponse>} A promise that resolves to the parsed JSON response.
 */
function performRequest(body: string, apiKey: string): Promise<DeepSeekChatResponse> {
    return new Promise((resolve, reject) => {
        const request = https.request(
            {
                hostname: DeepSeekApiHost,
                path: DeepSeekApiPath,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body),
                    Authorization: `Bearer ${apiKey}`
                }
            },
            (response) => {
                let data = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    const statusCode = response.statusCode ?? 0;
                    if (statusCode < 200 || statusCode >= 300) {
                        reject(new Error(`DeepSeek API request failed (${statusCode}): ${data}`));
                        return;
                    }
                    try {
                        resolve(JSON.parse(data) as DeepSeekChatResponse);
                    } catch (error) {
                        reject(new Error(`Failed to parse DeepSeek API response: ${(error as Error).message}`));
                    }
                });
            }
        );

        request.on('error', reject);
        request.write(body);
        request.end();
    });
}
