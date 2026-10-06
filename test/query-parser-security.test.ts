import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const qs: {
  parse(input: string, options: Record<string, unknown>): Record<string, unknown>;
  stringify(input: Record<string, unknown>): string;
} = require('qs');

test('query round-trip does not call an attacker-controlled isBuffer value', () => {
  // GHSA-4mjr-xmp4-gh2g: preserve data keys without calling them as functions.
  const query = 'x%5Bconstructor%5D%5BisBuffer%5D=y';
  const parsed = qs.parse(query, { plainObjects: true });
  assert.equal(qs.stringify(parsed), query);
});

test('bracketed comma arrays enforce the same limit as plain-key arrays', () => {
  // GHSA-x5fp-wj9c-mxmx: four values must not bypass a three-value limit.
  const options = { comma: true, arrayLimit: 3, throwOnLimitExceeded: true };
  for (const query of ['a[]=1,2,3,4', 'a=1,2,3,4']) {
    assert.throws(() => qs.parse(query, options), RangeError);
  }
  assert.deepEqual(qs.parse('a=1,2,3', options), { a: ['1', '2', '3'] });
});
