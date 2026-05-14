import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { TarotSpreadEnum } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerTarotDrawTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_tarot_draw',
    'Draw tarot cards in a chosen spread layout. Single = 1 card quick answer. Three-card = past/present/future or situation/action/outcome. Celtic Cross = 10-card comprehensive reading covering situation, challenges, past, future, above, below, advice, environment, hopes, and outcome. Horseshoe = 7-card arc. Relationship and Career spreads are themed 5-card layouts. Each card includes upright/reversed orientation, suit, and position meaning. Cost: $0.020-0.048/call.',
    {
      spread: TarotSpreadEnum
        .default('three-card')
        .describe('Spread layout. single=1 card. three-card=past/present/future (default). celtic-cross=10 cards comprehensive. horseshoe=7 cards. relationship=5 cards themed. career=5 cards themed.'),
      question: z.string().max(2000).optional()
        .describe('Optional question or intention to focus the reading.'),
      deck: z.enum(['rider-waite', 'thoth', 'marseille']).optional()
        .describe('Tarot deck system. Default: rider-waite.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = {
        spread: args.spread,
      };
      if (args.question) body.question = args.question;
      if (args.deck) body.deck = args.deck;
      const result = await client.post('/v2/divination/tarot/draw', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
