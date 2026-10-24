import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Catalog, Order, Quote, Store } from '../../server/types';
import './order.css';

type Health = { mode: 'demo' | 'live' | 'unconfigured'; ready: boolean; message?: string };
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? '请求暂时未完成，请稍后重试。');
  return result as T;
}
const price = (value: number) => `¥${value.toFixed(2)}`;

export function OrderPanel({ catalogTag }: { catalogTag: string }) {
  const [opened, setOpened] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [city, setCity] = useState('');
  const [keyword, setKeyword] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [productId, setProductId] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [takeWayCode, setTakeWayCode] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const requestId = useRef('');
  const products = catalog?.products.filter(item => item.catalogTag === catalogTag) ?? [];
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
  const open = () => void run('正在连接餐台…', async () => {
    setOpened(true);
    const status = await api<Health>('/api/health'); setHealth(status);
    if (status.mode === 'demo' && status.ready) {
      const menu = await api<Catalog>('/api/catalog'); setCatalog(menu);
      setProductId(menu.products.find(item => item.catalogTag === catalogTag)?.id ?? '');
    }
  });
  function search(event: FormEvent) {
    event.preventDefault();
    void run('正在搜索门店…', async () => {
      setCatalog(null); setQuote(null); setStores([]);
      const result = await api<{ stores: Store[] }>(`/api/stores?${new URLSearchParams({ city, keyword })}`);
      setStores(result.stores);
      if (!result.stores.length) setError('这个位置附近暂时没有可用门店，请更换关键词。');
    });
  }
  const selectStore = (store: Store) => void run('正在查看门店菜单…', async () => {
    setCatalog(null); setQuote(null); setProductId('');
    const menu = await api<Catalog>(`/api/catalog?${new URLSearchParams({ storeCode: store.code })}`);
    setCatalog(menu); setProductId(menu.products.find(item => item.catalogTag === catalogTag)?.id ?? '');
  });
  const getQuote = () => void run('正在核实餐品价格…', async () => {
    setQuote(null);
    const result = await api<Quote>('/api/quote', { productId, storeCode: catalog!.store.code, quantity: 1 });
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
  if (!opened) return <button className="gold-btn" disabled={!!busy} onClick={open}>看看对应的麦当劳餐品</button>;
  const locked = !!order || uncertain;
  const expired = quote ? Date.parse(quote.expiresAt) <= now : false;
  return <section className="order-panel" aria-label="餐品与订单" aria-busy={!!busy}>
    <div className="order-heading"><b>{health?.mode === 'live' ? '麦当劳 · 真实餐品' : health?.mode === 'demo' ? '营地餐台 · 演示' : '连接麦当劳餐台'}</b><span>到店取餐 · 立即取餐</span></div>
    {health?.mode === 'demo' && <p className="order-note">演示餐品与价格，不会产生真实订单或扣款。</p>}
    {health && !health.ready && <p role="status">{health.message}<button className="subtle-btn" disabled={!!busy} onClick={open}>重新连接</button></p>}
    {health?.ready && health.mode === 'live' && !locked && <>
      <form className="store-search" onSubmit={search}>
        <label>城市<input required maxLength={40} placeholder="例如：上海" value={city} onChange={event => setCity(event.target.value)} disabled={!!busy}/></label>
        <label>附近位置<input required maxLength={100} placeholder="街道、商场或地标" value={keyword} onChange={event => setKeyword(event.target.value)} disabled={!!busy}/></label>
        <button className="gold-btn" disabled={!!busy || !city.trim() || !keyword.trim()}>搜索门店</button>
      </form>
      <div className="store-options">{stores.map(store => <div className="store-option" key={store.code}>
        <button className={catalog?.store.code === store.code ? 'selected' : ''} disabled={!!busy || !store.open} onClick={() => selectStore(store)}><b>{store.name}</b><span>{store.address}</span><small>{store.open ? '营业中' : '暂停营业'} · {store.hours} · 编码 {store.code}</small></button>
        {!!store.reservationOptions?.length && <details><summary>查看可预约时段（当前使用立即取餐）</summary>{store.reservationOptions.map(option => <p key={option.date}>{option.date}{option.today ? '（今天）' : ''}：{option.text}</p>)}</details>}
      </div>)}</div>
    </>}
    {catalog && !locked && <div className="order-selection">
      <p><b>{catalog.store.name}</b><br/>{catalog.store.address}</p>
      {products.length ? <>
        <label>对应餐品<select value={productId} disabled={!!busy} onChange={event => { setProductId(event.target.value); setQuote(null); }}>{products.map(product => <option key={product.id} value={product.id}>{product.name}{product.price === null ? '' : ` · 参考 ${price(product.price)}`}</option>)}</select></label>
        <p className="order-note">游戏料理对应同类餐品；实际购买以这里展示的商品和默认配方为准。</p>
        <button className="gold-btn" disabled={!!busy || !productId} onClick={getQuote}>{quote ? '重新获取价格' : '获取价格'}</button>
      </> : <p>这家门店目前没有与本次料理对应的单品。请选择其他门店。</p>}
    </div>}
    {quote && <div className="quote-review">
      <b>{quote.product.name} × {quote.quantity}</b><span>{quote.configuration}</span><span>{quote.store.name} · {quote.store.address}</span><strong className="quote-total">合计 {price(quote.total)}</strong>
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
    {!health && !busy && <button className="gold-btn" onClick={open}>重新连接餐台</button>}
  </section>;
}
