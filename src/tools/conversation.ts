import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerConversationTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_conversation',
    'Manage multi-turn AI conversations. List recent active conversations (default 10, maximum 100, ordered by last activity). Pass data.nextCursor to continue, even after an empty page; stop at null. data.paginationAvailable=false means continuation is unavailable. Activity can change between calls; this is not a snapshot. Get a specific conversation with stored messages, delete one, or extend its TTL. Conversations are created automatically when you use vedika_ai_chat and persist for context continuity. Free.',
    {
      action: z.enum(['list', 'get', 'delete', 'extend'])
        .describe('list=recent active conversations (bounded result). get=one by ID with messages. delete=remove. extend=extend TTL.'),
      limit: z.number().int().min(1).max(100).optional()
        .describe('Maximum conversations per list response. Default: 10. Maximum: 100.'),
      cursor: z.string().min(1).max(2048).optional()
        .describe('For list only: pass the prior data.nextCursor unchanged.'),
      conversationId: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional()
        .describe('Required for get, delete, extend actions.'),
    },
    async (args) => safeTool(async () => {
      if ((args.limit !== undefined || args.cursor !== undefined) && args.action !== 'list') {
        return { content: [{ type: 'text' as const, text: 'limit and cursor are supported only for the list action.' }], isError: true };
      }
      switch (args.action) {
        case 'list': {
          const params: Record<string, string> = {};
          if (args.limit !== undefined) params.limit = String(args.limit);
          if (args.cursor !== undefined) params.cursor = args.cursor;
          const result = await client.get('/api/v1/conversations', Object.keys(params).length ? params : undefined);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        }
        case 'get': {
          if (!args.conversationId) {
            return { content: [{ type: 'text' as const, text: 'conversationId is required for "get" action.' }], isError: true };
          }
          const result = await client.get(`/api/v1/conversations/${args.conversationId}`);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        }
        case 'delete': {
          if (!args.conversationId) {
            return { content: [{ type: 'text' as const, text: 'conversationId is required for "delete" action.' }], isError: true };
          }
          const result = await client.delete(`/api/v1/conversations/${args.conversationId}`);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        }
        case 'extend': {
          if (!args.conversationId) {
            return { content: [{ type: 'text' as const, text: 'conversationId is required for "extend" action.' }], isError: true };
          }
          const result = await client.post(`/api/v1/conversations/${args.conversationId}/extend`, {});
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        }
      }
    })
  );
}
