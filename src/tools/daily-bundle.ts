import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { SignEnum, LocationSchema, extractLocationParams } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerDailyBundleTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_daily_bundle',
    'Get all daily content in a single call: daily horoscope prediction, panchang (tithi, nakshatra, yoga, karana, sunrise/sunset), tarot card of the day, lucky numbers/colors, and current planetary transits. Saves multiple API calls and cost compared to calling each endpoint separately. Returns a unified response combining all daily content. Location defaults to Delhi if not specified. Cost: $0.040/call (vs $0.096 for individual calls).',
    {
      sign: SignEnum
        .describe('Zodiac sign for horoscope. English (aries-pisces) or Hindi (mesha-meena).'),
      date: z.string().optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today.'),
      system: z.enum(['vedic', 'western']).optional()
        .describe('Horoscope system. vedic=sidereal Moon sign (default). western=tropical Sun sign.'),
      ...LocationSchema.shape,
    },
    async (args) => safeTool(async () => {
      const params = extractLocationParams(args);
      params.sign = args.sign;
      if (args.date) params.date = args.date;
      if (args.system) params.system = args.system;
      const result = await client.get('/v2/daily/bundle', params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
