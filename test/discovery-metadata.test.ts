import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MCP_SERVER_VERSION } from '../src/version.js';

const readJson = (name: string) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));

test('registry discovery identifies the exact published package and runtime version', () => {
  const manifest = readJson('package.json');
  const lock = readJson('package-lock.json');
  const server = readJson('server.json');
  assert.equal(server.$schema, 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json');
  assert.equal(server.name, 'io.github.vedika-io/vedika-mcp-server');
  assert.equal(manifest.mcpName, server.name);
  assert.equal(server.version, manifest.version);
  assert.equal(MCP_SERVER_VERSION, manifest.version);
  assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[''].version, manifest.version);
  assert.ok(manifest.files.includes('server.json'));
  assert.equal(server.packages.length, 1);
  assert.equal(server.packages[0].registryType, 'npm');
  assert.equal(server.packages[0].identifier, manifest.name);
  assert.equal(server.packages[0].version, manifest.version);
  assert.deepEqual(server.packages[0].transport, { type: 'stdio' });
  assert.deepEqual(server.repository, {
    url: 'https://github.com/vedika-io/vedika-mcp-server', source: 'github',
  });
});

test('discovery requests credentials privately without embedding a value or changing the API origin', () => {
  const server = readJson('server.json');
  const variables = server.packages[0].environmentVariables;
  assert.equal(variables.length, 1);
  assert.equal(variables[0].name, 'VEDIKA_API_KEY');
  assert.equal(variables[0].isRequired, true);
  assert.equal(variables[0].isSecret, true);
  assert.equal(variables[0].value, undefined);
  assert.equal(variables[0].default, undefined);
  assert.equal(variables[0].placeholder, undefined);
  assert.equal(server.remotes, undefined);
  assert.equal(server.packages[0].packageArguments, undefined);
});


test('AI tool guidance does not advertise a fixed numerical response-time range', () => {
  const source = readFileSync(new URL('../src/tools/ai-chat.ts', import.meta.url), 'utf8');
  const latencyRange = /\b\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*(?:s\b|seconds?\b)/i;
  assert.equal(latencyRange.test(source), false);
  assert.equal(latencyRange.test('Responses take 5-90 seconds'), true);
  assert.equal(latencyRange.test('Response time depends on the selected tier'), false);
});


test('AI discovery copy states conditional coverage and directs users to current billing terms', () => {
  const source = readFileSync(new URL('../src/tools/ai-chat.ts', import.meta.url), 'utf8');
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const unsupported = /precision-validated|anti-hallucination validated|30 (?:supported )?languages|\$0\.008-0\.05/i;
  assert.equal(unsupported.test(source), false);
  const toolRow = readme.split('\n').find(line => line.startsWith('| `vedika_ai_chat` |'));
  assert.ok(toolRow);
  assert.equal(unsupported.test(toolRow), false);
  assert.ok(source.includes('https://vedika.io/pricing'));
  assert.ok(toolRow.includes('https://vedika.io/pricing'));
  assert.equal(unsupported.test('precision-validated chart computation (30 languages)'), true);
});
