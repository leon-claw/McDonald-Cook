import { useEffect, useRef, useState } from 'react';
import type { CookingMatch, Order, Quote } from '../../server/types';
import './order.css';

import { api } from '../game/api';

const price = (value: number) => `¥${value.toFixed(2)}`;

export function OrderPanel({ match }: { match: CookingMatch }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [takeWayCode, setTakeWayCode] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const requestId = useRef('');
  useEffect(() => {
    if (!quote) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [quote]);
  async function run(label: string, action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(label); setError('');
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : '服务暂时不可用。'); }
    finally { pending.current = false; setBusy(''); }
  }
  const getQuote = () => void run('正在核实餐品价格…', async () => {
    setQuote(null);
    const result = await api<Quote>('/api/quote', { productId: match.product.id, storeCode: match.store.code, quantity: 1 });
    if (result.product.id !== match.product.id || result.product.catalogTag !== match.recipeId || result.product.name !== match.product.name || result.store.code !== match.store.code || result.mode !== match.mode) throw new Error('餐品信息发生变化，请回到营地重新烹饪。');
    requestId.current = crypto.randomUUID(); setQuote(result); setTakeWayCode(''); setNow(Date.now());
  });
  const createOrder = () => void run('正在提交订单，请稍候…', async () => {
    if (!quote || !takeWayCode) return;
    // Keep the same quote and request on a lost response. Do not retry creation automatically.
    setUncertain(true);
    const result = await api<Order>('/api/orders', { quoteId: quote.quoteId, requestId: requestId.current, takeWayCode });
    setOrder(result); setUncertain(false);
  });
  const checkOrder = () => void run('正在查看本次订单记录…', async () => {
    setOrder(await api<Order>(`/api/order-status?${new URLSearchParams({ quoteId: quote!.quoteId })}`));
    setUncertain(false);
  });
  const locked = !!order || uncertain;
  const expired = quote ? Date.parse(quote.expiresAt) <= now : false;
  return <section className="order-panel" aria-label="餐品与订单" aria-busy={!!busy}>
    <div className="order-heading"><b>{match.mode === 'live' ? '麦当劳 · 真实餐品' : '营地餐台 · 演示'}</b><span>到店取餐 · 立即取餐</span></div>
    {match.mode === 'demo' && <p className="order-note">演示餐品与价格，不会产生真实订单或扣款。</p>}
    {!locked && <div className="order-selection">
      <p><b>{match.product.name}</b></p>
      <p className="order-note">与本锅料理相同的餐品及款式，采用标准配方。</p>
      <button className="gold-btn" disabled={!!busy} onClick={getQuote}>{quote ? '重新获取价格' : '获取价格'}</button>
    </div>}
    {quote && <div className="quote-review">
      <b>{quote.product.name} × {quote.quantity}</b><span>{quote.configuration}</span><strong className="quote-total">合计 {price(quote.total)}</strong>
      {!locked && <>
        <label>取餐方式<select value={takeWayCode} disabled={!!busy} onChange={event => setTakeWayCode(event.target.value)}><option value="">请选择取餐方式</option>{quote.takeWays.map(way => <option value={way.code} key={way.code}>{way.title}{way.subtitle ? ` · ${way.subtitle}` : ''}</option>)}</select></label>
        <small>{expired ? '报价已过期，请重新获取价格。' : `报价有效至 ${new Date(quote.expiresAt).toLocaleTimeString('zh-CN')}`}</small>
        <p className="order-note">{quote.mode === 'live' ? '确认后会创建真实待支付订单，随后前往麦当劳官方页面支付。' : '确认后仅创建本地演示订单。'}</p>
        <button className="gold-btn" disabled={!!busy || expired || !takeWayCode} onClick={createOrder}>{quote.mode === 'live' ? '确认以上信息，创建待支付订单' : '确认并创建演示订单'}</button>
      </>}
    </div>}
    {uncertain && <div className="order-result"><b>正在确认本次订单结果</b><span>若提交响应丢失，请先检查本次记录和麦当劳官方订单，避免重复提交。</span><button className="gold-btn" disabled={!!busy} onClick={checkOrder}>查询本次订单记录</button></div>}
    {order && <div className="order-result" role="status"><b>{order.status === 'demo' ? '演示订单已创建' : order.status === 'created' ? '真实订单已创建 · 待支付' : '订单结果尚未确认'}</b><span>订单编号：{order.orderId}</span>{order.message && <span>{order.message}</span>}{order.status === 'created' && order.payUrl && <a className="gold-btn" href={order.payUrl} target="_blank" rel="noopener noreferrer">前往麦当劳支付</a>}{order.mode === 'live' && <small>请在麦当劳官方页面完成支付并查看后续订单状态。</small>}</div>}
    {busy && <p role="status">{busy}</p>}{error && <p className="order-error" role="alert">{error}</p>}
  </section>;
}
