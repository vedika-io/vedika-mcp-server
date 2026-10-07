import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { resolveVedikaBaseUrl, VedikaApiClient } from '../src/client.js';
import { VedikaApiError } from '../src/errors.js';
import { registerDailyBundleTool } from '../src/tools/daily-bundle.js';
import { registerMatrimonyMatchTool } from '../src/tools/matrimony-match.js';

type Seen = { url: string; method: string; headers: Headers };

function withClient(
  t: test.TestContext,
  respond: (n: number) => Response,
): { client: VedikaApiClient; seen: Seen[] } {
  const originalEnv = { ...process.env };
  process.env['VEDIKA_API_KEY'] = 'dummy-test-key';
  delete process.env['VEDIKA_BASE_URL'];
  t.after(() => { process.env = originalEnv; });
  const seen: Seen[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    seen.push({ url, method: String(init.method), headers: new Headers(init.headers) });
    return respond(seen.length);
  });
  return { client: new VedikaApiClient(), seen };
}

test('a plain /v2 POST sends neither x-request-id nor an idempotency key', async (t) => {
  const { client, seen } = withClient(t, () => new Response('{}', { status: 200 }));
  await client.post('/v2/astrology/kundli', { datetime: '1990-06-15T14:30:00' });
  assert.equal(seen.length, 1);
  assert.equal(seen[0]!.headers.get('x-request-id'), null);
  assert.equal(seen[0]!.headers.get('idempotency-key'), null);
  assert.equal(seen[0]!.headers.get('x-idempotency-key'), null);
  assert.equal(seen[0]!.headers.get('authorization'), 'Bearer dummy-test-key');
});

test('a billed POST without an idempotency key is never retried', async (t) => {
  const { client, seen } = withClient(t, () => new Response('{}', { status: 503 }));
  await assert.rejects(client.post('/v2/astrology/kundli', {}), VedikaApiError);
  assert.equal(seen.length, 1, 'a retry could charge twice');
});

test('a network failure on a billed POST without a key is not retried', async (t) => {
  const originalEnv = { ...process.env };
  process.env['VEDIKA_API_KEY'] = 'dummy-test-key';
  delete process.env['VEDIKA_BASE_URL'];
  t.after(() => { process.env = originalEnv; });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls += 1; throw new TypeError('fetch failed'); });
  await assert.rejects(new VedikaApiClient().post('/v2/astrology/kundli', {}), /fetch failed/);
  assert.equal(calls, 1);
});

test('a POST with a caller-supplied key is retried once with the same key', async (t) => {
  const { client, seen } = withClient(t, (n) => new Response('{}', { status: n === 1 ? 503 : 200 }));
  await client.post('/v2/astrology/vastu/properties/create', {}, undefined, 'create-1');
  assert.equal(seen.length, 2);
  assert.deepEqual(seen.map(s => s.headers.get('idempotency-key')), ['create-1', 'create-1']);
});

test('4xx responses are never retried, including 402 and 429', async (t) => {
  for (const status of [401, 402, 422, 429]) {
    const { client, seen } = withClient(t, () => new Response('{}', { status }));
    await assert.rejects(client.get('/v2/astrology/horoscope/aries'), VedikaApiError);
    assert.equal(seen.length, 1, `status ${status} must not be retried`);
  }
});

test('402 INSUFFICIENT_BALANCE surfaces required, available and deficit', () => {
  const err = new VedikaApiError(402, {
    success: false,
    code: 'INSUFFICIENT_BALANCE',
    wallet: { required: 0.016, available: 0.005, deficit: 0.011 },
    purchaseUrl: 'https://evil.example/pay',
  });
  assert.match(err.message, /required \$0\.016/);
  assert.match(err.message, /available \$0\.005/);
  assert.match(err.message, /deficit \$0\.011/);
  assert.match(err.message, /Do not retry/);
  assert.doesNotMatch(err.message, /evil\.example/);
  for (const code of ['INSUFFICIENT_BALANCE_PRECHECK', 'INSUFFICIENT_BALANCE_RESERVATION']) {
    assert.match(new VedikaApiError(402, { code, wallet: { required: 1, available: 0, deficit: 1 } }).message, /deficit \$1\b/);
  }
  assert.doesNotMatch(
    new VedikaApiError(402, { code: 'INSUFFICIENT_BALANCE', wallet: { required: 'x', available: NaN, deficit: -1 } }).message,
    /\$|NaN/,
  );
});

