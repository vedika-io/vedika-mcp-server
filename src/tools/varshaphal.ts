import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerVarshaphalTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_varshaphal',
    'Vedic annual horoscope (Varshaphal / Tajaka Solar Return). Cast for the exact moment the Sun returns to its natal sidereal position each year. Uses Tajaka system with Sahams (sensitive points), Muntha (progressed ascendant), and Tajaka yogas. Different from Western Solar Return — uses sidereal zodiac. Cost: $0.006/call.',
    {
      ...BirthDetailsSchema.shape,
      year: z.number().min(1900).max(2100).optional()
        .describe('Year for the solar return. Defaults to current year.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.year) body.year = args.year;
      const result = await client.post('/v2/astrology/varshaphal', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
