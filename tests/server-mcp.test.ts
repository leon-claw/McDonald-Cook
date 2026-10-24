import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { McpAdapter, atPath, materialize } from '../server/mcp.js';
import { parseToolResult, parseStores, parseTakeWays, standardItem } from '../server/mcd-data.js';
import type { TrustedQuote } from '../server/types.js';

const detail = { data: { code: '1120', name: '双层吉士汉堡', rounds: [], supportModify: true,
  modification: { items: [{ values: [
    { code: 'cheese', selectedQuantity: 1, selectedKey: 'yes', unselectedKey: 'no' },
    { code: 'extra', selectedQuantity: 0, selectedKey: 'yes', unselectedKey: 'no' },
    { code: 'optional', selectedQuantity: 0, selectedKey: 'yes', unselectedKey: '' },
  ] }] } } };
const expectedItems = [{ productCode: '1120', quantity: 1, modification: { values: [
  { code: 'cheese', key: 'yes', quantity: 1 }, { code: 'extra', key: 'no', quantity: 0 },
] } }];

test('MCP response envelopes reject SDK errors, business failures and malformed JSON', () => {
  const envelope = { success: true, code: 200, data: {} };
  assert.deepEqual(parseToolResult({ structuredContent: envelope }), envelope);
  assert.deepEqual(parseToolResult({ content: [{ type: 'text', text: JSON.stringify(envelope) }] }), envelope);
  for (const result of [{ isError: true }, { structuredContent: { success: false, code: 200 } },
    { structuredContent: { code: 403 } }, { content: [{ type: 'text', text: 'not JSON' }] }]) {
    assert.throws(() => parseToolResult(result));
  }
});

test('standard configuration preserves selected and required unselected modifications', () => {
  assert.deepEqual(standardItem(detail, '1120').item, expectedItems[0]);
  assert.throws(() => standardItem({ data: { ...detail.data, rounds: [{}] } }, '1120'), /需要选配/);
  assert.throws(() => standardItem(detail, 'different'), /不一致/);
  const invalid = structuredClone(detail);
  invalid.data.modification.items[0].values[0].selectedQuantity = -1;
  assert.throws(() => standardItem(invalid, '1120'), /默认配方不完整/);
});

test('store hours, all reservation dates and returned take ways are retained', () => {
  const stores = parseStores({ data: [{ storeCode: 'store-one', storeName: '测试门店', address: '测试地址',
    businessStatus: true, businessStartTime: '07:00', businessEndTime: '23:00',
    reservationTimeOptions: [
      { date: '2026-10-24', today: true, reservationOptionText: '立即取餐' },
      { date: '2026-10-25', today: false, reservationOptionText: '07:00–23:00' },
    ] }] });
  assert.equal(stores[0].open, true);
  assert.equal(stores[0].hours, '07:00–23:00');
  assert.equal(stores[0].reservationOptions?.length, 2);
  assert.deepEqual(parseTakeWays([{ code: 'eat-in', title: '堂食' }]), [{ code: 'eat-in', title: '堂食', subtitle: undefined }]);
  assert.throws(() => parseTakeWays([]));
});

test('mapping references preserve structured values and block prototype paths', () => {
  assert.deepEqual(materialize({ items: { $ref: 'items' }, orderType: 1 }, { items: expectedItems }), { items: expectedItems, orderType: 1 });
  assert.equal(atPath({}, 'constructor.prototype'), undefined);
  assert.throws(() => materialize({ $ref: 'missing' }, {}));
});

