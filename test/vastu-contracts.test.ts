import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { VedikaApiClient } from '../src/client.js';
import { registerVastuTools } from '../src/tools/vastu.js';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: true };
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;
type ApiCall = {
  method: 'GET' | 'POST';
  path: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  idempotencyKey?: string;
};

// registerVastuTools registers SEVEN tools; capture every handler by name plus
// the API calls each makes, with the real client's get/post signatures.
function captureVastuTools() {
  const schemas = new Map<string, z.ZodRawShape>();
  const handlers = new Map<string, ToolHandler>();
  const calls: ApiCall[] = [];

  const server = {
    tool: (...args: unknown[]) => {
      const name = args[0] as string;
      const handler = args.at(-1) as ToolHandler;
      handlers.set(name, handler);
      schemas.set(name, args[2] as z.ZodRawShape);
    },
  } as unknown as McpServer;

  const client = {
    get: async (path: string, params?: Record<string, string>) => {
      calls.push({ method: 'GET', path, params });
      return { ok: true };
    },
    post: async (path: string, body: Record<string, unknown>, _timeoutMs?: number, idempotencyKey?: string) => {
      calls.push({ method: 'POST', path, body, ...(idempotencyKey === undefined ? {} : { idempotencyKey }) });
      return { ok: true };
    },
  } as unknown as VedikaApiClient;

  registerVastuTools(server, client);
  return { handlers, calls, schemas };
}

// The 11 GET-only reference tables, version catalog and GET+POST dual, registered in
// rust/vedika-api-rust/crates/vedika-v2/src/vastu.rs (GET-classified set).
const GET_OPS = [
  'reference/directions/8',
  'reference/directions/16',
  'reference/directions/32',
  'reference/mandala/9-zone',
  'reference/mandala/45-devatas',
  'reference/mandala/64-pada',
  'reference/defects/catalog',
  'reference/remedies/catalog',
  'reference/colors-by-zone',
  'reference/materials-by-zone',
  'reference/gate-obstructions',
  'direction/declination',
  'rules/versions',
];
const POST_OPS = ['score/overall', 'placement/borewell', 'entrance/pada', 'plan/analyze', 'plan/compare-versions', 'receipt/verify'];

test('vastu_operation: references, version catalog and declination dispatch GET, others POST', async () => {
  const { handlers, calls } = captureVastuTools();
  const op = handlers.get('vastu_operation');
  assert.ok(op, 'vastu_operation must be registered');

  for (const o of GET_OPS) await op!({ op: o, params: {} });
  for (const o of POST_OPS) await op!({ op: o, params: { zone: 'north' } });

  GET_OPS.forEach((o, i) => {
    assert.equal(calls[i]!.method, 'GET', `${o} must be GET`);
    assert.equal(calls[i]!.path, `/v2/astrology/vastu/${o}`);
  });
  POST_OPS.forEach((o, i) => {
    const c = calls[GET_OPS.length + i]!;
    assert.equal(c.method, 'POST', `${o} must be POST`);
    assert.equal(c.path, `/v2/astrology/vastu/${o}`);
  });
});

test('vastu_operation GET forwards params as string query values', async () => {
  const { handlers, calls } = captureVastuTools();
  const op = handlers.get('vastu_operation')!;
  await op({ op: 'direction/declination', params: { lat: 28.6, lon: 77.2 } });
  assert.equal(calls[0]!.method, 'GET');
  assert.deepEqual(calls[0]!.params, { lat: '28.6', lon: '77.2' });
  assert.equal(calls[0]!.body, undefined);
});

test('vastu_operation normalizes a leading slash and surrounding whitespace', async () => {
  const { handlers, calls } = captureVastuTools();
  const op = handlers.get('vastu_operation')!;
  const result = await op({ op: '  /score/overall  ', params: {} });
  assert.equal(result.isError, undefined);
  assert.deepEqual(calls, [{ method: 'POST', path: '/v2/astrology/vastu/score/overall', body: {} }]);
});

