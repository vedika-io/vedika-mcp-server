import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const CHART_ENDPOINTS: Record<string, string> = {
  'D2': '/v2/astrology/hora',
  'D3': '/v2/astrology/drekkana',
  'D4': '/v2/astrology/chaturthamsa',
  'D7': '/v2/astrology/saptamsa',
  'D9': '/v2/astrology/navamsa',
  'D10': '/v2/astrology/dashamsa',
  'D12': '/v2/astrology/dwadashamsa',
  'D16': '/v2/astrology/shodasamsa',
  'D20': '/v2/astrology/vimsamsa',
  'D24': '/v2/astrology/chaturvimsamsa',
  'D27': '/v2/astrology/bhamsa',
  'D30': '/v2/astrology/trimsamsa',
  'D40': '/v2/astrology/khavedamsa',
  'D45': '/v2/astrology/akshavedamsa',
  'D60': '/v2/astrology/shashtiamsa',
};

export function registerDivisionalChartsTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_divisional_charts',
    'Calculate Vedic divisional charts (Vargas). Each division reveals a specific life area: D2 Hora (wealth), D3 Drekkana (siblings), D4 Chaturthamsa (property), D7 Saptamsa (children), D9 Navamsa (marriage/dharma — most important after Rashi), D10 Dashamsa (career), D12 Dwadashamsa (parents), D16 Shodasamsa (vehicles), D20 Vimsamsa (spiritual), D24 Chaturvimsamsa (education), D27 Bhamsa (strength), D30 Trimsamsa (evils), D40 Khavedamsa (maternal), D45 Akshavedamsa (paternal), D60 Shashtiamsa (past-life karma). Swiss Ephemeris computed. Cost: $0.005/call.',
    {
      chart: z.enum(['D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'])
        .describe('Divisional chart. D9 (Navamsa) is the most important after the birth chart.'),
      ...BirthDetailsSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = CHART_ENDPOINTS[args.chart];
      const result = await client.post(path, extractBirthDetails(args));
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
