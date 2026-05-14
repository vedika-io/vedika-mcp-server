#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VedikaApiClient } from './client.js';
import { registerAllTools } from './tools/index.js';

const server = new McpServer({
  name: 'vedika-mcp-server',
  version: '2.0.0',
});

try {
  const client = new VedikaApiClient();
  registerAllTools(server, client);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[vedika-mcp-server] Startup error: ${message}`);
  process.exit(1);
}

const transport = new StdioServerTransport();
await server.connect(transport);
