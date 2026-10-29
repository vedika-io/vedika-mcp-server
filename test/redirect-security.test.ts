import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

test('transport dependency refuses cross-origin credential redirects', async () => {
  const received: IncomingHttpHeaders[] = [];
  const destination = createServer((req, res) => {
    received.push(req.headers);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }));
  });
  await new Promise<void>(resolve => destination.listen(0, '127.0.0.1', resolve));
  const destinationPort = (destination.address() as AddressInfo).port;
  const origin = createServer((_, res) => {
    res.writeHead(307, { location: `http://127.0.0.1:${destinationPort}/mcp` });
    res.end();
  });
  await new Promise<void>(resolve => origin.listen(0, '127.0.0.1', resolve));
  const originPort = (origin.address() as AddressInfo).port;
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${originPort}/mcp`), {
    sessionId: 'private-test-session', requestInit: { headers: { 'x-api-key': 'dummy-test-key' } },
  });
  try {
    await transport.send({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }).catch(() => {});
    assert.equal(received.length, 0, 'cross-origin redirect forwarded a credential-bearing request');
  } finally {
    await transport.close();
    await Promise.all([
      new Promise<void>(resolve => origin.close(() => resolve())),
      new Promise<void>(resolve => destination.close(() => resolve())),
    ]);
  }
});
