import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails, PlanetEnum } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerLalkitabRemediesTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_lalkitab_remedies',
    'Get Lal Kitab remedies for afflicted planets based on their house placement. Lal Kitab (Red Book) is a 20th-century Urdu text offering unique remedies distinct from classical BPHS — simple, actionable totkas (remedies) involving donations, wearing specific items, keeping objects at home, or performing actions on specific days. Returns planet-by-planet analysis with house placement, whether the planet is exalted/debilitated in Lal Kitab terms (different from Parashari), the affliction description, and 2-3 specific remedies per afflicted planet. Cost: $0.020/call.',
    {
      ...BirthDetailsSchema.shape,
      planet: PlanetEnum.optional()
        .describe('Specific planet to get Lal Kitab remedies for. If omitted, analyzes all 9 planets and returns remedies for afflicted ones.'),
      includeDebts: z.boolean().optional()
        .describe('Include Lal Kitab debt (rina) analysis — ancestral, self-created, and carried debts based on house combinations. Default: false.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.planet) body.planet = args.planet;
      if (args.includeDebts !== undefined) body.includeDebts = args.includeDebts;
      const result = await client.post('/v2/astrology/lalkitab/remedies', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
