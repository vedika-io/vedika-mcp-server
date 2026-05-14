import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerUsageTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_usage',
    'Check your Vedika API usage, wallet balance, and billing history. Wallet balance is in USD cents (divide by 100 for dollars). History shows individual transactions. Summary shows aggregated stats. Models shows usage by AI model. Free — no cost to check.',
    {
      action: z.enum(['wallet', 'history', 'summary', 'models'])
        .default('wallet')
        .describe('wallet=current balance (default). history=transaction records. summary=aggregated stats. models=usage by AI model.'),
      page: z.number().optional().describe('Page number for history. Default: 1.'),
      limit: z.number().optional().describe('Items per page for history. Default: 20.'),
    },
    async (args) => safeTool(async () => {
      const params: Record<string, string> = {};
      if (args.page) params.page = String(args.page);
      if (args.limit) params.limit = String(args.limit);
      const result = await client.get(`/api/v1/usage/${args.action}`, params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
