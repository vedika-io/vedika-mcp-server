import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

const BirthDetailsInput = z.object({
  datetime: z.string().describe('Birth date+time ISO 8601, e.g. "1990-06-15T14:30:00"'),
  latitude: z.number().min(-90).max(90).describe('Birth latitude'),
  longitude: z.number().min(-180).max(180).describe('Birth longitude'),
  timezone: z.string().describe('UTC offset "+05:30" or IANA "Asia/Kolkata"'),
  name: z.string().optional().describe('Person name'),
  gender: z.enum(['male', 'female', 'other']).optional().describe('Gender'),
  location: z.string().optional().describe('Birth city/place name'),
}).optional().describe('Birth details. Required for personal questions (chart, dasha, dosha, compatibility, career, health).');

export function registerAiChatTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_ai_chat',
    'Ask Vedika AI any astrology question with optional birth details. This is the flagship endpoint — runs the full pipeline: Swiss Ephemeris chart computation, 21-yoga detection, anti-hallucination validation, AI interpretation (30 languages). Supports Vedic (sidereal, nakshatras, dashas, yogas), Western (tropical, transits, progressions), and KP (sub-lord, significator) systems. Multi-turn conversations via conversationId. Can take 5-90 seconds depending on query complexity. Cost: token-based, typically $0.008-0.05/query.',
    {
      question: z.string().min(1).max(5000)
        .describe('Your astrology question in natural language. Can be in any of 30 supported languages.'),
      birthDetails: BirthDetailsInput,
      partnerBirthDetails: BirthDetailsInput
        .describe('Partner/second person birth details for compatibility questions.'),
      system: z.enum(['vedic', 'western', 'kp']).optional()
        .describe('Astrology system. vedic=sidereal with nakshatras/dashas/yogas (default). western=tropical with transits/aspects. kp=Krishnamurti sub-lord analysis.'),
      language: z.string().optional()
        .describe('Response language code: en, hi, ta, te, kn, ml, mr, gu, bn, pa, od, etc. (30 languages). Default: en.'),
      conversationId: z.string().optional()
        .describe('ID from a previous response to continue a multi-turn conversation with context.'),
      speed: z.enum(['standard', 'fast']).optional()
        .describe('standard=best quality (default). fast=quicker but costs more, uses smaller model.'),
      includeRemedies: z.boolean().optional()
        .describe('Include BPHS-based remedies (gemstone, mantra, donation) for weak planets.'),
      category: z.enum(['kundali', 'dasha', 'transit', 'dosha', 'remedies', 'compatibility', 'career', 'health', 'general']).optional()
        .describe('Query category hint for better routing. Auto-detected if omitted.'),
      responseFormat: z.enum(['text', 'json', 'markdown']).optional()
        .describe('Response format. Default: text.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = { question: args.question };
      if (args.birthDetails) body.birthDetails = args.birthDetails;
      if (args.partnerBirthDetails) body.partnerBirthDetails = args.partnerBirthDetails;
      if (args.system) body.system = args.system;
      if (args.language) body.language = args.language;
      if (args.conversationId) body.conversationId = args.conversationId;
      if (args.speed) body.speed = args.speed;
      if (args.includeRemedies !== undefined) body.includeRemedies = args.includeRemedies;
      if (args.category) body.category = args.category;
      if (args.responseFormat) body.responseFormat = args.responseFormat;

      const result = await client.post('/api/v1/astrology/query', body, 90_000);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
