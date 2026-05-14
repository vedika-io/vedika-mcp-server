import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerIChingTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_iching_cast',
    'Cast an I Ching (Book of Changes) hexagram for divination. Uses the traditional yarrow stalk or three-coin method simulation. Returns the primary hexagram (1-64), its name, judgment, image, and line texts. If any changing lines exist, also returns the transformed hexagram. Each hexagram includes the upper and lower trigrams with their attributes. The I Ching is the oldest Chinese divination system (~3000 years). Cost: $0.012/call.',
    {
      question: z.string().max(2000).optional()
        .describe('Question or situation to consult the I Ching about. Phrased as a clear question gets better results.'),
      method: z.enum(['yarrow', 'coin']).optional()
        .describe('Casting method. yarrow=traditional 50-stalk method (more nuanced probability). coin=three-coin method (simpler, equal probability). Default: coin.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = {};
      if (args.question) body.question = args.question;
      if (args.method) body.method = args.method;
      const result = await client.post('/v2/divination/iching/cast', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
