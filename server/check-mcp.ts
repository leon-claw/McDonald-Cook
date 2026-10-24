import 'dotenv/config';
import { McpAdapter } from './mcp.js';

// Read-only smoke check: tools/list -> stores -> menu -> detail -> price. Never creates orders.
const [city, keyword] = process.argv.slice(2);
if (!city || !keyword) throw new Error('Usage: npm run mcp:check -- 城市 位置关键词');
const adapter = new McpAdapter({ url: process.env.MCD_MCP_URL, token: process.env.MCD_MCP_TOKEN, mappingPath: process.env.MCD_MCP_MAPPING_PATH });
try {
  const health = await adapter.health();
  if (!health.ready) throw new Error(health.message);
  const { stores } = await adapter.stores(city, keyword);
  const store = stores.find(item => item.open);
  if (!store) throw new Error('No open stores for this location.');
  const catalog = await adapter.catalog(store.code);
  const product = catalog.products.find(item => item.catalogTag === 'double-beef') ?? catalog.products[0];
  if (!product) throw new Error('No matching game products at this store.');
  const quote = await adapter.quote(product.id, store.code);
  console.log(JSON.stringify({ ready: true, store: store.name, product: quote.public.product.name,
    totalYuan: quote.public.total, takeWays: quote.public.takeWays.map(item => item.title),
    matchedProducts: catalog.products.length, orderCreated: false }, null, 2));
} finally { await adapter.close(); }
