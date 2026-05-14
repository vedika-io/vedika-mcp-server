import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerSpiritualDeityTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_spiritual_deity',
    'Determine the Ishta Devata (personal deity) from the birth chart. Uses the Atmakaraka (soul planet) and its Navamsa (D9) placement to identify the deity most aligned with the native per BPHS Ch.33. Also returns Dharma Devata (from 9th lord in D9), Palana Devata (sustenance deity from Amatya Karaka in D9), and Guru Devata (spiritual guide from Bhratri Karaka in D9). Each deity includes associated mantras, temples, worship day, and offerings. Cost: $0.020/call.',
    {
      ...BirthDetailsSchema.shape,
      includeRemedies: z.boolean().optional()
        .describe('Include recommended worship practices, fasting days, and donation suggestions. Default: true.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.includeRemedies !== undefined) body.includeRemedies = args.includeRemedies;
      const result = await client.post('/v2/spiritual/deity/ishta', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
