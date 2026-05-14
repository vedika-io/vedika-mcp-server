import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'chart': '/v2/western/progressions',
  'positions': '/v2/western/progression-positions',
  'aspects': '/v2/western/progression-aspects',
};

export function registerWesternProgressionsTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_western_progressions',
    'Western secondary progressions — "a day for a year" technique. Shows how natal chart evolves over time. Progressed Moon moves ~1 degree/month (changes sign every 2.5 years). Progressed Sun moves ~1 degree/year. "chart" returns full progressed chart. "positions" returns progressed planets. "aspects" returns progressed-to-natal aspects. Tropical zodiac. Cost: $0.092/call.',
    {
      type: z.enum(['chart', 'positions', 'aspects'])
        .default('chart')
        .describe('chart=full progressed chart (default). positions=progressed planets. aspects=progressed-to-natal aspects.'),
      ...BirthDetailsSchema.omit({ ayanamsa: true }).shape,
      progressionDate: z.string().optional()
        .describe('Date to progress to (ISO 8601). Defaults to now.'),
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['chart'];
      const body: Record<string, unknown> = extractBirthDetails(args);
      if (args.progressionDate) body.progressionDate = args.progressionDate;
      const result = await client.post(path, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
