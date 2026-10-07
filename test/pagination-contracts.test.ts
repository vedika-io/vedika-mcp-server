import assert from 'node:assert/strict';
import test from 'node:test';
import { z, type ZodRawShape } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { VedikaApiClient } from '../src/client.js';
import { registerConversationTool } from '../src/tools/conversation.js';
import { registerUsageTool } from '../src/tools/usage.js';

type Result = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
function capture(register: (server: McpServer, client: VedikaApiClient) => void) {
  let description = '';
  let shape: ZodRawShape = {};
  let handler: (args: Record<string, unknown>) => Promise<Result>;
  const calls: Array<{ path: string; params?: Record<string, string> }> = [];
  const response = { success: true, data: [], count: 0, truncated: true, scanLimit: 1000 };
  const server = { tool: (...args: unknown[]) => {
    description = args[1] as string;
    shape = args[2] as ZodRawShape;
    handler = args[3] as typeof handler;
  } } as unknown as McpServer;
  const client = { get: async (path: string, params?: Record<string, string>) => {
    calls.push({ path, params });
    return response;
  } } as unknown as VedikaApiClient;
  register(server, client);
  return { description, shape, calls, response, invoke: async (args: Record<string, unknown>) => handler(z.object(shape).parse(args)) };
}

test('conversation lists expose bounded limits and continuation', async () => {
  const tool = capture(registerConversationTool);
  assert.ok(tool.shape.limit);
  assert.equal(tool.shape.page, undefined);
  assert.match(tool.description, /recent/i);
  assert.doesNotMatch(tool.description, /all conversations/i);
  assert.ok(tool.shape.cursor);
  assert.match(tool.description, /nextCursor/);
  await tool.invoke({ action: 'list' });
  const result = await tool.invoke({ action: 'list', limit: 100, cursor: 'c1.1122' });
  assert.deepEqual(tool.calls, [
    { path: '/api/v1/conversations', params: undefined },
    { path: '/api/v1/conversations', params: { limit: '100', cursor: 'c1.1122' } },
  ]);
  assert.deepEqual(JSON.parse(result.content[0]!.text), tool.response);
});

test('conversation limits reject invalid inputs and unrelated actions', async () => {
  const tool = capture(registerConversationTool);
  for (const limit of [0, 101, 1.5, '10']) {
    await assert.rejects(tool.invoke({ action: 'list', limit }));
  }
  const result = await tool.invoke({ action: 'get', conversationId: 'conv_1', limit: 10 });
  assert.equal(result.isError, true);
  assert.match(result.content[0]!.text, /limit.*list/);
  assert.deepEqual(tool.calls, []);
});

test('conversation cursors reject invalid input and unrelated actions', async () => {
  const tool = capture(registerConversationTool);
  for (const cursor of ['', true, 42, 'x'.repeat(2049)]) {
    await assert.rejects(tool.invoke({ action: 'list', cursor }));
  }
  const result = await tool.invoke({ action: 'get', conversationId: 'conv_1', cursor: 'c1.1122' });
  assert.equal(result.isError, true);
  assert.deepEqual(tool.calls, []);
});

test('usage advertises bounded history rather than a nonexistent page contract', async () => {
  const tool = capture(registerUsageTool);
  assert.equal(tool.shape.page, undefined);
  assert.ok(tool.shape.limit);
  assert.match(tool.description, /1000/);
  assert.match(tool.description, /no.*(page|cursor)/i);
  assert.doesNotMatch(tool.description, /usage by AI model/i);
  await tool.invoke({});
  await tool.invoke({ action: 'history' });
  const result = await tool.invoke({ action: 'history', limit: 500 });
  await tool.invoke({ action: 'summary' });
  await tool.invoke({ action: 'models' });
  assert.deepEqual(tool.calls, [
    { path: '/api/v1/usage/wallet', params: undefined },
    { path: '/api/v1/usage/history', params: undefined },
    { path: '/api/v1/usage/history', params: { limit: '500' } },
    { path: '/api/v1/usage/summary', params: undefined },
    { path: '/api/v1/usage/models', params: undefined },
  ]);
  assert.deepEqual(JSON.parse(result.content[0]!.text), tool.response);
});

test('usage limits reject invalid inputs and non-history actions', async () => {
  const tool = capture(registerUsageTool);
  for (const limit of [0, 501, 1.5, '50']) {
    await assert.rejects(tool.invoke({ action: 'history', limit }));
  }
  for (const action of ['wallet', 'summary', 'models']) {
    const result = await tool.invoke({ action, limit: 10 });
    assert.equal(result.isError, true);
    assert.match(result.content[0]!.text, /limit.*history/);
  }
  assert.deepEqual(tool.calls, []);
});
