import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerChineseBaziTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_chinese_bazi',
    'Calculate Ba Zi (Four Pillars of Destiny) chart from birth details. Returns the Year, Month, Day, and Hour pillars — each with a Heavenly Stem and Earthly Branch. Includes the Day Master element, 10-year Luck Pillars (Da Yun), annual Luck Pillar, Five Element balance analysis, and favorable/unfavorable elements. Ba Zi is the foundation of Chinese astrology, analogous to a birth chart in Western/Vedic systems. Cost: $0.028/call.',
    {
      datetime: z.string()
        .describe('Birth date and time in ISO 8601 format, e.g. "1990-06-15T14:30:00". Hour of birth is critical for the Hour Pillar.'),
      timezone: z.string()
        .describe('Timezone as UTC offset "+08:00" or IANA name "Asia/Shanghai". Important for accurate Hour Pillar.'),
      gender: z.enum(['male', 'female'])
        .describe('Gender determines Luck Pillar direction (forward or backward through stems/branches).'),
      name: z.string().optional()
        .describe('Person name for the report.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = {
        datetime: args.datetime,
        timezone: args.timezone,
        gender: args.gender,
      };
      if (args.name) body.name = args.name;
      const result = await client.post('/v2/chinese/bazi', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
