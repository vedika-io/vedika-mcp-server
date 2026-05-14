import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'vimshottari': '/v2/astrology/vimshottari-dasha',
  'mahadasha': '/v2/astrology/mahadasha',
  'antardasha': '/v2/astrology/antardasha',
  'pratyantardasha': '/v2/astrology/pratyantardasha',
  'yogini': '/v2/astrology/yogini-dasha',
};

export function registerDashaTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_dasha',
    'Calculate planetary period timelines (Dasha). Vimshottari is the primary 120-year cycle used in Vedic astrology — shows current Mahadasha (major period), Antardasha (sub-period), and Pratyantar (sub-sub-period) with exact start/end dates. Based on Moon nakshatra at birth. Yogini is an alternative 8-year cycle. Cost: $0.016-0.028/call.',
    {
      system: z.enum(['vimshottari', 'mahadasha', 'antardasha', 'pratyantardasha', 'yogini'])
        .default('vimshottari')
        .describe('Dasha system. vimshottari=full 120-year timeline (default). mahadasha=main periods only. antardasha=sub-periods. pratyantardasha=sub-sub-periods. yogini=alternative 8-year cycle.'),
      ...BirthDetailsSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.system] ?? ENDPOINTS['vimshottari'];
      const result = await client.post(path, extractBirthDetails(args));
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
