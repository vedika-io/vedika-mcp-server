import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'chart': '/v2/western/solar-return',
  'positions': '/v2/western/solar-return-positions',
  'aspects': '/v2/western/solar-return-aspects',
};

export function registerWesternSolarReturnTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_western_solar_return',
    'Western solar return chart — cast for the exact moment the transiting Sun returns to its natal position each year (your "solar birthday"). Reveals themes for the coming year. "chart" returns full solar return chart. "positions" returns planets at solar return moment. "aspects" returns solar return chart aspects. Tropical zodiac. Cost: $0.120/call.',
    {
      type: z.enum(['chart', 'positions', 'aspects'])
        .default('chart')
        .describe('chart=full solar return chart (default). positions=planet positions. aspects=chart aspects.'),
      ...BirthDetailsSchema.omit({ ayanamsa: true }).shape,
      year: z.number().min(1900).max(2100).optional()
        .describe('Solar return year. Defaults to current year.'),
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['chart'];
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.year) body.year = args.year;
      const result = await client.post(path, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
