// The operation count an agent reads in the vastu_operation description comes
// from the operation list, and that list matches the published API contract.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { VedikaApiClient } from '../src/client.js';
import { registerVastuTools, VASTU_OPERATIONS } from '../src/tools/vastu.js';

function toolDescriptions(): Map<string, string> {
  const descriptions = new Map<string, string>();
  const server = {
    tool: (...args: unknown[]) => {
      descriptions.set(args[0] as string, args[1] as string);
    },
  } as unknown as McpServer;
  registerVastuTools(server, {} as VedikaApiClient);
  return descriptions;
}

test('the Vastu operation list is complete and has no duplicates', () => {
  assert.equal(VASTU_OPERATIONS.length, 143);
  assert.equal(new Set(VASTU_OPERATIONS).size, VASTU_OPERATIONS.length);
  for (const op of VASTU_OPERATIONS) assert.match(op, /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/);
});

test('vastu_operation states the operation count derived from the list', () => {
  const description = toolDescriptions().get('vastu_operation');
  assert.ok(description, 'vastu_operation must be registered');
  const stated = [...description.matchAll(/(\d+)-operation surface/g)].map((match) => Number(match[1]));
  assert.deepEqual(stated, [VASTU_OPERATIONS.length]);

  // Every example the description offers is a real operation.
  const examples = [...description.matchAll(/"([a-z0-9/-]+)"/g)].map((match) => match[1]!);
  assert.ok(examples.length >= 10, `expected the description to carry examples, found ${examples.length}`);
  assert.deepEqual(examples.filter((op) => !VASTU_OPERATIONS.includes(op)), []);
});

// The four async job routes (POST jobs, GET jobs/{id}, GET jobs/{id}/results,
// POST jobs/{id}/cancel; published under both Vastu prefixes) are deliberately
// outside the generic operation inventory: dedicated typed job tools submit,
// poll, cancel and fetch artifacts without blocking for job completion.
const ASYNC_JOB_OPERATIONS = new Set(['jobs', 'jobs/{id}', 'jobs/{id}/results', 'jobs/{id}/cancel']);

const publishedSpec = fileURLToPath(new URL('../../../web/vedika-public/openapi.json', import.meta.url));

test('the operation list equals the published OpenAPI Vastu paths', { skip: existsSync(publishedSpec) ? false : 'published OpenAPI spec is not in this checkout' }, () => {
  const spec = JSON.parse(readFileSync(publishedSpec, 'utf8')) as { paths: Record<string, unknown> };
  const prefix = '/v2/astrology/vastu/';
  const published = Object.keys(spec.paths)
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length))
    .filter((operation) => !ASYNC_JOB_OPERATIONS.has(operation))
    .sort();
  assert.deepEqual([...VASTU_OPERATIONS].sort(), published);
});

// The report-chat PDF upload (POST /api/v1/vastu/chat/uploads) is
// deliberately not an MCP operation either: it takes a binary multipart file,
// which a JSON tool-call argument cannot carry, and it only prepares context
// for an AI query. An agent passes the Vedika report JSON as
// vastuContext.report on the query instead.
test('the report-chat PDF upload stays outside the MCP operation list', { skip: existsSync(publishedSpec) ? false : 'published OpenAPI spec is not in this checkout' }, () => {
  const spec = JSON.parse(readFileSync(publishedSpec, 'utf8')) as { paths: Record<string, unknown> };
  assert.ok(spec.paths['/api/v1/vastu/chat/uploads'], 'the upload route is published');
  assert.equal(VASTU_OPERATIONS.some((op) => op.includes('upload') && op.startsWith('chat')), false);
});
