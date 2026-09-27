import { EventEmitter } from 'events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();

vi.mock('https', () => ({
    request: (...args: unknown[]) => requestMock(...args)
}));

/**
 * Builds a fake `https.ClientRequest`/`IncomingMessage` pair that emits the given response body
 * and status code asynchronously, mimicking Node's real event-based HTTP flow closely enough for
 * `DeepSeekClient` to consume it.
 *
 * @param {number} statusCode - The HTTP status code the fake response should report.
 * @param {string} responseBody - The raw response body to emit.
 * @returns {{ request: EventEmitter & { write: () => void; end: () => void; destroy: () => void }; response: EventEmitter & { statusCode: number; setEncoding: () => void } }} The fake request/response pair.
 */
function createFakeExchange(statusCode: number, responseBody: string) {
    const response = Object.assign(new EventEmitter(), { statusCode, setEncoding: () => undefined });
    const request = Object.assign(new EventEmitter(), {
        write: () => undefined,
        end: () => {
            queueMicrotask(() => {
                response.emit('data', responseBody);
                response.emit('end');
            });
        },
        destroy: () => undefined
    });

    return { request, response };
}

describe('DeepSeekClient', () => {
    beforeEach(() => {
        requestMock.mockReset();
    });

    it('returns the generated commit message and token usage on a successful response', async () => {
        const { request, response } = createFakeExchange(
            200,
            JSON.stringify({
                choices: [{ message: { content: 'fix: correct off-by-one error' } }],
                usage: { prompt_tokens: 120, completion_tokens: 8, total_tokens: 128 }
            })
        );

        requestMock.mockImplementation((_options: unknown, callback: (response: unknown) => void) => {
            callback(response);
            return request;
        });

        const { DeepSeekClient } = await import('./DeepSeekClient');
        const client = new DeepSeekClient('fake-api-key', 'deepseek-chat');
        const result = await client.generateCommitMessage({
            diff: 'diff --git a/file.ts b/file.ts',
            language: 'en',
            commitConvention: 'conventional',
            customInstructions: ''
        });

        expect(result.message).toBe('fix: correct off-by-one error');
        expect(result.usage).toEqual({ promptTokens: 120, completionTokens: 8, totalTokens: 128 });
    });

    it('rejects when the API responds with a non-2xx status', async () => {
        const { request, response } = createFakeExchange(401, JSON.stringify({ error: 'invalid api key' }));

        requestMock.mockImplementation((_options: unknown, callback: (response: unknown) => void) => {
            callback(response);
            return request;
        });

        const { DeepSeekClient } = await import('./DeepSeekClient');
        const client = new DeepSeekClient('bad-api-key', 'deepseek-chat');

        await expect(
            client.generateCommitMessage({
                diff: 'diff --git a/file.ts b/file.ts',
                language: 'en',
                commitConvention: 'conventional',
                customInstructions: ''
            })
        ).rejects.toThrow(/DeepSeek API request failed \(401\)/);
    });
});
