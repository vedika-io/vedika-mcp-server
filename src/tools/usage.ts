import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerUsageTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_usage',
    'Check your Vedika API usage, wallet balance, and billing history. Wallet balance is in USD cents (divide by 100 for dollars). History returns recent transactions (default 50, maximum 500) from at most 1000 latest records. No page or cursor is available. Summary and models aggregate at most 1000 records; check the returned truncated and scanLimit fields. Models groups by public service tier. Free — no cost to check.',
    {
      action: z.enum(['wallet', 'history', 'summary', 'models'])
        .default('wallet')
        .describe('wallet=current balance (default). history=recent transaction records. summary=bounded aggregated stats. models=bounded usage by service tier.'),
      limit: z.number().int().min(1).max(500).optional()
        .describe('Maximum recent records for history only. Default: 50. Maximum: 500. No continuation cursor.'),
    },
    async (args) => safeTool(async () => {
      if (args.limit !== undefined && args.action !== 'history') {
        return { content: [{ type: 'text' as const, text: 'limit is supported only for the history action.' }], isError: true };
      }
      const params = args.limit === undefined ? undefined : { limit: String(args.limit) };
      const result = await client.get(`/api/v1/usage/${args.action}`, params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
