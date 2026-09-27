import * as https from 'https';
import { DeepSeekApiHost, DeepSeekApiPath, RequestTimeoutMs } from './DeepSeek.constants';
import type { DeepSeekChatResponse, DeepSeekMessage, GenerateCommitMessageOptions } from './DeepSeek.types';

/**
 * Client for the DeepSeek chat completions API, specialized in turning a git diff into a
 * commit message.
 */
export class DeepSeekClient {
    private readonly apiKey: string;
    private readonly model: string;

    /**
     * @param {string} apiKey - The DeepSeek API key used to authenticate requests.
     * @param {string} model - The DeepSeek model identifier to use (e.g. "deepseek-chat").
     */
    public constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
        this.model = model;
    }

    /**
     * Generates a commit message summarizing the given diff.
     *
     * @param {GenerateCommitMessageOptions} options - The diff and formatting preferences.
     * @returns {Promise<string>} A promise that resolves to the generated commit message text.
     * @throws {Error} When the DeepSeek API request fails or returns an empty message.
     */
    public async generateCommitMessage(options: GenerateCommitMessageOptions): Promise<string> {
        const body = JSON.stringify({
            model: this.model,
            messages: this.buildPrompt(options),
            temperature: 0.2,
            stream: false
        });

        const response = await this.performRequest(body);
        const content = response.choices[0]?.message?.content?.trim();

        if (!content) {
            throw new Error('DeepSeek returned an empty commit message.');
        }

        return this.stripCodeFences(content);
    }

    /**
     * Builds the system and user prompt messages sent to the DeepSeek chat completion endpoint.
     *
     * @param {GenerateCommitMessageOptions} options - The diff and formatting preferences.
     * @returns {DeepSeekMessage[]} The ordered list of messages to send to the API.
     */
    private buildPrompt(options: GenerateCommitMessageOptions): DeepSeekMessage[] {
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
     * Removes surrounding markdown code fences from a model response, if present.
     *
     * @param {string} text - The raw text returned by the model.
     * @returns {string} The text with any leading/trailing code fences removed.
     */
    private stripCodeFences(text: string): string {
        const fenceMatch = text.match(/^```[a-z]*\n([\s\S]*?)\n```$/i);
        return fenceMatch ? fenceMatch[1].trim() : text;
    }

    /**
     * Performs the raw HTTPS request to the DeepSeek chat completions endpoint.
     *
     * @param {string} body - The JSON-encoded request body.
     * @returns {Promise<DeepSeekChatResponse>} A promise that resolves to the parsed JSON response.
     * @throws {Error} When the request times out, fails on the network, or the API returns a non-2xx status.
     */
    private performRequest(body: string): Promise<DeepSeekChatResponse> {
        return new Promise((resolve, reject) => {
            const request = https.request(
                {
                    hostname: DeepSeekApiHost,
                    path: DeepSeekApiPath,
                    method: 'POST',
                    timeout: RequestTimeoutMs,
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                        Authorization: `Bearer ${this.apiKey}`
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

            // avoids the request hanging forever when DeepSeek is unreachable
            request.on('timeout', () => {
                request.destroy(new Error(`DeepSeek API request timed out after ${RequestTimeoutMs}ms.`));
            });
            request.on('error', reject);
            request.write(body);
            request.end();
        });
    }
}
