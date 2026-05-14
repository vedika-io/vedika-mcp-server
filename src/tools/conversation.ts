import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../client.js';
import { safeTool } from '../tool-wrapper.js';

export function registerConversationTool(server: McpServer, client: VedikaApiClient): void {
  server.tool(
    'vedika_conversation',
    'Manage multi-turn AI conversations. List all conversations, get a specific one with full message history, delete one, or extend its TTL. Conversations are created automatically when you use vedika_ai_chat and persist for context continuity. Free.',
    {
      action: z.enum(['list', 'get', 'delete', 'extend'])
        .describe('list=all conversations. get=one by ID with messages. delete=remove. extend=extend TTL.'),
      conversationId: z.string().optional()
        .describe('Required for get, delete, extend actions.'),
    },
    async (args) => safeTool(async () => {
      switch (args.action) {
        case 'list': {
          const result = await client.get('/api/v1/conversations');
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
