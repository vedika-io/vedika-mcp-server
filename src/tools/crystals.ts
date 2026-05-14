import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { SignEnum, PlanetEnum } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerCrystalsTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_crystals_recommend',
    'Get crystal and gemstone recommendations based on zodiac sign, ruling planet, or specific need. Returns recommended crystals with properties, chakra association, cleansing method, and how to use them. Combines Vedic ratna-shastra (gemstone science from Garuda Purana and BPHS) with modern crystal healing correspondences. Accepts zodiac sign (Vedic or Western) or a specific planet to strengthen. Cost: $0.012/call.',
    {
      sign: SignEnum.optional()
        .describe('Zodiac sign (English or Hindi). Returns crystals for this sign.'),
      planet: PlanetEnum.optional()
        .describe('Planet to strengthen. Returns the primary and secondary gemstones per BPHS. E.g., ruby for Sun, pearl for Moon, red coral for Mars.'),
      need: z.enum(['protection', 'love', 'wealth', 'health', 'career', 'spiritual', 'stress-relief', 'creativity']).optional()
        .describe('Specific need to address with crystal recommendations.'),
    },
    async (args) => safeTool(async () => {
      if (!args.sign && !args.planet && !args.need) {
        return { content: [{ type: 'text' as const, text: 'At least one of sign, planet, or need is required.' }], isError: true };
      }
      const body: Record<string, unknown> = {};
      if (args.sign) body.sign = args.sign;
      if (args.planet) body.planet = args.planet;
      if (args.need) body.need = args.need;
      const result = await client.post('/v2/spiritual/crystals/recommend', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
