import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerHumanDesignTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_human_design_chart',
    'Generate a Human Design BodyGraph chart from birth details. Human Design synthesizes the I Ching, Kabbalah Tree of Life, Hindu-Brahmin chakra system, and quantum physics. Returns your Type (Generator, Manifestor, Projector, Reflector, Manifesting Generator), Strategy, Authority (Emotional, Sacral, Splenic, etc.), Profile (e.g., 1/3, 4/6), defined/undefined Centers (9 centers), Channels, and Gates. The BodyGraph is calculated from precise birth time using planetary positions at birth and 88 degrees of the Sun before birth. Cost: $0.040/call.',
    {
      datetime: z.string()
        .describe('Birth date and time in ISO 8601 format, e.g. "1990-06-15T14:30:00". Exact birth time is critical for accurate gate activations.'),
      latitude: z.number().min(-90).max(90)
        .describe('Birth location latitude.'),
      longitude: z.number().min(-180).max(180)
        .describe('Birth location longitude.'),
      timezone: z.string()
        .describe('Timezone as UTC offset "+05:30" or IANA name.'),
      name: z.string().optional()
        .describe('Person name for the report.'),
    },
    async (args) => safeTool(async () => {
      const body: Record<string, unknown> = {
        datetime: args.datetime,
        latitude: args.latitude,
        longitude: args.longitude,
        timezone: args.timezone,
      };
      if (args.name) body.name = args.name;
      const result = await client.post('/v2/humandesign/chart', body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    })
  );
}
