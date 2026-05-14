import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'mangal': '/v2/astrology/mangal-dosha',
  'kaal-sarp': '/v2/astrology/kaal-sarp-dosha',
  'pitru': '/v2/astrology/pitru-dosha',
  'nadi': '/v2/astrology/nadi-dosha',
  'all': '/v2/astrology/all-doshas',
  'sade-sati': '/v2/astrology/sade-sati',
  'sade-sati-advanced': '/v2/astrology/sade-sati/advanced',
};

export function registerDoshasTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_doshas',
    'Detect unfavorable planetary combinations (doshas) in a birth chart. Mangal Dosha checks Mars in houses 1,2,4,7,8,12 (affects marriage — BPHS Ch. 80 vv. 47-49 / Stri Jataka). Kaal Sarp detects all planets enclosed between Rahu-Ketu axis. Sade Sati tracks Saturn 7.5-year transit over natal Moon (3 phases). Pitru checks ancestral karma. Nadi checks pulse compatibility. "all" runs Mangal+Kaal Sarp+Pitru together. Cost: $0.016-0.040/call.',
    {
      type: z.enum(['mangal', 'kaal-sarp', 'pitru', 'nadi', 'all', 'sade-sati', 'sade-sati-advanced'])
        .describe('Dosha type. mangal=Mars dosha (Manglik). kaal-sarp=Rahu-Ketu axis. pitru=ancestral. nadi=Nadi incompatibility. all=combined. sade-sati=Saturn transit. sade-sati-advanced=with BPHS remedies.'),
      ...BirthDetailsSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['mangal'];
      const result = await client.post(path, extractBirthDetails(args));
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
