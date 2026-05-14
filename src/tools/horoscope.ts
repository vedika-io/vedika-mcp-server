import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { SignEnum } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerHoroscopeTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_horoscope',
    'Get daily, weekly, or monthly horoscope for a zodiac sign. Available in both Vedic (sidereal Moon sign) and Western (tropical Sun sign) systems. Vedic uses traditional Parashari transit analysis. Western with advanced=true includes Swiss Ephemeris tropical positions. Accepts English (aries-pisces) and Hindi (mesha-meena) sign names. Cost: $0.048-0.092/call.',
    {
      sign: SignEnum.describe('Zodiac sign. English (aries-pisces) or Hindi (mesha-meena).'),
      period: z.enum(['daily', 'weekly', 'monthly']).optional()
        .describe('Horoscope period. Default: daily.'),
      system: z.enum(['vedic', 'western']).optional()
        .describe('vedic=sidereal Moon sign (default). western=tropical Sun sign.'),
      advanced: z.boolean().optional()
        .describe('Western only — include Swiss Ephemeris tropical positions.'),
    },
    async (args) => safeTool(async () => {
      const sign = args.sign;
      const period = args.period ?? 'daily';

      if (args.system === 'western') {
        let path = args.advanced
          ? `/v2/western/horoscope/${sign}/advanced`
          : `/v2/western/horoscope/${sign}`;
        if (period === 'weekly') path += '/weekly';
        else if (period === 'monthly') path += '/monthly';
        const result = await client.get(path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      let path = `/v2/astrology/horoscope/${sign}`;
      if (period === 'weekly') path += '/weekly';
      else if (period === 'monthly') path += '/monthly';

      const result = await client.get(path);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
