import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerTarotDailyTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_tarot_daily',
    'Get the tarot card of the day. Returns a single card with its upright meaning, reversed meaning, keywords, element, suit, and daily guidance. Cached per day — repeated calls return the same card. Cost: $0.008/call.',
    {
      date: z.string().optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today.'),
      deck: z.enum(['rider-waite', 'thoth', 'marseille']).optional()
        .describe('Tarot deck system. Default: rider-waite.'),
    },
    async (args) => safeTool(async () => {
      const params: Record<string, string> = {};
      if (args.date) params.date = args.date;
      if (args.deck) params.deck = args.deck;
      const result = await client.get('/v2/divination/tarot/daily', params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
