import { readFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Ajv from 'ajv';
import { ApiError, type Adapter, type Product, type Store, type TrustedQuote } from './types.js';
import { object, parseStores, parseTakeWays, parseToolResult, standardItem } from './mcd-data.js';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface Binding { name: string; arguments: Record<string, Json> }
interface Mapping {
  version: 1;
  stores: Binding;
  detail: Binding;
  catalog: Binding & { productsPath: string; idPath: string; namePath: string; pricePath?: string; storeNamePath?: string; priceScale?: number };
  quote: Binding & { totalPath: string; priceScale?: number; takeWaysPath: string };
  createOrder: Binding & { orderIdPath: string; payUrlPath: string };
  catalogTags: Record<string, string>;
}
const allowedTags = new Set(['cheeseburger', 'double-beef', 'chicken', 'fish', 'spicy-chicken', 'fries', 'beef']);

export function atPath(value: unknown, path: string): unknown {
  if (!path) return value;
  return path.split('.').reduce<unknown>((current, part) => {
    if (['__proto__', 'prototype', 'constructor'].includes(part)) return undefined;
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined;
  }, value);
}
export function materialize(value: Json, context: Record<string, unknown>): unknown {
  if (Array.isArray(value)) return value.map(item => materialize(item, context));
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && typeof value.$ref === 'string') {
      const result = atPath(context, value.$ref);
      if (result === undefined) throw new ApiError(503, 'MCP 字段映射缺失，请检查服务端配置。', 'MCP_MAPPING_ERROR');
      return result;
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, materialize(item, context)]));
  }
  return value;
}
function parseMapping(raw: unknown): Mapping {
  const mapping = raw as Mapping;
  if (!mapping || mapping.version !== 1 || !mapping.catalogTags || typeof mapping.catalogTags !== 'object') throw new Error('Invalid MCP mapping');
  for (const key of ['stores', 'detail', 'catalog', 'quote', 'createOrder'] as const) {
    const binding = mapping[key];
    if (!binding || typeof binding.name !== 'string' || !binding.arguments || typeof binding.arguments !== 'object') throw new Error(`Missing ${key} binding`);
  }
  for (const key of ['productsPath', 'idPath', 'namePath'] as const) {
    if (typeof mapping.catalog[key] !== 'string') throw new Error(`Missing catalog ${key}`);
  }
  if (typeof mapping.quote.totalPath !== 'string' || typeof mapping.quote.takeWaysPath !== 'string' || typeof mapping.createOrder.orderIdPath !== 'string' || typeof mapping.createOrder.payUrlPath !== 'string') throw new Error('Missing response paths');
  for (const value of Object.values(mapping.catalogTags)) if (!allowedTags.has(value)) throw new Error(`Unknown catalog tag: ${value}`);
  for (const section of [mapping.catalog, mapping.quote]) if (section.priceScale !== undefined && (!Number.isFinite(section.priceScale) || section.priceScale <= 0)) throw new Error('Invalid priceScale');
  return mapping;
}
function textField(raw: unknown, path: string): string {
  const value = atPath(raw, path);
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).length === 0) throw new ApiError(502, 'MCP 返回的字段与配置不一致。', 'MCP_RESPONSE_ERROR');
  return String(value);
}
function money(raw: unknown, path: string, scale = 1): number {
  const value = atPath(raw, path);
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') throw new ApiError(502, '未取得有效餐品价格。', 'MCP_PRICE_ERROR');
  const amount = Math.round(Number(value) * scale * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000) throw new ApiError(502, 'MCP 返回的价格不正确。', 'MCP_PRICE_ERROR');
  return amount;
}

