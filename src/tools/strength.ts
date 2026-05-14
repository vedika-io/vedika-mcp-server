import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { BirthDetailsSchema, extractBirthDetails } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'chandra-bala': '/v2/astrology/chandra-bala',
  'tara-bala': '/v2/astrology/tara-bala',
  'upagraha': '/v2/astrology/upagraha-position',
  'planet-relationship': '/v2/astrology/planet-relationship',
  'shadbala': '/v2/astrology/shadbala',
};

export function registerStrengthTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_strength',
    'Calculate planetary strength and relationships. Chandra Bala = Moon strength (8 types for muhurta timing). Tara Bala = nakshatra compatibility (9 Tara groups). Upagraha = sub-planet positions (Dhuma, Vyatipata, Parivesha, Chapa, Upaketu, Gulika, Mandi). Planet Relationship = Naisargika Maitri friendship table per BPHS. Shadbala = the 6-fold strength system (Sthana, Dig, Kala, Cheshta, Naisargika, Drik bala), normalized 0-100. Cost: $0.020/call.',
    {
      type: z.enum(['chandra-bala', 'tara-bala', 'upagraha', 'planet-relationship', 'shadbala'])
        .describe('chandra-bala=Moon strength. tara-bala=nakshatra compatibility. upagraha=sub-planets. planet-relationship=friendship table. shadbala=6-fold strength (most comprehensive).'),
      ...BirthDetailsSchema.shape,
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['shadbala'];
      const result = await client.post(path, extractBirthDetails(args));
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
