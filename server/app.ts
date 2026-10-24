import express, { type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { ApiError, type Adapter, type Order, type TrustedQuote } from './types.js';
import { OrderLedger } from './ledger.js';
import { isIngredientId, MAX_HELD, resolveRecipe } from '../src/game/data.js';
import { matchCooking } from './cooking.js';
import { automaticMenu } from './automatic-menu.js';

export interface AppOptions { adapter: Adapter; ledgerPath?: string; staticDirectory?: string; now?: () => number; quoteTtlMs?: number; storeSearch?: { city: string; keyword: string } }
export async function createApp(options: AppOptions) {
  const { adapter } = options;
  const now = options.now ?? Date.now;
  const quoteTtlMs = options.quoteTtlMs ?? 5 * 60 * 1000;
  const autoMatch = automaticMenu(adapter, options.storeSearch ?? { city: '上海', keyword: '人民广场' }, now);
  const quotes = new Map<string, TrustedQuote>();
  const pending = new Map<string, Promise<Order>>();
  const ledger = new OrderLedger(options.ledgerPath);
  await ledger.load();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    // The browser and API are same-origin in both dev (Vite proxy) and production.
    // Explicitly reject cross-site mutations; no credentials or tool names are accepted from callers.
    if (req.method !== 'GET' && req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: '请从游戏页面操作。', code: 'CROSS_SITE_REQUEST' });
    next();
  });
  const route = (handler: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => { handler(req, res).catch(next); };
  const inputString = (value: unknown, label: string, max = 160) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) throw new ApiError(400, `${label}无效。`, 'INVALID_INPUT');
    return value.trim();
  };
  app.get('/api/health', route(async (_req, res) => res.json(await adapter.health())));
  app.get('/api/stores', route(async (req, res) => {
    const city = inputString(req.query.city, '城市', 40);
    const keyword = inputString(req.query.keyword, '位置关键词', 100);
    res.json(await adapter.stores(city, keyword));
  }));
  app.get('/api/catalog', route(async (req, res) => {
    const storeCode = req.query.storeCode === undefined ? '' : inputString(req.query.storeCode, '门店编码');
    res.json(await adapter.catalog(storeCode));
  }));
  app.post('/api/cooking-match', route(async (req, res) => {
    const storeCode = req.body?.storeCode === undefined ? undefined : inputString(req.body.storeCode, '门店编码');
    const ingredients: unknown = req.body?.ingredients;
    if (!Array.isArray(ingredients) || ingredients.length < 1 || ingredients.length > MAX_HELD || !ingredients.every(isIngredientId)) {
      throw new ApiError(400, '请投入 1 至 5 份有效食材。', 'INVALID_INGREDIENTS');
    }
    try { resolveRecipe(ingredients); }
    catch (error) { throw new ApiError(400, (error as Error).message, 'MISSING_MAIN_INGREDIENT'); }
    res.json(storeCode ? matchCooking(ingredients, await adapter.catalog(storeCode)) : await autoMatch(ingredients));
  }));
  app.post('/api/quote', route(async (req, res) => {
    const productId = inputString(req.body?.productId, '餐品编码');
    const storeCode = inputString(req.body?.storeCode, '门店编码');
    if (req.body?.quantity !== 1) throw new ApiError(400, '每次料理可订购一份餐品。', 'INVALID_QUANTITY');
    for (const [id, quote] of quotes) if (Date.parse(quote.public.expiresAt) <= now()) quotes.delete(id);
    if (quotes.size >= 1000) throw new ApiError(429, '当前请求较多，请稍后再试。', 'TOO_MANY_QUOTES');
    const quoted = await adapter.quote(productId, storeCode);
    const quote: TrustedQuote = { ...quoted, public: { ...quoted.public, quoteId: randomUUID(), expiresAt: new Date(now() + quoteTtlMs).toISOString() } };
    quotes.set(quote.public.quoteId, quote);
    res.json(quote.public);
  }));
  app.post('/api/orders', route(async (req, res) => {
    const quoteId = inputString(req.body?.quoteId, '报价编号');
    const requestId = inputString(req.body?.requestId, '请求编号');
    ledger.checkRequestId(requestId, quoteId);
    const inFlight = pending.get(quoteId);
    if (inFlight) return res.json(await inFlight);
    const existing = ledger.get(quoteId);
    // Return the original result for every confirmation of this quote, even after expiry/restart.
    if (existing) return res.json(existing.order);
    const quote = quotes.get(quoteId);
    if (!quote) throw new ApiError(404, '报价已失效，请重新获取餐品价格。', 'QUOTE_NOT_FOUND');
    if (Date.parse(quote.public.expiresAt) <= now()) throw new ApiError(410, '报价已过期，请重新获取餐品价格。', 'QUOTE_EXPIRED');
    const takeWayCode = inputString(req.body?.takeWayCode, '取餐方式');
    if (!quote.public.takeWays.some(item => item.code === takeWayCode)) throw new ApiError(400, '请选择本次报价提供的取餐方式。', 'INVALID_TAKE_WAY');
    const create = async (): Promise<Order> => {
      const unknown: Order = {
        mode: adapter.mode, orderId: `PENDING-${randomUUID()}`, status: 'unknown',
        message: '订单结果尚未确认。请先在麦当劳官方渠道查看订单，避免重复下单。',
      };
      const entry = { quoteId, requestId, createdAt: new Date(now()).toISOString(), order: unknown };
      // Persist uncertainty BEFORE crossing the network boundary. A process crash or timeout cannot cause an automatic second order.
      await ledger.put(entry);
      try {
        const order = await adapter.createOrder(quote, takeWayCode);
        await ledger.put({ ...entry, order });
        return order;
      } catch {
        // An upstream failure may happen after the order was created. Never retry automatically.
        return unknown;
      }
    };
    const operation = create();
    pending.set(quoteId, operation);
    try { res.json(await operation); } finally { pending.delete(quoteId); }
  }));
  app.get('/api/order-status', route(async (req, res) => {
    const quoteId = inputString(req.query.quoteId, '报价编号');
    const entry = ledger.get(quoteId);
    if (!entry) throw new ApiError(404, '没有找到这份订单记录。', 'ORDER_NOT_FOUND');
    res.json(entry.order);
  }));
  app.get('/api/orders/:id', route(async (req, res) => {
    const id = inputString(req.params.id, '订单编号');
    const entry = ledger.getByOrderId(id);
    if (!entry) throw new ApiError(404, '没有找到这份订单记录。', 'ORDER_NOT_FOUND');
    res.json(entry.order);
  }));
  app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在。', code: 'NOT_FOUND' }));
  if (options.staticDirectory) {
    app.use(express.static(options.staticDirectory));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(options.staticDirectory!, 'index.html')));
  }
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.message, code: error.code });
    if (error instanceof SyntaxError) return res.status(400).json({ error: '请求格式无效。', code: 'INVALID_JSON' });
    res.status(500).json({ error: '服务暂时不可用，请稍后再试。', code: 'INTERNAL_ERROR' });
  });
  return app;
}
