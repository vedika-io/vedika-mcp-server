import test from 'node:test';
import assert from 'node:assert/strict';
import { VedikaApiError } from '../src/errors.js';
import { safeTool } from '../src/tool-wrapper.js';
const secret = 'vk_live_private_SENTINEL /srv/private/database postgres://private';
test('public API errors do not echo upstream strings or objects', () => {
  for (const status of [400,401,402,403,404,422,429,500,503]) {
    for (const body of [secret, {message: secret, error: secret, retryAfter: secret, walletBalance: secret}, {error: {stack: secret}}]) {
      const result = new VedikaApiError(status, body).toMcpError();
      assert.equal(result.isError, true);
      assert.doesNotMatch(JSON.stringify(result), /SENTINEL|private|NaN|object Object/);
    }
  }
});
test('unknown failures remain private, including non-Error throws', async () => {
  for (const error of [new Error(secret), secret, {toString: () => secret}]) {
    const result = await safeTool(async () => {throw error;});
    assert.equal(result.isError, true);
    assert.doesNotMatch(JSON.stringify(result), /SENTINEL|private/);
  }
});
test('safe numeric retry hints and subscription category remain actionable', () => {
  assert.match(new VedikaApiError(429, {retryAfter: 12}).message, /12s/);
  assert.match(new VedikaApiError(402, {code: 'SUBSCRIPTION_EXPIRED'}).message, /Subscription expired/);
  for (const retryAfter of [NaN, Infinity, -1, '42', 1e20]) {
    assert.doesNotMatch(new VedikaApiError(429, {retryAfter}).message, /Retry after/);
  }
});
