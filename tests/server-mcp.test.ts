import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { RECIPES } from '../src/game/data.js';
import { matchCooking } from '../server/cooking.js';
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
    'query-meal-detail': (args: Record<string, unknown>) => args.code === 'big-mac-fixture' ? { data: { code: args.code, name: '巨无霸', rounds: [] } } : detail,
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
      const response = responses[message.params.name];
      const value = typeof response === 'function' ? response(message.params.arguments) : response;
      result = { content: [], structuredContent: { success: true, code: 200, ...value as object } };
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

test('Big Mac catalog mapping matches its exact name without substituting another burger or a meal', async t => {
  const { adapter, calls } = mockMcp({ 'query-meals': { data: {
    categories: [{ meals: [{ code: 'big-mac-fixture' }, { code: '1120' }, { code: 'meal-fixture' }] }],
    meals: {
      'big-mac-fixture': { name: '巨无霸', currentPrice: '26' },
      '1120': { name: '双层吉士汉堡', currentPrice: '23' },
      'meal-fixture': { name: '巨无霸套餐', currentPrice: '40' },
    },
  } } });
  t.after(() => adapter.close());
  await adapter.stores('测试城市', '测试地标');
  const catalog = await adapter.catalog('store-one');
  assert.deepEqual(catalog.products.filter(product => product.catalogTag === 'big-mac'), [
    { id: 'big-mac-fixture', productCode: 'big-mac-fixture', name: '巨无霸', price: 26, catalogTag: 'big-mac', supportModify: false },
  ]);
  assert.equal(catalog.products.find(product => product.id === '1120')?.catalogTag, 'double-beef');
  assert.equal(catalog.products.some(product => product.id === 'meal-fixture'), false);
  assert.equal(calls.some(call => call.name === 'create-order'), false);
});


test('all researched variants match, quote and retain explicit parent/child selections', async t => {
  const research = JSON.parse(await readFile(resolve('docs/research/mcd-menu-2026-10-24.json'), 'utf8'));
  function hydrate(value: Record<string, any>): Record<string, any> {
    return { ...value, modification: { items: [{ values: value.defaultOptions.map((option: any) => ({
      code: option.code, selectedQuantity: option.defaultQuantity, selectedKey: '0-1', unselectedKey: '0-0',
      minQuantity: option.minQuantity, maxQuantity: option.maxQuantity,
    })) }] }, ...(value.rounds ? { rounds: value.rounds.map((round: any) => ({ ...round, choices: round.choices.map(hydrate) })) } : {}) };
  }
  const details = new Map<string, Record<string, any>>(research.details.map((value: any) => [value.code, hydrate(value)]));
  const { adapter, calls } = mockMcp({
    'query-meals': { data: { categories: [{ meals: [...details.keys()].map(code => ({ code })) }],
      meals: Object.fromEntries([...details].map(([code, value]) => [code, { name: value.name, currentPrice: '20' }])) } },
    'query-meal-detail': (args: Record<string, unknown>) => ({ data: details.get(String(args.code)) }),
    'calculate-price': (args: Record<string, any>) => ({ data: { price: 2000,
      productList: args.items.map((item: any) => ({ productCode: item.productCode, quantity: 1, roundList: item.roundList })),
      takeWayList: [{ code: 'eat-in', title: '堂食' }] } }),
  });
  t.after(() => adapter.close());
  await adapter.stores('上海', '测试地标');
  const catalog = await adapter.catalog('store-one');
  assert.equal(catalog.products.length, 14);
  for (const recipe of RECIPES) {
    const matched = matchCooking(recipe.ingredients, catalog);
    assert.equal(matched.recipeId, recipe.id);
    assert.equal(matched.modelVariant, recipe.id);
    const quoted = await adapter.quote(matched.product.id, 'store-one');
    assert.equal(quoted.public.product.name, matched.product.name);
    assert.equal(quoted.public.product.catalogTag, recipe.id);
    const items = (quoted.context as { items: any[] }).items;
    if (['beef', 'cheeseburger', 'double-fish'].includes(recipe.id)) {
      assert.equal(items[0].productCode, recipe.id === 'double-fish' ? '9900003586' : '9900008747');
      assert.equal(items[0].roundList[0].round, '1');
      const choices: Partial<Record<typeof recipe.id, string>> = { beef: '1000', cheeseburger: '1010', 'double-fish': '520312' };
      assert.equal(items[0].roundList[0].comboItemList[0].code, choices[recipe.id]);
      assert.ok(items[0].roundList[0].comboItemList[0].modification.values.length > 0);
    }
  }
  assert.equal(calls.some(call => call.name === 'create-order'), false);
  await assert.rejects(adapter.quote('1010', 'store-one'), /不可售/);
  assert.throws(() => standardItem({ data: details.get('9900008747') }, '9900008747', { round:'1',code:'invented' }), /不可用/);
});

test('fallback stays in the ingredient family and reports lost spice or missing layers', () => {
  const base = { mode: 'live' as const, store: { code: 'test', name: '测试' } };
  const fish = { id: '1600', name: '麦香鱼', catalogTag: 'fish', price: 20 };
  const matched = matchCooking(['fish','fish'], { ...base, products: [fish] });
  assert.equal(matched.recipeId, 'fish'); assert.equal(matched.modelVariant, 'fish');
  assert.equal(matched.substituted, true); assert.match(matched.explanation, /改为/);
  assert.throws(() => matchCooking(['beef'], { ...base, products: [fish] }), /没有/);
  assert.throws(() => matchCooking(['chicken'], { ...base, products: [{ id:'1450',name:'麦香鸡',catalogTag:'chicken',price:20 }] }), /没有/);
  const mild = matchCooking(['chicken','bread','chili'], { ...base, products: [{ id:'1450',name:'麦香鸡',catalogTag:'chicken',price:20 }] });
  assert.match(mild.explanation, /不保证辣味/);
  const double = matchCooking(['beef','beef','lettuce'], { ...base, products: [
    { id:'1000',name:'汉堡包',catalogTag:'beef',price:14 },
    { id:'1120',name:'双层吉士汉堡',catalogTag:'double-beef',price:23 },
  ] });
  assert.equal(double.recipeId, 'double-beef');
  const spicy = matchCooking(['chicken'], { ...base, products: [{ id:'1700',name:'麦辣鸡翅2块',catalogTag:'wings',price:15 }] });
  assert.match(spicy.explanation, /带有辣味/);
});