test('vastu_reference resolves gate-obstructions to the real GET path', async () => {
  const { handlers, calls } = captureVastuTools();
  const ref = handlers.get('vastu_reference');
  assert.ok(ref, 'vastu_reference must be registered');
  await ref!({ table: 'gate-obstructions' });
  assert.equal(calls[0]!.method, 'GET');
  assert.equal(calls[0]!.path, '/v2/astrology/vastu/reference/gate-obstructions');
});

test('vastu_operation rejects namespace escape and never calls the API', async () => {
  const { handlers, calls } = captureVastuTools();
  const op = handlers.get('vastu_operation')!;
  for (const bad of [
    '../admin',
    'score/../../etc/passwd',
    'http://evil.example/x',
    'score/overall?leak=1',
    'score/overall#frag',
    'Score/Overall',
    'score//overall',
    'score/overall/',
  ]) {
    const result = await op({ op: bad, params: {} });
    assert.equal(result.isError, true, `must reject "${bad}"`);
  }
  assert.deepEqual(calls, [], 'a rejected op must make no API call');
});

const completePlan = {
  plot: { width: 40, length: 60, facing: 'E' },
  requirements: {
    bedrooms: 3, toilets: 2, floors: 1, hasLiving: true, hasKitchen: true,
    hasPooja: true, hasStudy: true, hasDining: false, hasStore: false,
    hasGuest: false, hasStaircase: false,
  },
};

test('plan schema preserves the complete Rust room brief and rejects missing required input', async () => {
  const { schemas, handlers, calls } = captureVastuTools();
  const schema = z.object(schemas.get('vastu_generate_plan')!);
  const parsed = schema.parse(completePlan);
  assert.deepEqual(parsed, completePlan);
  await handlers.get('vastu_generate_plan')!(parsed);
  assert.deepEqual(calls[0]!.body, completePlan);
  assert.equal(schema.safeParse({ plot: completePlan.plot }).success, false);
  for (const field of Object.keys(completePlan.requirements)) {
    const brief: Record<string, unknown> = { ...completePlan.requirements };
    delete brief[field];
    assert.equal(schema.safeParse({ plot: completePlan.plot, requirements: brief }).success, false, field);
  }
  for (const [field, value] of [['bedrooms', 1.5], ['toilets', 9], ['floors', 0], ['parking', true]]) {
    assert.equal(schema.safeParse({ ...completePlan, requirements: { ...completePlan.requirements, [field as string]: value } }).success, false);
  }
});

test('plan schema preserves BHK and bathrooms aliases including inferred study', () => {
  const { schemas } = captureVastuTools();
  const schema = z.object(schemas.get('vastu_generate_plan')!);
  const requirements = { bhk: '2.5 BHK', bathrooms: 1, floors: 1, hasPooja: false,
    hasDining: false, hasStore: false, hasGuest: false, hasStaircase: false };
  assert.deepEqual(schema.parse({ plot: completePlan.plot, requirements }).requirements, requirements);
});

test('batch tool requires a retained key and forwards it separately from the body', async () => {
  const { schemas, handlers, calls } = captureVastuTools();
  const schema = z.object(schemas.get('vastu_operation')!);
  const handler = handlers.get('vastu_operation')!;
  const missing = await handler({ op: 'assessments/batch', params: {} });
  assert.equal(missing.isError, true);
  assert.match(missing.content[0]!.text, /retained Idempotency-Key/);
  assert.deepEqual(calls, []);
  const body = { items: [{ id: 'one', assessment: {} }] };
  for (const key of ['batch-one', 'batch-one', 'batch-two']) {
    const args = schema.parse({ op: 'assessments/batch', params: body, idempotencyKey: key });
    await handler(args);
    assert.equal(calls.at(-1)!.idempotencyKey, key);
    assert.deepEqual(calls.at(-1)!.body, body);
  }
});
