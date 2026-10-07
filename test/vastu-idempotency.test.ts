import assert from 'node:assert/strict';
import test from 'node:test';
import { VedikaApiClient } from '../src/client.js';

test('batch identity survives HTTP retries and repeated logical calls', async (t) => {
  const originalEnv = { ...process.env };
  process.env['VEDIKA_API_KEY'] = 'dummy-test-key';
  delete process.env['VEDIKA_BASE_URL'];
  t.after(() => { process.env = originalEnv; });
  const seen: Headers[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(new URL(url).origin, 'https://api.vedika.io');
    seen.push(new Headers(options.headers));
    return new Response('{}', { status: seen.length === 1 ? 503 : 200 });
  });
  const client = new VedikaApiClient();
  const post = client.post.bind(client) as (path: string, body: Record<string, unknown>, timeout: number, key?: string) => Promise<unknown>;
  for (const path of ['/v2/vastu/assessments/batch', '/v2/astrology/vastu/assessments/batch']) {
    for (const key of [undefined, '', ' ', 'x'.repeat(201), 'bad\nkey']) {
      await assert.rejects(post(path, {}, 30000, key), /Idempotency-Key/);
    }
  }
  assert.equal(seen.length, 0, 'invalid keys must fail before HTTP');
  for (const key of ['batch-one', 'batch-one', 'batch-two']) {
    await post('/v2/astrology/vastu/assessments/batch', { items: [] }, 30000, key);
  }
  assert.equal(seen.length, 4);
  assert.deepEqual(seen.map(h => h.get('idempotency-key')), ['batch-one', 'batch-one', 'batch-one', 'batch-two']);
  assert.deepEqual(seen.map(h => h.get('x-request-id')), ['batch-one', 'batch-one', 'batch-one', 'batch-two']);
});
