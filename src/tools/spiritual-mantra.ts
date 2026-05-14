import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails, PlanetEnum } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerSpiritualMantraTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_spiritual_mantra',
    'Get personalized mantra recommendations based on birth chart analysis. Identifies weak or afflicted planets and recommends Vedic mantras from classical texts (Mantra Mahodadhi, BPHS remedies chapter). Returns the mantra in Sanskrit (Devanagari + IAST transliteration), the specific planet or deity it addresses, recommended repetition count (japa sankhya), best time to chant (muhurta), direction to face, and associated rosary (mala) material. Can also return mantras for specific purposes like career, health, or relationships. Cost: $0.016/call.',
    {
      ...BirthDetailsSchema.shape,
      planet: PlanetEnum.optional()
        .describe('Specific planet to get mantras for, regardless of chart weakness. E.g., saturn for Shani mantra.'),
      purpose: z.enum(['general', 'career', 'health', 'relationships', 'wealth', 'protection', 'spiritual-growth', 'education']).optional()
        .describe('Purpose for the mantra recommendation. If omitted, derives from weakest chart planet.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.planet) body.planet = args.planet;
      if (args.purpose) body.purpose = args.purpose;
      const result = await client.post('/v2/spiritual/mantra/recommend', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
