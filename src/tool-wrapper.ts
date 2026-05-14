import { VedikaApiError } from './errors.js';

type McpResult = { content: Array<{ type: 'text'; text: string }>; isError?: true };

export async function safeTool(fn: () => Promise<McpResult>): Promise<McpResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof VedikaApiError) return err.toMcpError();
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text' as const, text: msg }], isError: true };
  }
}
