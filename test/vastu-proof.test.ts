import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('typed job tools require a release newer than the package without them', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const version = manifest.version.split('.').map(Number);
  assert.ok(version[0] > 2 || (version[0] === 2 && (version[1] > 0 || version[2] >= 7)),
    'Registry 2.0.6 lacks typed job tools; publish a new immutable version');
});

const proofPath = new URL('./helpers/vastu-proof.mjs', import.meta.url).href;
const { mockContract, prove } = await import(proofPath);

test('dedicated MCP proof executes five typed tools and the exact artifact resource', async () => {
  const mock = mockContract();
  const result = await prove(mock.api, { pollMs: 0 });
  assert.equal(result.artifact.content, mock.content);
  assert.equal(result.artifact.billing.chargedCents, 2);
  assert.equal(mock.calls.filter((c: {method: string}) => c.method === 'POST').length, 2);
});

test('dedicated MCP proof refuses an artifact with a different item identity', async () => {
  const mock = mockContract();
  mock.results.results[0].artifacts[0].itemId = 'other-item';
  await assert.rejects(prove(mock.api, { pollMs: 0 }));
});

test('dedicated MCP proof refuses incomplete jobs instead of accepting submit alone', async () => {
  const mock = mockContract();
  const get = mock.api.get;
  mock.api.get = async (path: string) => {
    const response = await get(path);
    if (!path.endsWith('/results')) response.data.status = 'running';
    return response;
  };
  await assert.rejects(prove(mock.api, { pollMs: 0, attempts: 1 }));
});
