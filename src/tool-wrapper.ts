import { VedikaApiError } from './errors.js';

/** Only fixed local validation messages may use this type. */
export class SafeToolInputError extends Error {}

type McpResult = { content: Array<{ type: 'text'; text: string }>; isError?: true };

export async function safeTool(fn: () => Promise<McpResult>): Promise<McpResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof VedikaApiError) return err.toMcpError();
    if (err instanceof SafeToolInputError) {
      return { content: [{ type: 'text', text: err.message }], isError: true };
    }
    const msg = err instanceof Error && err.name === 'AbortError'
      ? 'Vedika API request timed out. Try again later.'
      : 'The tool request failed. Try again later.';
    return { content: [{ type: 'text' as const, text: msg }], isError: true };
  }
}
