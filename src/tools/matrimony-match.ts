import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { MatrimonyMatchPersonSchema } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

// Live routes: POST /v2/matrimony/unified-match (Ashtakoota + Dashakoot + all
// dosha cancellations + overall verdict) and POST /v2/matrimony/south-match
// (Porutham). Both take `male` and `female`. The earlier
// /v2/astrology/matrimony/match path does not exist and answers 404.
const UNIFIED_MATCH_PATH = '/v2/matrimony/unified-match';
const SOUTH_MATCH_PATH = '/v2/matrimony/south-match';

export function registerMatrimonyMatchTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_matrimony_match',
    'Comprehensive Kundali matching for marriage. The default report combines the 36-point Ashtakoota Guna Milan, a Dashakoot summary, dosha cancellation analysis (Mangal, Nadi, Bhakoot) and an overall compatibility verdict. Set southIndian=true for the South Indian Porutham system instead. Consult current Vedika API pricing before use.',
    {
      bride: MatrimonyMatchPersonSchema.describe('Bride birth details including gender.'),
      groom: MatrimonyMatchPersonSchema.describe('Groom birth details including gender.'),
      southIndian: z.boolean().optional()
        .describe('Use South Indian (Porutham) matching system instead of the unified North Indian (Ashtakoota) report. Default: false.'),
    },
    async (args) => safeTool(async () => {
      const path = args.southIndian ? SOUTH_MATCH_PATH : UNIFIED_MATCH_PATH;
      const result = await client.post(path, { male: args.groom, female: args.bride });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
