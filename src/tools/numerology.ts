import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { NumerologyPersonSchema } from '../schemas.js';
import { safeTool } from '../tool-wrapper.js';

const ENDPOINTS: Record<string, string> = {
  'life-path': '/v2/astrology/numerology/life-path',
  'destiny': '/v2/astrology/numerology/destiny',
  'personality': '/v2/astrology/numerology/personality',
  'soul-urge': '/v2/astrology/numerology/soul-urge',
  'personal-year': '/v2/astrology/numerology/personal-year',
  'complete': '/v2/astrology/numerology/complete',
  'compatibility': '/v2/astrology/numerology/compatibility',
};

export function registerNumerologyTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_numerology',
    'Numerology calculations using Pythagorean or Chaldean systems. Life Path (birth date) = life purpose. Destiny/Expression (full name) = talents. Personality (consonants) = how others see you. Soul Urge (vowels) = inner desires. Personal Year = current year theme. Complete = all core numbers + pinnacle cycles. Compatibility = two-person comparison. Cost: $0.003-0.010/call.',
    {
      type: z.enum(['life-path', 'destiny', 'personality', 'soul-urge', 'personal-year', 'complete', 'compatibility'])
        .describe('Calculation type.'),
      name: z.string().optional().describe('Full name. Required for destiny, personality, soul-urge, complete.'),
      birthDate: z.string().optional().describe('Birth date YYYY-MM-DD. Required for life-path, personal-year, complete.'),
      system: z.enum(['pythagorean', 'chaldean']).optional().describe('Numerology system. Default: pythagorean.'),
      year: z.number().optional().describe('For personal-year only — which year. Defaults to current.'),
      person1: NumerologyPersonSchema.optional().describe('First person for compatibility.'),
      person2: NumerologyPersonSchema.optional().describe('Second person for compatibility.'),
    },
    async (args) => safeTool(async () => {
      const path = ENDPOINTS[args.type] ?? ENDPOINTS['complete'];
      const body: Record<string, unknown> = {};
      if (args.type === 'compatibility') {
        if (!args.person1 || !args.person2) {
          return { content: [{ type: 'text' as const, text: 'person1 and person2 required for compatibility.' }], isError: true };
        }
        body.person1 = args.person1;
        body.person2 = args.person2;
      } else {
        if (args.name) body.name = args.name;
        if (args.birthDate) body.birthDate = args.birthDate;
        if (args.system) body.system = args.system;
        if (args.year) body.year = args.year;
      }
      const result = await client.post(path, body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
