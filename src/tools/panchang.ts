import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { LocationSchema, extractLocationParams } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerPanchangTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_panchang',
    'Hindu calendar (Panchang) for today or a specific date/time. Returns the 5 limbs: Tithi (lunar day), Nakshatra (lunar mansion), Yoga (luni-solar combination), Karana (half-tithi), and Vara (weekday). Also includes sunrise/sunset/moonrise times. Location defaults to Delhi if not specified. Cost: $0.012/call.',
    {
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
      time: z.string().optional().describe('Time in HH:MM format (24h). Defaults to 12:00 (noon). Useful for eclipse timings or specific muhurta.'),
      element: z.enum(['full', 'tithi', 'nakshatra', 'yoga', 'karana']).optional()
        .describe('Get full panchang (default) or a single element.'),
      ...LocationSchema.shape,
    },
    async (args) => safeTool(async () => {
      if (args.element && args.element !== 'full') {
        const timeStr = args.time || '12:00';
        const result = await client.post(`/v2/astrology/${args.element}`, {
          datetime: args.date ? `${args.date}T${timeStr}:00` : new Date().toISOString(),
          latitude: args.latitude ?? 28.6139,
          longitude: args.longitude ?? 77.2090,
          timezone: args.timezone ?? '+05:30',
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      const params = extractLocationParams(args);
      const path = args.date ? `/v2/astrology/panchang/${args.date}` : '/v2/astrology/panchang/today';
      const result = await client.get(path, params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
