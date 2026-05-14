import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerNumerologyCompleteTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_numerology_complete',
    'Full numerology report combining all core numbers in a single call. Returns Life Path number (from birth date), Destiny/Expression number (from full name), Soul Urge/Heart Desire number (from vowels), Personality number (from consonants), Maturity number (Life Path + Destiny), Personal Year/Month/Day cycles, Pinnacle cycles (4 life phases), Challenge numbers, Karmic Debt numbers (13, 14, 16, 19), Karmic Lessons (missing digits in name), Hidden Passion (most frequent digit), and Lucky Day/Color. Supports both Pythagorean and Chaldean systems. Cost: $0.010/call.',
    {
      name: z.string().min(1)
        .describe('Full birth name (as on birth certificate) for letter-based calculations.'),
      birthDate: z.string()
        .describe('Birth date in YYYY-MM-DD format for date-based calculations.'),
      system: z.enum(['pythagorean', 'chaldean']).optional()
        .describe('Numerology system. pythagorean=modern Western (default). chaldean=ancient Babylonian (different letter-number mapping).'),
      currentName: z.string().optional()
        .describe('Current/married name if different from birth name. Used for current vibration analysis alongside birth name core numbers.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = {
        name: args.name,
        birthDate: args.birthDate,
      };
      if (args.system) body.system = args.system;
      if (args.currentName) body.currentName = args.currentName;
      const result = await client.post('/v2/numerology/complete', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
