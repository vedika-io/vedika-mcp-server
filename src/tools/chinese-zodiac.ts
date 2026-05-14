import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerChineseZodiacTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_chinese_zodiac',
    'Get Chinese zodiac animal sign and element for a birth year. Returns the animal (Rat through Pig in 12-year cycle), element (Wood, Fire, Earth, Metal, Water in 60-year cycle), yin/yang polarity, lucky numbers, lucky colors, compatible animals, and incompatible animals. Accounts for Chinese New Year date (animal year starts late Jan/early Feb, not Jan 1). Cost: $0.003/call.',
    {
      year: z.number().int().min(1900).max(2100)
        .describe('Birth year (1900-2100). Chinese New Year falls in Jan/Feb — for births in Jan/Feb, the previous year animal may apply.'),
      birthDate: z.string().optional()
        .describe('Full birth date YYYY-MM-DD for accurate animal assignment in Jan/Feb births.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = { year: args.year };
      if (args.birthDate) body.birthDate = args.birthDate;
      const result = await client.post('/v2/chinese/zodiac', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
