import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { resolveVedikaBaseUrl, type VedikaApiClient } from '../src/client.js';
import { registerChineseBaziTool } from '../src/tools/chinese-bazi.js';
import { registerHoroscopeTool } from '../src/tools/horoscope.js';
import { MCP_SERVER_USER_AGENT, MCP_SERVER_VERSION } from '../src/version.js';

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: true;
};

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

type ApiCall = {
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
};

function captureTool(
  register: (server: McpServer, client: VedikaApiClient) => void,
): { invoke: ToolHandler; calls: ApiCall[] } {
  let handler: ToolHandler | undefined;
  const calls: ApiCall[] = [];

  const server = {
    tool: (...args: unknown[]) => {
      const candidate = args.at(-1);
      assert.equal(typeof candidate, 'function');
      handler = candidate as ToolHandler;
    },
  } as unknown as McpServer;

  const client = {
    get: async (path: string) => {
      calls.push({ method: 'GET', path });
      return { ok: true };
    },
    post: async (path: string, body: Record<string, unknown>) => {
      calls.push({ method: 'POST', path, body });
      return { ok: true };
    },
  } as unknown as VedikaApiClient;

  register(server, client);
  assert.ok(handler, 'tool registration must provide a handler');

  return {
    invoke: (args) => handler!(args),
    calls,
  };
}

test('Ba Zi uses the Rust route and sends only accepted runtime input', async () => {
  const tool = captureTool(registerChineseBaziTool);

  const result = await tool.invoke({
    datetime: '1990-06-15T14:30:00',
  });

  assert.equal(result.isError, undefined);
  assert.deepEqual(tool.calls, [{
    method: 'POST',
    path: '/v2/chinese/bazi/chart',
    body: {
      datetime: '1990-06-15T14:30:00',
    },
  }]);
});

test('Ba Zi rejects timezone-bearing input before an API call', async () => {
  const tool = captureTool(registerChineseBaziTool);
  const result = await tool.invoke({ datetime: '1990-06-15T00:30:00+08:00' });

  assert.equal(result.isError, true);
  assert.match(result.content[0]!.text, /must omit Z and UTC offsets/);
  assert.deepEqual(tool.calls, []);
});

test('Vedic horoscope keeps daily, weekly, and monthly route semantics', async () => {
  const tool = captureTool(registerHoroscopeTool);

  await tool.invoke({ sign: 'aries', system: 'vedic', period: 'daily' });
  await tool.invoke({ sign: 'aries', system: 'vedic', period: 'weekly' });
  await tool.invoke({ sign: 'aries', system: 'vedic', period: 'monthly' });

  assert.deepEqual(tool.calls, [
    { method: 'GET', path: '/v2/astrology/horoscope/aries' },
    { method: 'GET', path: '/v2/astrology/horoscope/aries/weekly' },
    { method: 'GET', path: '/v2/astrology/horoscope/aries/monthly' },
  ]);
});

test('Western daily and advanced daily use only registered Rust routes', async () => {
  const tool = captureTool(registerHoroscopeTool);

  await tool.invoke({ sign: 'leo', system: 'western', period: 'daily' });
  await tool.invoke({ sign: 'leo', system: 'western', period: 'daily', advanced: true });

  assert.deepEqual(tool.calls, [
    { method: 'GET', path: '/v2/western/horoscope/leo' },
    { method: 'GET', path: '/v2/western/horoscope/leo/advanced' },
  ]);
});

test('unsupported Western periods fail before an API call', async () => {
  for (const period of ['weekly', 'monthly']) {
    const tool = captureTool(registerHoroscopeTool);
    const result = await tool.invoke({ sign: 'leo', system: 'western', period });

    assert.equal(result.isError, true);
    assert.match(result.content[0]!.text, /Western horoscope currently supports daily only/);
    assert.deepEqual(tool.calls, []);
  }
});

test('package, lock root, and shared runtime metadata use one release value', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  const packageLock = JSON.parse(
    readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
  ) as { version: string; packages: { '': { version: string } } };

  assert.equal(MCP_SERVER_VERSION, '2.0.6');
  assert.equal(packageJson.version, MCP_SERVER_VERSION);
  assert.equal(packageLock.version, MCP_SERVER_VERSION);
  assert.equal(packageLock.packages[''].version, MCP_SERVER_VERSION);
  assert.equal(MCP_SERVER_USER_AGENT, `vedika-mcp-server/${MCP_SERVER_VERSION}`);
});