export class McpAdapter implements Adapter {
  mode = 'live' as const;
  private client: Client | null = null;
  private mapping: Mapping | null = null;
  private validators = new Map<string, ReturnType<Ajv['compile']>>();
  private initPromise: Promise<void> | null = null;
  private knownStores = new Map<string, { store: Store; expires: number }>();
  constructor(private options: { url?: string; token?: string; mappingPath?: string; fetch?: typeof fetch }) {}
  private async init() {
    if (this.client) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.connect().catch(error => { this.initPromise = null; throw error; });
    return this.initPromise;
  }
  private async connect() {
    const { url, token, mappingPath } = this.options;
    if (!url || !token || !mappingPath) throw new ApiError(503, '真实下单尚未配置，请在服务端设置 MCP 地址、Token 与字段映射。', 'MCP_UNCONFIGURED');
    let endpoint: URL;
    try { endpoint = new URL(url); } catch { throw new ApiError(503, 'MCP 地址配置无效。', 'MCP_UNCONFIGURED'); }
    if (endpoint.protocol !== 'https:') throw new ApiError(503, '真实 MCP 连接必须使用 HTTPS。', 'MCP_UNCONFIGURED');
    let mapping: Mapping;
    try { mapping = parseMapping(JSON.parse(await readFile(mappingPath, 'utf8'))); }
    catch { throw new ApiError(503, 'MCP 字段映射文件未准备好，请参照 server/README.md 配置。', 'MCP_UNCONFIGURED'); }
    const client = new Client({ name: 'wildfire-kitchen', version: '0.1.0' });
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { Authorization: `Bearer ${token}` } }, fetch: this.options.fetch,
    });
    try {
      await client.connect(transport);
      const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
      const tools: { name: string; inputSchema: object }[] = [];
      let cursor: string | undefined;
      do {
        const result = await client.listTools(cursor ? { cursor } : undefined);
        tools.push(...result.tools);
        cursor = result.nextCursor;
        if (tools.length > 1000) throw new Error('Unexpected tool list size');
      } while (cursor);
      for (const binding of [mapping.stores, mapping.detail, mapping.catalog, mapping.quote, mapping.createOrder]) {
        const tool = tools.find(item => item.name === binding.name);
        if (!tool) throw new Error('Configured MCP tool does not exist');
        this.validators.set(binding.name, ajv.compile(tool.inputSchema));
      }
      this.client = client;
      this.mapping = mapping;
    } catch {
      await client.close().catch(() => {});
      throw new ApiError(503, '无法连接麦当劳 MCP，或已配置的工具与实际工具清单不一致。', 'MCP_CONNECTION_ERROR');
    }
  }
  private async invoke(binding: Binding, context: Record<string, unknown>) {
    const args = materialize(binding.arguments, context) as Record<string, unknown>;
    const validate = this.validators.get(binding.name)!;
    if (!validate(args)) throw new ApiError(503, '调用参数与 MCP 工具定义不符，请检查服务端字段映射。', 'MCP_SCHEMA_ERROR');
    try {
      const result = await this.client!.callTool({ name: binding.name, arguments: args }, undefined, { timeout: 20000 });
      return parseToolResult(result);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, '麦当劳服务暂时未响应，请稍后检查。', 'MCP_CONNECTION_ERROR');
    }
  }
  async health() {
    try { await this.init(); return { mode: this.mode, ready: true, message: 'MCP 已连接；请使用当前门店可售餐品。' }; }
    catch (error) { return { mode: 'unconfigured' as const, ready: false, message: error instanceof ApiError ? error.message : 'MCP 暂时无法连接。' }; }
  }
  async stores(city: string, keyword: string) {
    await this.init();
    const stores = parseStores(await this.invoke(this.mapping!.stores, { city, keyword }));
    const now = Date.now();
    for (const [code, entry] of this.knownStores) if (entry.expires <= now) this.knownStores.delete(code);
    for (const store of stores) this.knownStores.set(store.code, { store, expires: now + 30 * 60 * 1000 });
    while (this.knownStores.size > 500) this.knownStores.delete(this.knownStores.keys().next().value!);
    return { mode: this.mode, stores };
  }
  private async readCatalog(storeCode: string) {
    if (!storeCode) throw new ApiError(400, '请输入取餐门店编码。', 'STORE_REQUIRED');
    await this.init();
    const selected = this.knownStores.get(storeCode);
    if (!selected || selected.expires <= Date.now()) throw new ApiError(400, '请先搜索并选择取餐门店。', 'STORE_REQUIRED');
    if (!selected.store.open) throw new ApiError(409, '当前门店暂停营业，请选择营业中的门店。', 'STORE_CLOSED');
    const mapping = this.mapping!;
    const raw = await this.invoke(mapping.catalog, { storeCode, quantity: 1 });
    const mealMap = object(atPath(raw, mapping.catalog.productsPath));
    const categories = atPath(raw, 'data.categories');
    if (!Array.isArray(categories)) throw new ApiError(502, '无法读取门店菜单。', 'MCP_RESPONSE_ERROR');
    const codes = new Set(categories.flatMap(category => {
      const meals = object(category).meals;
      return Array.isArray(meals) ? meals.map(meal => textField(meal, 'code')) : [];
    }));
    const items = [...codes].filter(code => Object.hasOwn(mealMap, code)).map(code => ({ ...object(mealMap[code]), code }));
    const products: Product[] = [];
    const rawProducts = new Map<string, unknown>();
    for (const item of items) {
      const id = textField(item, mapping.catalog.idPath);
      const name = textField(item, mapping.catalog.namePath);
      const catalogTag = mapping.catalogTags[id] ?? mapping.catalogTags[name];
      if (!catalogTag) continue;
      const price = mapping.catalog.pricePath ? money(item, mapping.catalog.pricePath, mapping.catalog.priceScale) : null;
      products.push({ id, name, price, catalogTag });
      rawProducts.set(id, item);
    }
    return { catalog: { mode: this.mode, store: selected.store, products }, rawProducts };
  }
  async catalog(storeCode: string) { return (await this.readCatalog(storeCode)).catalog; }
  async quote(productId: string, storeCode: string) {
    const { catalog, rawProducts } = await this.readCatalog(storeCode);
    const product = catalog.products.find(item => item.id === productId);
    if (!product) throw new ApiError(404, '该餐品在当前门店不可售，请重新选择。', 'PRODUCT_UNAVAILABLE');
    const context = { storeCode, productId, quantity: 1, product: rawProducts.get(productId) };
    const detail = standardItem(await this.invoke(this.mapping!.detail, context), productId);
    product.name = detail.name;
    const items = [detail.item];
    const rawQuote = await this.invoke(this.mapping!.quote, { ...context, items });
    const priced = atPath(rawQuote, 'data.productList');
    if (!Array.isArray(priced) || priced.length !== 1 || atPath(priced[0], 'productCode') !== productId || atPath(priced[0], 'quantity') !== 1) {
      throw new ApiError(502, '算价返回的商品与所选餐品不一致。', 'MCP_RESPONSE_ERROR');
    }
    const total = money(rawQuote, this.mapping!.quote.totalPath, this.mapping!.quote.priceScale);
    const takeWays = parseTakeWays(atPath(rawQuote, this.mapping!.quote.takeWaysPath));
    return { public: { mode: this.mode, product, store: catalog.store, quantity: 1 as const, total, currency: 'CNY' as const,
      takeWays, configuration: `标准配方 · 一份单品${detail.supportModify ? '（可特调，当前采用默认配方）' : ''}` }, context: { ...context, items, quote: rawQuote } };
  }
  async createOrder(quote: TrustedQuote, takeWayCode: string) {
    await this.init();
    if (!quote.public.takeWays.some(item => item.code === takeWayCode)) throw new ApiError(400, '请选择本次报价提供的取餐方式。', 'INVALID_TAKE_WAY');
    const raw = await this.invoke(this.mapping!.createOrder, { ...object(quote.context), takeWayCode });
    const orderId = textField(raw, this.mapping!.createOrder.orderIdPath);
    const payUrl = textField(raw, this.mapping!.createOrder.payUrlPath);
    let parsed: URL;
    try { parsed = new URL(payUrl); } catch { throw new ApiError(502, '支付链接格式无法识别，请在麦当劳官方渠道查询订单。', 'MCP_RESPONSE_ERROR'); }
    if (parsed.protocol !== 'https:') throw new ApiError(502, '支付链接不符合 HTTPS 要求，请在麦当劳官方渠道查询订单。', 'MCP_RESPONSE_ERROR');
    return { mode: this.mode, orderId, status: 'created' as const, payUrl };
  }
  async close() { await this.client?.close(); }
}
