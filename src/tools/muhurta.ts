import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { LocationSchema, extractLocationParams } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'choghadiya': '/v2/astrology/choghadiya',
  'hora': '/v2/astrology/hora',
  'rahu-kaal': '/v2/astrology/rahu-kaal',
  'gulika-kaal': '/v2/astrology/gulika-kaal',
  'yamaghanta': '/v2/astrology/yamaghanta',
  'abhijit': '/v2/astrology/abhijit-muhurta',
  'brahma': '/v2/astrology/brahma-muhurta',
  'durmuhurta': '/v2/astrology/durmuhurta',
  'combined': '/v2/astrology/muhurta',
  'auspicious': '/v2/astrology/shubh-muhurta',
};

export function registerMuhurtaTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_muhurta',
    'Calculate auspicious and inauspicious time periods for today or a specific date. Choghadiya divides the day into ~90-minute slots. Hora assigns planetary rulers to each hour. Rahu Kaal, Gulika Kaal, Yamaghanta are inauspicious periods to avoid. Abhijit Muhurta is the most auspicious midday window. Brahma Muhurta is the pre-dawn spiritual window. "combined" returns choghadiya+hora+rahu-kaal. "auspicious" returns only good periods. Location defaults to Delhi. Cost: $0.012-0.020/call.',
    {
      type: z.enum(['choghadiya', 'hora', 'rahu-kaal', 'gulika-kaal', 'yamaghanta', 'abhijit', 'brahma', 'durmuhurta', 'combined', 'auspicious'])
        .describe('Muhurta type. See tool description for what each returns.'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.'),
      ...LocationSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['choghadiya'];

      if (args.type === 'combined' || args.type === 'auspicious') {
        const body: Record<string, unknown> = {
          latitude: args.latitude ?? 28.6139,
          longitude: args.longitude ?? 77.2090,
          timezone: args.timezone ?? '+05:30',
        };
        if (args.date) body.datetime = `${args.date}T12:00:00`;
        const result = await client.post(path, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      const params = extractLocationParams(args);
      if (args.date) params.date = args.date;
      const result = await client.get(path, params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
