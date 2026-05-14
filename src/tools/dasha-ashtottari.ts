import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerDashaAshtottariTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_dasha_ashtottari',
    'Calculate the Ashtottari Dasha (108-year cycle). An alternative to Vimshottari (120-year) used when Rahu is in a Kendra or Trikona from the Lagna lord, or when the birth is at night in Krishna Paksha / day in Shukla Paksha. Uses 8 planets (excludes Ketu) with periods: Sun 6y, Moon 15y, Mars 8y, Mercury 17y, Saturn 10y, Jupiter 19y, Rahu 12y, Venus 21y = 108 total. Returns current Mahadasha, Antardasha, and full timeline with start/end dates. Cost: $0.020/call.',
    {
      ...BirthDetailsSchema.shape,
      depth: z.enum(['mahadasha', 'antardasha', 'pratyantardasha']).optional()
        .describe('Level of detail. mahadasha=main periods only. antardasha=include sub-periods (default). pratyantardasha=include sub-sub-periods.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.depth) body.depth = args.depth;
      const result = await client.post('/v2/astrology/ashtottari-dasha', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
