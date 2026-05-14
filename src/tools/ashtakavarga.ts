import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerAshtakavargaTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_ashtakavarga',
    'Calculate Ashtakavarga — the 8-fold division system scoring each planet strength across 12 signs (0-8 points per sign). "planet" returns Bhinnashtakavarga (individual planet table). "sarva" returns Sarvashtakavarga (combined all 7 planets per sign, max 337 total). Signs scoring 28+ in SAV are strong for transits. Used for timing events. Cost: $0.025/call.',
    {
      type: z.enum(['planet', 'sarva'])
        .describe('planet=individual planet table (requires planet param). sarva=combined all-planets table.'),
      planet: z.enum(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']).optional()
        .describe('Required when type=planet. Which planet to calculate for.'),
      ...BirthDetailsSchema.shape,
    },
    async (args) => safeTool(async () => {
      if (args.type === 'sarva') {
        const result = await client.post('/v2/astrology/sarvashtakavarga', extractBirthDetails(args));
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }
      if (!args.planet) {
        return {
          content: [{ type: 'text' as const, text: '"planet" parameter is required when type=planet. Choose: sun, moon, mars, mercury, jupiter, venus, saturn.' }],
          isError: true,
        };
      }
      const body = { ...extractBirthDetails(args), planet: args.planet };
      const result = await client.post('/v2/astrology/ashtakavarga', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