test('credential routing accepts only the canonical HTTPS API origin', () => {
  assert.equal(resolveVedikaBaseUrl(undefined), 'https://api.vedika.io');
  assert.equal(resolveVedikaBaseUrl('https://api.vedika.io/'), 'https://api.vedika.io');

  for (const unsafeUrl of [
    'http://api.vedika.io',
    'https://api.vedika.io.evil.example',
    'https://api.vedika.io/v2',
    'https://user:password@api.vedika.io',
  ]) {
    assert.throws(
      () => resolveVedikaBaseUrl(unsafeUrl),
      /VEDIKA_BASE_URL must be exactly https:\/\/api\.vedika\.io/,
    );
  }
});

test('credential-bearing requests never follow redirects', async () => {
  const previousApiKey = process.env['VEDIKA_API_KEY'];
  const previousBaseUrl = process.env['VEDIKA_BASE_URL'];
  const previousFetch = globalThis.fetch;
  let observedRedirect: RequestRedirect | undefined;

  process.env['VEDIKA_API_KEY'] = 'vk_test_route_contract';
  delete process.env['VEDIKA_BASE_URL'];
  globalThis.fetch = async (_input, init) => {
    observedRedirect = init?.redirect;
    return new Response(JSON.stringify({ message: 'redirect blocked' }), {
      status: 302,
      headers: { Location: 'https://untrusted.example/collect' },
    });
  };

  try {
    const client = new (await import('../src/client.js')).VedikaApiClient();
    await assert.rejects(
      () => client.get('/v2/astrology/horoscope/aries'),
      /Vedika API error \(302\)/,
    );
    assert.equal(observedRedirect, 'manual');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env['VEDIKA_API_KEY'];
    else process.env['VEDIKA_API_KEY'] = previousApiKey;
    if (previousBaseUrl === undefined) delete process.env['VEDIKA_BASE_URL'];
    else process.env['VEDIKA_BASE_URL'] = previousBaseUrl;
  }
});

test('a GET retry sends no request ID that /v2 would read as an idempotency claim', async () => {
  const previousApiKey = process.env['VEDIKA_API_KEY'];
  const previousBaseUrl = process.env['VEDIKA_BASE_URL'];
  const previousFetch = globalThis.fetch;
  const requestIds: Array<string | undefined> = [];

  process.env['VEDIKA_API_KEY'] = 'vk_test_retry_contract';
  delete process.env['VEDIKA_BASE_URL'];
  globalThis.fetch = async (_input, init) => {
    const headers = init?.headers as Record<string, string>;
    requestIds.push(headers['x-request-id']);
    const status = requestIds.length === 1 ? 500 : 200;
    return new Response(JSON.stringify({ ok: status === 200 }), { status });
  };

  try {
    const client = new (await import('../src/client.js')).VedikaApiClient();
    await client.get('/v2/astrology/horoscope/aries');
    assert.deepEqual(requestIds, [undefined, undefined]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env['VEDIKA_API_KEY'];
    else process.env['VEDIKA_API_KEY'] = previousApiKey;
    if (previousBaseUrl === undefined) delete process.env['VEDIKA_BASE_URL'];
    else process.env['VEDIKA_BASE_URL'] = previousBaseUrl;
  }
});

test('long AI-style timeouts are not retried', async () => {
  const previousApiKey = process.env['VEDIKA_API_KEY'];
  const previousBaseUrl = process.env['VEDIKA_BASE_URL'];
  const previousFetch = globalThis.fetch;
  let calls = 0;

  process.env['VEDIKA_API_KEY'] = 'vk_test_timeout_contract';
  delete process.env['VEDIKA_BASE_URL'];
  globalThis.fetch = async () => {
    calls += 1;
    const error = new Error('aborted');
    error.name = 'AbortError';
    throw error;
  };

  try {
    const client = new (await import('../src/client.js')).VedikaApiClient();
    await assert.rejects(
      () => client.post('/v2/ai/query', {}, 90_000),
      /Request timed out after 90s/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env['VEDIKA_API_KEY'];
    else process.env['VEDIKA_API_KEY'] = previousApiKey;
    if (previousBaseUrl === undefined) delete process.env['VEDIKA_BASE_URL'];
    else process.env['VEDIKA_BASE_URL'] = previousBaseUrl;
  }
});
