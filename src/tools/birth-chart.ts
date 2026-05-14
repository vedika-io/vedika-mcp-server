import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'kundli': '/v2/astrology/kundli',
  'birth-chart': '/v2/astrology/birth-chart',
  'planetary-positions': '/v2/astrology/planetary-positions',
  'house-cusps': '/v2/astrology/house-cusps',
  'ascendant': '/v2/astrology/ascendant',
  'birth-details': '/v2/astrology/birth-details',
};

export function registerBirthChartTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_birth_chart',
    'Generate a Vedic birth chart (Kundli) with planetary positions, house cusps, ascendant, nakshatras, and dignities. All calculations use in-house Swiss Ephemeris (sidereal, Lahiri ayanamsa default). "kundli" returns the full chart. "planetary-positions" returns all 9 planets + Rahu/Ketu with sign, degree, house, nakshatra, retrograde status. "house-cusps" returns all 12 house boundaries. "ascendant" returns lagna details. Cost: $0.016-0.028/call.',
    {
      type: z.enum(['kundli', 'birth-chart', 'planetary-positions', 'house-cusps', 'ascendant', 'birth-details'])
        .default('kundli')
        .describe('Chart type. kundli=full chart with houses+planets (default). birth-chart=basic positions. planetary-positions=all planets. house-cusps=12 house boundaries. ascendant=lagna only. birth-details=processed birth data.'),
      ...BirthDetailsSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['kundli'];
      const result = await client.post(path, extractBirthDetails(args));
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
