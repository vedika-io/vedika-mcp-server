import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { VedicMatchingSchema } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'guna-milan': '/v2/astrology/guna-milan',
  'kundali': '/v2/astrology/kundali-matching',
  'nakshatra-porutham': '/v2/astrology/nakshatra-porutham',
  'thirumana-porutham': '/v2/astrology/thirumana-porutham',
};

export function registerCompatibilityTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_compatibility',
    'Vedic marriage/relationship compatibility matching. Requires birth details for BOTH male and female. Guna Milan uses 36-point Ashtakoot system (North Indian) scoring 8 factors: Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi. 18+/36 is acceptable. Kundali adds Mangal Dosha cross-check. Nakshatra Porutham is 10-factor South Indian. Thirumana Porutham is Tamil marriage matching. Cost: $0.040-0.048/call.',
    {
      type: z.enum(['guna-milan', 'kundali', 'nakshatra-porutham', 'thirumana-porutham'])
        .default('guna-milan')
        .describe('Matching system. guna-milan=36 Guna Ashtakoot (default). kundali=full Kundli matching. nakshatra-porutham=10-factor South Indian. thirumana-porutham=Tamil.'),
      ...VedicMatchingSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['guna-milan'];
      const result = await client.post(path, { male: args.male, female: args.female });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
