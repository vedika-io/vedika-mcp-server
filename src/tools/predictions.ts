import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { SignEnum } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerPredictionsTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_predictions',
    'Get Vedic astrology predictions for a zodiac sign or from birth details. Daily, weekly, monthly, quarterly, or yearly. If rashi (zodiac sign) is provided, returns sign-based prediction. If birth datetime is provided, Moon sign is derived automatically. First call per sign per day is charged; subsequent calls same sign+day are cached (free). Accepts English (aries-pisces) and Hindi (mesha-meena) sign names. Cost: $0.020-0.088/call.',
    {
      period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
        .describe('Prediction period. daily=$0.020, weekly=$0.028, monthly=$0.040, quarterly=$0.056, yearly=$0.088.'),
      rashi: SignEnum.optional()
        .describe('Zodiac sign. English or Hindi. Either rashi OR datetime required.'),
      datetime: z.string().optional()
        .describe('Birth datetime (ISO 8601) to auto-derive Moon sign instead of rashi.'),
      latitude: z.number().min(-90).max(90).optional().describe('Birth latitude. Required with datetime.'),
      longitude: z.number().min(-180).max(180).optional().describe('Birth longitude. Required with datetime.'),
      timezone: z.string().optional().describe('Birth timezone. Required with datetime.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = {};
      if (args.rashi) {
        body.rashi = args.rashi;
      } else if (args.datetime) {
        body.birthDetails = {
          datetime: args.datetime,
          latitude: args.latitude,
          longitude: args.longitude,
          timezone: args.timezone,
        };
      }
      const result = await client.post(`/v2/astrology/prediction/${args.period}`, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
