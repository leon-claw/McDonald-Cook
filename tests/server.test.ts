import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp, type AppOptions } from '../server/app.js';
import { DemoAdapter } from '../server/demo.js';
import type { Adapter, Order } from '../server/types.js';

async function fixture(t: TestContext, options: Partial<AppOptions> = {}) {
  const app = await createApp({ adapter: new DemoAdapter(), ...options });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = async (path: string, body?: unknown, headers?: Record<string, string>) => {
    const result = await fetch(base + path, body === undefined ? undefined : {
      method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
    });
    return { status: result.status, body: await result.json() };
  };
  const quote = async () => {
    const result = await request('/api/quote', { productId: 'demo-double-beef', storeCode: 'demo-camp', quantity: 1, total: 0.01 });
    assert.equal(result.status, 200);
    return result.body;
  };
  return { request, quote };
}
const confirm = (quoteId: string, requestId = 'request-one') => ({ quoteId, requestId, takeWayCode: 'demo-pickup' });

test('demo API searches, quotes trusted prices, creates and recovers a local order', async t => {
  const { request, quote } = await fixture(t);
  assert.equal((await request('/api/health')).body.mode, 'demo');
  const stores = await request('/api/stores?city=上海&keyword=人民广场');
  assert.equal(stores.body.stores[0].code, 'demo-camp');
  const menu = await request('/api/catalog');
  assert.ok(menu.body.products.length > 0);
  const priced = await quote();
  assert.equal(priced.total, 26);
  assert.equal(priced.quantity, 1);
  assert.equal(priced.context, undefined);
  const order = await request('/api/orders', confirm(priced.quoteId));
  assert.equal(order.status, 200);
  assert.equal(order.body.status, 'demo');
  assert.equal(order.body.payUrl, undefined);
  assert.deepEqual((await request(`/api/orders/${order.body.orderId}`)).body, order.body);
  assert.deepEqual((await request(`/api/order-status?quoteId=${priced.quoteId}`)).body, order.body);
});

test('invalid input, quantities, fabricated quotes and cross-site mutations are rejected', async t => {
  const { request } = await fixture(t);
  for (const quantity of [undefined, 0, 2, '1', -1]) {
    const result = await request('/api/quote', { productId: 'demo-double-beef', storeCode: 'demo-camp', quantity });
    assert.equal(result.status, 400);
  }
  assert.equal((await request('/api/stores?city=上海')).status, 400);
  assert.equal((await request('/api/orders', confirm('fabricated'))).status, 404);
  assert.equal((await request('/api/order-status?quoteId=fabricated')).status, 404);
  assert.equal((await request('/api/quote', {}, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await request('/api/quote', { productId: 'missing', storeCode: 'demo-camp', quantity: 1 })).status, 404);
});

test('expired quotes and take ways absent from the quote never reach creation', async t => {
  let now = 1000;
  let calls = 0;
  const adapter = new DemoAdapter();
  adapter.createOrder = async () => { calls++; throw new Error('must not call'); };
  const { request, quote } = await fixture(t, { adapter, now: () => now, quoteTtlMs: 1000 });
  const priced = await quote();
  assert.equal((await request('/api/orders', { ...confirm(priced.quoteId), takeWayCode: 'invented' })).status, 400);
  now = 2001;
  assert.equal((await request('/api/orders', confirm(priced.quoteId))).status, 410);
  assert.equal(calls, 0);
});

test('concurrent confirmations and repeated request IDs resolve to one completed order', async t => {
  let calls = 0;
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const adapter: Adapter = Object.assign(new DemoAdapter(), {
    createOrder: async () => { calls++; entered(); await gate; return { mode: 'demo', status: 'demo', orderId: 'MOCK-ONE' } as Order; },
  });
  const { request, quote } = await fixture(t, { adapter });
  const priced = await quote();
  const first = request('/api/orders', confirm(priced.quoteId));
  await ready;
  const second = request('/api/orders', confirm(priced.quoteId, 'request-two'));
  // Keep the upstream call pending until both HTTP handlers have had a turn.
  await new Promise(resolve => setTimeout(resolve, 30));
  release();
  const results = await Promise.all([first, second]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[0].body.orderId, 'MOCK-ONE');
  assert.equal(calls, 1);
  assert.deepEqual(await request('/api/orders', confirm(priced.quoteId, 'request-three')), results[0]);
  const another = await quote();
  assert.equal((await request('/api/orders', confirm(another.quoteId))).status, 409);
  assert.equal(calls, 1);
});

test('uncertain upstream result is saved before creation and never retried after restart', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mcd-ledger-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const ledgerPath = join(directory, 'orders.json');
  let calls = 0;
  const adapter: Adapter = Object.assign(new DemoAdapter(), {
    createOrder: async () => {
      calls++;
      const entries = JSON.parse(await readFile(ledgerPath, 'utf8'));
      assert.equal(entries[0].order.status, 'unknown');
      throw new Error('simulated response loss');
    },
  });
  const original = await fixture(t, { adapter, ledgerPath });
  const priced = await original.quote();
  const unknown = await original.request('/api/orders', confirm(priced.quoteId));
  assert.equal(unknown.body.status, 'unknown');
  assert.deepEqual(await original.request('/api/orders', confirm(priced.quoteId)), unknown);
  const restarted = await fixture(t, { adapter, ledgerPath });
  assert.deepEqual(await restarted.request('/api/orders', confirm(priced.quoteId, 'after-restart')), unknown);
  assert.deepEqual((await restarted.request(`/api/order-status?quoteId=${priced.quoteId}`)).body, unknown.body);
  assert.equal(calls, 1);
});

test('corrupt ledgers fail startup instead of losing duplicate-order protection', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mcd-corrupt-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const ledgerPath = join(directory, 'orders.json');
  await writeFile(ledgerPath, '{broken');
  await assert.rejects(createApp({ adapter: new DemoAdapter(), ledgerPath }), /订单记录无法读取/);
});
