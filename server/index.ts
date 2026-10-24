import 'dotenv/config';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { DemoAdapter } from './demo.js';
import { McpAdapter } from './mcp.js';
import type { Adapter } from './types.js';

const live = process.env.MCD_MODE === 'live';
const adapter: Adapter = live ? new McpAdapter({ url: process.env.MCD_MCP_URL, token: process.env.MCD_MCP_TOKEN, mappingPath: process.env.MCD_MCP_MAPPING_PATH }) : new DemoAdapter();
const dist = resolve('dist');
const app = await createApp({ adapter, ledgerPath: resolve(process.env.MCD_LEDGER_PATH ?? 'server/data/orders.json'), staticDirectory: existsSync(resolve(dist, 'index.html')) ? dist : undefined,
  storeSearch: { city: process.env.MCD_STORE_CITY || '上海', keyword: process.env.MCD_STORE_KEYWORD || '人民广场' } });
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
const server = app.listen(port, host, () => console.log(`麦当劳传说 API: http://${host}:${port} (${live ? 'live configuration' : 'demo; no real orders'})`));
const shutdown = () => { server.close(() => { void adapter.close?.().finally(() => process.exit(0)); if (!adapter.close) process.exit(0); }); };
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