// Implements the SDK wire protocol in memory. No request can reach McDonald's.
function mockMcp(overrides: Record<string, unknown> = {}) {
  const calls: { name: string; arguments: Record<string, unknown> }[] = [];
  const names = ['query-nearby-stores', 'query-meals', 'query-meal-detail', 'calculate-price', 'create-order'];
  const responses: Record<string, unknown> = {
    'query-nearby-stores': { data: [{ storeCode: 'store-one', storeName: '测试门店', address: '测试地址', businessStatus: true,
      businessStartTime: '07:00', businessEndTime: '23:00', reservationTimeOptions: [] }] },
    'query-meals': { data: { categories: [{ meals: [{ code: '1120' }] }], meals: {
      '1120': { name: '双层吉士汉堡', currentPrice: '23' },
      '4810': { name: '未上架薯条', currentPrice: '12' },
    } } },
    'query-meal-detail': detail,
    'calculate-price': { data: { price: 2300, productList: [{ productCode: '1120', quantity: 1 }], takeWayList: [{ code: 'eat-in', title: '堂食' }] } },
    'create-order': { data: { orderId: 'MOCK-ORDER', payH5Url: 'https://example.test/pay' } },
    ...overrides,
  };
  const mockFetch: typeof fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fake-test-token');
    if (init?.method === 'GET') return new Response(null, { status: 405 });
    const message = JSON.parse(String(init?.body));
    if (!('id' in message)) return new Response(null, { status: 202 });
    let result: unknown;
    if (message.method === 'initialize') result = { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'mock', version: '1' } };
    else if (message.method === 'tools/list') result = { tools: names.map(name => ({ name, inputSchema: {
      type: 'object', properties: { beType: { const: 1 }, orderType: { const: 1 } },
      required: name === 'query-nearby-stores' ? ['beType', 'city', 'keyword'] : ['storeCode', 'orderType', 'beType'],
    } })) };
    else if (message.method === 'tools/call') {
      calls.push(message.params);
      result = { content: [], structuredContent: { success: true, code: 200, ...responses[message.params.name] as object } };
    } else throw new Error(`Unexpected SDK call: ${message.method}`);
    return Response.json({ jsonrpc: '2.0', id: message.id, result });
  };
  return { calls, adapter: new McpAdapter({ url: 'https://example.test/mcp', token: 'fake-test-token',
    mappingPath: resolve('server/mcp.mapping.json'), fetch: mockFetch }) };
}

test('official mapping works through SDK discovery, menu objects, pricing and mocked creation', async t => {
  const { adapter, calls } = mockMcp();
  t.after(() => adapter.close());
  assert.equal((await adapter.health()).ready, true);
  await assert.rejects(adapter.catalog('unverified-store'), /先搜索/);
  await adapter.stores('测试城市', '测试地标');
  const catalog = await adapter.catalog('store-one');
  assert.deepEqual(catalog.products.map(item => item.id), ['1120']);
  assert.equal(catalog.products[0].price, 23);
  const quoted = await adapter.quote('1120', 'store-one');
  assert.equal(quoted.public.total, 23);
  const trusted: TrustedQuote = { ...quoted, public: { ...quoted.public, quoteId: 'test', expiresAt: '2099-01-01' } };
  await assert.rejects(adapter.createOrder(trusted, 'invented'), /取餐方式/);
  assert.equal(calls.filter(call => call.name === 'create-order').length, 0);
  const order = await adapter.createOrder(trusted, 'eat-in');
  assert.equal(order.orderId, 'MOCK-ORDER');
  for (const name of ['calculate-price', 'create-order']) {
    const args = calls.find(call => call.name === name)!.arguments;
    assert.deepEqual(args.items, expectedItems);
    assert.equal(args.beType, 1);
    assert.equal(args.orderType, 1);
    assert.equal(args.beCode, undefined);
    assert.equal(args.reservationDate, undefined);
  }
  assert.equal(calls.find(call => call.name === 'create-order')!.arguments.takeWayCode, 'eat-in');
});

test('pricing cannot silently substitute a different product', async t => {
  const { adapter } = mockMcp({ 'calculate-price': { data: { price: 2300, productList: [{ productCode: '4810', quantity: 1 }] } } });
  t.after(() => adapter.close());
  await adapter.stores('测试城市', '测试地标');
  await assert.rejects(adapter.quote('1120', 'store-one'), /不一致/);
});
