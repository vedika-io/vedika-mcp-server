import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { SignEnum } from '../schemas.js';
import { safeTool, SafeToolInputError } from '../tool-wrapper.js';

export function registerHoroscopeTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_horoscope',
    'Get a daily, weekly, or monthly Vedic horoscope, or a daily Western horoscope, for a zodiac sign. Western with advanced=true uses the advanced registered route. Unsupported Western weekly/monthly requests fail before any API call. Accepts English (aries-pisces) and Hindi (mesha-meena) sign names. Consult current Vedika API pricing before use.',
    {
      sign: SignEnum.describe('Zodiac sign. English (aries-pisces) or Hindi (mesha-meena).'),
      period: z.enum(['daily', 'weekly', 'monthly']).optional()
        .describe('Horoscope period. Default: daily. Western currently supports daily only.'),
      system: z.enum(['vedic', 'western']).optional()
        .describe('vedic=sidereal Moon sign (default). western=tropical Sun sign.'),
      advanced: z.boolean().optional()
        .describe('Western only — include precision tropical positions.'),
    },
    async (args) => safeTool(async () => {
      const sign = args.sign;
      const period = args.period ?? 'daily';

      if (args.system === 'western') {
        if (period !== 'daily') {
          throw new SafeToolInputError(
            'Western horoscope currently supports daily only; use system=vedic for weekly or monthly.'
          );
        }
        const path = args.advanced
          ? `/v2/western/horoscope/${sign}/advanced`
          : `/v2/western/horoscope/${sign}`;
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
