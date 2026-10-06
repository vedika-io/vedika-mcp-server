import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

// GET /v2/daily/bundle takes only `date` and `lang`. It returns the day's
// tarot card, angel number, crystal, mantra, moon phase, rune and I Ching. It
// has no horoscope, panchang or per-location content, so the earlier sign,
// system and location inputs were never read by the API.
export function registerDailyBundleTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_daily_bundle',
    'Get the day\'s general content in one call: tarot card, angel number, crystal, mantra, moon phase, rune and I Ching. It is not a personal or per-sign reading. For a sign horoscope use vedika_horoscope, and for panchang use vedika_panchang. Consult current Vedika API pricing before use.',
    {
      date: z.string().optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today.'),
      lang: z.string().optional()
        .describe('Response language code, e.g. en, hi. Default: en.'),
    },
    async (args) => safeTool(async () => {
      const params: Record<string, string> = {};
      if (args.date) params.date = args.date;
      if (args.lang) params.lang = args.lang;
      const result = await client.get('/v2/daily/bundle', params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
