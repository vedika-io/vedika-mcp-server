import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { WesternRelationshipSchema } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'synastry': '/v2/western/synastry',
  'synastry-aspects': '/v2/western/synastry-aspects',
  'composite': '/v2/western/composite',
  'composite-aspects': '/v2/western/composite-aspects',
};

export function registerWesternRelationshipTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_western_relationship',
    'Western relationship astrology — synastry and composite charts for two people. Synastry overlays charts to find inter-aspects (how planets interact between two people). Composite creates a midpoint chart representing the relationship itself. Uses person1/person2 (gender-neutral). Tropical zodiac. Cost: $0.148/call.',
    {
      type: z.enum(['synastry', 'synastry-aspects', 'composite', 'composite-aspects'])
        .default('synastry')
        .describe('synastry=chart overlay (default). synastry-aspects=inter-aspects with orbs. composite=midpoint chart. composite-aspects=composite chart aspects.'),
      ...WesternRelationshipSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['synastry'];
      const result = await client.post(path, { person1: args.person1, person2: args.person2 });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
