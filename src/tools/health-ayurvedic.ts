import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

export function registerHealthAyurvedicTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_health_ayurvedic',
    'Ayurvedic constitution (Prakriti) analysis derived from birth chart. Maps planetary positions to the three doshas: Vata (air+ether, governed by Saturn and Rahu), Pitta (fire+water, governed by Sun and Mars), and Kapha (earth+water, governed by Moon and Jupiter). Returns dominant dosha, sub-dosha balance, vulnerable body areas based on 6th/8th house lords, recommended diet type, lifestyle adjustments, favorable seasons, and Ayurvedic herbs aligned with the chart. Based on Brihat Samhita and Charaka Samhita cross-references. Cost: $0.024/call.',
    {
      ...BirthDetailsSchema.shape,
      includeRemedies: z.boolean().optional()
        .describe('Include dietary and lifestyle recommendations. Default: true.'),
      includeSeasonal: z.boolean().optional()
        .describe('Include seasonal (Ritucharya) recommendations. Default: false.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.includeRemedies !== undefined) body.includeRemedies = args.includeRemedies;
      if (args.includeSeasonal !== undefined) body.includeSeasonal = args.includeSeasonal;
      const result = await client.post('/v2/health/ayurvedic/prakriti', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
