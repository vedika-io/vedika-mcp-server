#!/usr/bin/env node
/** Run the actual five typed tools over MCP against a mock or live API.
 * The live mode reads VEDIKA_PROOF_KEY. Sandbox supplies stateless previews,
 * so it cannot prove the durable submit/status/artifact lifecycle.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const pkg = process.env.VEDIKA_MCP_PACKAGE_DIR
  ? resolve(process.env.VEDIKA_MCP_PACKAGE_DIR)
  : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(pkg, 'package.json'));
const { McpServer } = await import(require.resolve('@modelcontextprotocol/sdk/server/mcp.js'));
const { Client } = await import(require.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { InMemoryTransport } = await import(require.resolve('@modelcontextprotocol/sdk/inMemory.js'));
const { registerAllTools } = await import(pathToFileURL(resolve(pkg, 'dist/tools/index.js')).href);
const { VedikaApiClient } = await import(pathToFileURL(resolve(pkg, 'dist/client.js')).href);
const names = ['vastu_job_artifact', 'vastu_job_cancel', 'vastu_job_results', 'vastu_job_status', 'vastu_job_submit'];

export function mockContract() {
  const jobId = 'vjob_' + 'a'.repeat(32);
  const content = '<html><body>Synthetic exact report artifact</body></html>';
  const status = { jobId, status: 'completed', operation: 'plan-report', itemCount: 1,
    counts: { succeeded: 1, failed: 0, pending: 0, cancelled: 0 },
    billing: { currency: 'USD', pricePerItem: 0.02, maxCharge: 0.02, charged: 0.02, basis: 'successful items' },
    cancelRequested: false, createdAt: 1, updatedAt: 2, expiresAt: 9999999999,
    resultsUrl: 'https://api.vedika.io/v2/vastu/jobs/' + jobId + '/results' };
  const artifact = { jobId, itemId: 'proof-report', artifactId: jobId + ':0', contentType: 'text/html; charset=utf-8', filename: 'vastu-report.html', content };
  const results = { jobId, jobStatus: 'completed', results: [{ id: 'proof-report', index: 0, status: 200,
    response: { success: true, data: { artifact }, billing: { chargedCents: 2 } }, artifacts: [artifact] }], nextCursor: null };
  const calls = [];
  return { calls, content, results, api: {
    post: async (path, body, timeout, identity) => {
      calls.push({ method: 'POST', path, identity });
      if (path.endsWith('/cancel')) return { success: true, data: status };
      assert.equal(path, '/v2/astrology/vastu/jobs');
      assert.equal(body.operation, 'plan-report');
      assert.ok(identity);
      return { success: true, data: { jobId, status: 'queued', itemCount: 1, maxCharge: 0.02, replayed: false } };
    },
    get: async (path) => {
      calls.push({ method: 'GET', path });
      assert.ok(path.startsWith('/v2/astrology/vastu/jobs/' + jobId));
      return { success: true, data: path.endsWith('/results') ? results : status };
    },
  } };
}

export async function prove(api, { pollMs = 2000, attempts = 80 } = {}) {
  const server = new McpServer({ name: 'vastu-proof', version: '1' });
  registerAllTools(server, api);
  const client = new Client({ name: 'vastu-proof-client', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  const call = async (name, args) => {
    const value = await client.callTool({ name, arguments: args });
    assert.ok(!value.isError, 'Typed tool failed: ' + name);
    assert.equal(value.structuredContent?.success, true, 'Missing structured tool contract');
    return value.structuredContent.data;
  };
  try {
    const tools = (await client.listTools()).tools.filter(t => t.name.startsWith('vastu_job_'));
    assert.deepEqual(tools.map(t => t.name).sort(), names);
    assert.ok(tools.every(t => t.inputSchema && t.outputSchema));
    const request = { operation: 'plan-report', items: [{ id: 'proof-report', input: {
      rooms: [{ name: 'kitchen', zone: 'SE' }, { name: 'bedroom', zone: 'SW' }], format: 'html',
    } }] };
    const submitted = await call('vastu_job_submit', { request, idempotencyKey: 'mcp-proof-' + randomUUID() });
    assert.equal(submitted.maxCharge, 0.02, 'Quote exceeds approved single report cost');
    const jobId = submitted.jobId;
    let status;
    for (let i = 0; i < attempts; i++) {
      status = await call('vastu_job_status', { jobId });
      assert.equal(status.jobId, jobId);
      if (['completed', 'partial', 'failed', 'cancelled'].includes(status.status)) break;
      await new Promise(r => setTimeout(r, pollMs));
    }
    assert.equal(status.status, 'completed');
    assert.equal(status.counts.succeeded, 1);
    assert.equal(status.billing.charged, 0.02);
    const results = await call('vastu_job_results', { jobId });
    assert.equal(results.jobId, jobId);
    const item = results.results.find(i => i.id === 'proof-report');
    assert.equal(item?.status, 200);
    const artifact = await call('vastu_job_artifact', { jobId, itemId: 'proof-report' });
    assert.equal(artifact.jobId, jobId);
    assert.equal(artifact.itemId, 'proof-report');
    assert.equal(artifact.artifactId, jobId + ':0');
    assert.equal(artifact.contentType.split(';')[0].trim().toLowerCase(), 'text/html', 'Artifact is not HTML');
    assert.ok(artifact.content.includes('<html'));
    assert.equal(artifact.content, item.artifacts[0].content, 'Artifact bytes differ from persisted output');
    assert.deepEqual(artifact.billing, item.response.billing, 'Original receipt changed');
    const read = await client.readResource({ uri: artifact.uri });
    assert.deepEqual(JSON.parse(read.contents[0].text).data, artifact, 'Resource is not exact artifact');
    const cancelled = await call('vastu_job_cancel', { jobId });
    assert.equal(cancelled.jobId, jobId);
    return { tools: names, structuredSchemas: true, jobId, artifact, chargedUsd: status.billing.charged };
  } finally {
    await client.close();
    await server.close();
  }
}

export async function sandboxProof() {
  const previews = [];
  for (const operation of ['plan-analyze', 'plan-report']) {
    const response = await fetch('https://api.vedika.io/sandbox/vastu/jobs', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'vedika-vastu-proof/1.0' },
      body: JSON.stringify({ operation, items: [{ id: 'proof-report', input: {
        rooms: [{ name: 'kitchen', zone: 'SE' }, { name: 'bedroom', zone: 'SW' }], format: 'html',
      } }] }),
    });
    assert.equal(response.status, 200, 'Sandbox preview unavailable');
    const body = await response.json();
    const data = body.data ?? body;
    assert.equal(data.preview[0].status, 200);
    assert.equal(Number(body.billing?.charged ?? body.billing?.chargedCents ?? 0), 0);
    if (operation === 'plan-report') assert.ok(data.preview[0].response.data.artifact.content.includes('<html'));
    previews.push({ operation, httpStatus: response.status, response: body });
  }
  return { tools: names, previews, chargedUsd: 0,
    boundary: 'Stateless preview only. Sandbox cannot prove durable status or artifact resource retrieval.' };
}

export async function main() {
  try {
    const mode = process.argv[2];
    assert.ok(['--mock', '--live', '--sandbox'].includes(mode), 'Use --mock, --live or --sandbox');
    const out = process.argv[3];
    assert.ok(out, 'Receipt directory required');
    let api;
    if (mode === '--live') {
      assert.ok(process.env.VEDIKA_PROOF_KEY, 'VEDIKA_PROOF_KEY is required');
      process.env.VEDIKA_API_KEY = process.env.VEDIKA_PROOF_KEY;
      process.env.VEDIKA_BASE_URL = 'https://api.vedika.io';
      api = new VedikaApiClient();
    } else api = mockContract().api;
    const result = mode === '--sandbox' ? await sandboxProof() : await prove(api);
    await mkdir(out, { recursive: true });
    await writeFile(resolve(out, 'summary.json'), JSON.stringify({ mode, ...result }, null, 2) + '\n');
    console.log(JSON.stringify({ mode, tools: result.tools, exactArtifact: mode !== '--sandbox', chargedUsd: result.chargedUsd }));
  } catch {
    console.error('MCP proof failed; no credential or response content printed');
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
