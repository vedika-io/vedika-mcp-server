import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool, SafeToolInputError } from '../tool-wrapper.js';

const LOCAL_BAZI_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;

export function registerChineseBaziTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_chinese_bazi',
    'Calculate the current basic Ba Zi (Four Pillars) chart from a timezone-free birth datetime. Returns Year, Month, Day, and Hour pillars, Day Master, dominant element, and element balance. This route does not provide Da Yun, annual luck pillars, or favorable/unfavorable elements. Timezone-bearing input is temporarily rejected while accepted civil, zoned, or solar-time semantics remain unresolved. Consult current Vedika API pricing before use.',
    {
      datetime: z.string().regex(LOCAL_BAZI_DATETIME)
        .describe('Birth date and time without Z or UTC offset, e.g. "1990-06-15T14:30:00".'),
    },
    async (args) => safeTool(async () => {
      if (!LOCAL_BAZI_DATETIME.test(args.datetime)) {
        throw new SafeToolInputError(
          'Ba Zi datetime must omit Z and UTC offsets while accepted time semantics remain unresolved, for example 1990-06-15T14:30:00.'
        );
      }
      const result = await client.post('/v2/chinese/bazi/chart', { datetime: args.datetime });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
