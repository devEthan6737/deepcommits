/** Hostname of the DeepSeek API. */
export const DeepSeekApiHost = 'api.deepseek.com';

/** Path of the chat completions endpoint on the DeepSeek API. */
export const DeepSeekApiPath = '/chat/completions';

/** Default DeepSeek model used when none is configured. */
export const DefaultModel = 'deepseek-chat';

/** Maximum number of diff characters sent to the DeepSeek API in a single request. */
export const MaxDiffLength = 12000;

/** Maximum time, in milliseconds, to wait for a DeepSeek API response before failing. */
export const RequestTimeoutMs = 30000;
