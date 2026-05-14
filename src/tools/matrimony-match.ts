import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { MatrimonyMatchPersonSchema } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerMatrimonyMatchTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_matrimony_match',
    'Comprehensive Kundali matching for marriage with dosha cancellation analysis. Goes beyond basic Guna Milan — includes Mangal Dosha detection for BOTH persons with cancellation rules (e.g., Mars in own sign, Jupiter aspect, mutual Manglik), Nadi Dosha exceptions, Bhakoot Dosha cancellation by lord friendship, and Rajju Balam analysis. Returns 36-point Guna score, individual dosha status, cancellation verdicts, overall compatibility recommendation, and suggested remedies if doshas are present but cancellable. Cost: $0.056/call.',
    {
      bride: MatrimonyMatchPersonSchema.describe('Bride birth details including gender.'),
      groom: MatrimonyMatchPersonSchema.describe('Groom birth details including gender.'),
      includeRemedies: z.boolean().optional()
        .describe('Include BPHS-based remedies for detected doshas. Default: true.'),
      southIndian: z.boolean().optional()
        .describe('Use South Indian (Porutham) matching system instead of North Indian (Ashtakoot). Default: false.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = {
        bride: args.bride,
        groom: args.groom,
      };
      if (args.includeRemedies !== undefined) body.includeRemedies = args.includeRemedies;
      if (args.southIndian !== undefined) body.southIndian = args.southIndian;
      const result = await client.post('/v2/astrology/matrimony/match', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
