import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'chart': '/v2/western/transit-chart',
  'positions': '/v2/western/transit-positions',
  'aspects': '/v2/western/transit-aspects',
};

export function registerWesternTransitsTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_western_transits',
    'Western astrology current transits against a natal chart. Tropical zodiac (no ayanamsa). "chart" returns the full transit chart overlay. "positions" returns current planetary positions in tropical signs. "aspects" returns current transit aspects (conjunction, opposition, trine, square, sextile) to natal planets with orbs. Vedika Ephemeris computed. Cost: $0.064/call.',
    {
      type: z.enum(['chart', 'positions', 'aspects'])
        .default('chart')
        .describe('chart=full transit overlay (default). positions=current planets. aspects=transit-to-natal aspects with orbs.'),
      ...BirthDetailsSchema.omit({ ayanamsa: true }).shape,
      transitDateTime: z.string().optional()
        .describe('Transit date/time in ISO 8601. Defaults to now.'),
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['chart'];
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.transitDateTime) body.transitDateTime = args.transitDateTime;
      const result = await client.post(path, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
