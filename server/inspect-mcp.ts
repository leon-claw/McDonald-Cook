import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Read-only inspection. Only these business queries can be called from this CLI.
const readTools = new Set(['query-nearby-stores', 'query-meals', 'query-meal-detail', 'calculate-price']);
const callName = process.argv[2];
if (callName && !readTools.has(callName)) throw new Error('Only menu, store, detail and price queries are allowed.');
if (!process.env.MCD_MCP_URL || !process.env.MCD_MCP_TOKEN) throw new Error('Set MCD_MCP_URL and MCD_MCP_TOKEN in .env first.');
const client = new Client({ name: 'wildfire-kitchen-schema-inspector', version: '0.1.0' });
try {
  const endpoint = new URL(process.env.MCD_MCP_URL);
  if (endpoint.protocol !== 'https:') throw new Error('HTTPS required');
  await client.connect(new StreamableHTTPClientTransport(endpoint, { requestInit: { headers: { Authorization: `Bearer ${process.env.MCD_MCP_TOKEN}` } } }));
  if (callName) {
    const args: unknown = JSON.parse(process.argv[3] ?? '{}');
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be a JSON object.');
    const result = await client.callTool({ name: callName, arguments: args as Record<string, unknown> });
    console.log(JSON.stringify(result, null, 2));
  } else {
    let cursor: string | undefined;
    do {
      const result = await client.listTools(cursor ? { cursor } : undefined);
      console.log(JSON.stringify(result.tools, null, 2));
      cursor = result.nextCursor;
    } while (cursor);
  }
} finally { await client.close(); }