test('429 is classified by the body code, not by headers', () => {
  const daily = new VedikaApiError(429, { code: 'DAILY_LIMIT_EXCEEDED', retryAfter: 3600 });
  assert.match(daily.message, /Daily call limit reached/);
  assert.match(daily.message, /Do not retry/);
  assert.doesNotMatch(daily.message, /Retry after/);
  const perMinute = new VedikaApiError(429, { code: 'RATE_LIMIT_EXCEEDED', retryAfter: 7 });
  assert.match(perMinute.message, /Retry after 7s/);
  assert.doesNotMatch(perMinute.message, /Daily/);
});

test('422 IDEMPOTENCY_NOT_SUPPORTED explains that no charge was attempted', () => {
  const err = new VedikaApiError(422, { code: 'IDEMPOTENCY_NOT_SUPPORTED', message: 'vk_live_secret' });
  assert.match(err.message, /does not accept an idempotency key/);
  assert.match(err.message, /No charge was attempted/);
  assert.doesNotMatch(err.message, /vk_live_secret/);
  assert.match(new VedikaApiError(422, { code: 'OTHER' }).message, /Invalid request/);
});

test('the sandbox base URL is accepted and requests keep the canonical origin', async (t) => {
  assert.equal(resolveVedikaBaseUrl('https://api.vedika.io/sandbox'), 'https://api.vedika.io/sandbox');
  assert.equal(resolveVedikaBaseUrl('https://api.vedika.io/sandbox/'), 'https://api.vedika.io/sandbox');
  for (const bad of ['https://api.vedika.io/sandbox/v2', 'https://api.vedika.io/sandboxx', 'https://evil.example/sandbox', 'http://api.vedika.io/sandbox']) {
    assert.throws(() => resolveVedikaBaseUrl(bad), /VEDIKA_BASE_URL must be exactly/, bad);
  }
  const originalEnv = { ...process.env };
  process.env['VEDIKA_API_KEY'] = 'dummy-test-key';
  process.env['VEDIKA_BASE_URL'] = 'https://api.vedika.io/sandbox';
  t.after(() => { process.env = originalEnv; });
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => { urls.push(url); return new Response('{}'); });
  await new VedikaApiClient().post('/v2/astrology/kundli', {});
  assert.deepEqual(urls, ['https://api.vedika.io/sandbox/v2/astrology/kundli']);
});

function capture(register: (s: McpServer, c: VedikaApiClient) => void) {
  let handler!: (a: Record<string, unknown>) => Promise<unknown>;
  const calls: Array<{ method: string; path: string; payload?: unknown }> = [];
  register(
    { tool: (...a: unknown[]) => { handler = a.at(-1) as typeof handler; } } as unknown as McpServer,
    {
      get: async (path: string, params?: unknown) => { calls.push({ method: 'GET', path, payload: params }); return {}; },
      post: async (path: string, body: unknown) => { calls.push({ method: 'POST', path, payload: body }); return {}; },
    } as unknown as VedikaApiClient,
  );
  return { invoke: handler, calls };
}

const person = (gender: 'male' | 'female') => ({
  datetime: '1990-06-15T14:30:00', latitude: 28.61, longitude: 77.2, timezone: '+05:30', gender,
});

test('matrimony match uses the live matrimony routes with male and female', async () => {
  const tool = capture(registerMatrimonyMatchTool);
  await tool.invoke({ bride: person('female'), groom: person('male') });
  await tool.invoke({ bride: person('female'), groom: person('male'), southIndian: true });
  assert.deepEqual(tool.calls.map(c => c.path), ['/v2/matrimony/unified-match', '/v2/matrimony/south-match']);
  for (const call of tool.calls) {
    assert.deepEqual(call.payload, { male: person('male'), female: person('female') });
  }
});

test('daily bundle sends only the date and lang the API reads', async () => {
  const tool = capture(registerDailyBundleTool);
  await tool.invoke({ date: '2026-10-06', lang: 'hi' });
  await tool.invoke({});
  assert.deepEqual(tool.calls, [
    { method: 'GET', path: '/v2/daily/bundle', payload: { date: '2026-10-06', lang: 'hi' } },
    { method: 'GET', path: '/v2/daily/bundle', payload: {} },
  ]);
});
