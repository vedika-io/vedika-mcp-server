import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'ritu': '/v2/astrology/ritu',
  'solstice': '/v2/astrology/solstice',
  'anandadi-yoga': '/v2/astrology/anandadi-yoga',
  'auspicious-yoga': '/v2/astrology/auspicious-yoga',
  'auspicious-period': '/v2/astrology/auspicious-period',
  'inauspicious-period': '/v2/astrology/inauspicious-period',
  'gowri-nalla-neram': '/v2/astrology/gowri-nalla-neram',
  'disha-shool': '/v2/astrology/disha-shool',
  'planet-transit': '/v2/astrology/planet-transit',
  'chandrashtama': '/v2/astrology/chandrashtama',
  'chandrashtama-periods': '/v2/astrology/chandrashtama-periods',
};

export function registerCalendarTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_calendar',
    'Vedic calendar calculations and timing. Ritu = Hindu 6-season system. Solstice = equinox/solstice dates. Anandadi Yoga = 27 yogas from tithi+weekday. Auspicious/Inauspicious Yoga = daily favorable combos. Auspicious/Inauspicious Period = time windows for activities. Gowri Nalla Neram = South Indian Choghadiya. Disha Shool = inauspicious directions per weekday. Planet Transit = current transit positions. Chandrashtama = Moon in 8th from natal Moon (avoid important work). Cost: $0.016-0.020/call.',
    {
      type: z.enum(['ritu', 'solstice', 'anandadi-yoga', 'auspicious-yoga', 'auspicious-period', 'inauspicious-period', 'gowri-nalla-neram', 'disha-shool', 'planet-transit', 'chandrashtama', 'chandrashtama-periods'])
        .describe('Calendar calculation type. See tool description for details.'),
      ...BirthDetailsSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['ritu'];
      const result = await client.post(path, extractBirthDetails(args));
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
