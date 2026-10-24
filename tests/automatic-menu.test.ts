import assert from 'node:assert/strict';
import test from 'node:test';
import { automaticMenu } from '../server/automatic-menu.js';
import { DemoAdapter } from '../server/demo.js';
import { ApiError, type Adapter, type Store } from '../server/types.js';

const search = { city: '上海', keyword: '人民广场' };
const sample = (await new DemoAdapter().catalog()).products;
function fixture(stores: Store[], menu: (code: string) => typeof sample | Promise<typeof sample> = () => sample) {
  const searches: string[][] = [], menus: string[] = [];
  const adapter: Adapter = {
    mode: 'live', health: async () => ({ mode: 'live', ready: true }),
    stores: async (city, keyword) => { searches.push([city, keyword]); return { mode: 'live', stores }; },
    catalog: async code => { menus.push(code); return { mode: 'live', store: { code, name: code }, products: await menu(code) }; },
    quote: async () => { throw new Error('Unexpected quote'); },
    createOrder: async () => { throw new Error('Unexpected real order'); },
  };
  return { adapter, searches, menus };
}
const open = (code: string) => ({ code, name: code, open: true });

test('automatic cooking skips closed/unknown stores, coalesces searches and refreshes expired candidates', async () => {
  const { adapter, searches, menus } = fixture([{ ...open('closed'), open: false }, { code: 'unknown', name: 'unknown' }, open('working')]);
  let time = 0;
  const match = automaticMenu(adapter, search, () => time);
  const results = await Promise.all([match(['beef']), match(['fish'])]);
  assert.equal(searches.length, 1); assert.deepEqual(searches[0], ['上海', '人民广场']);
  assert.deepEqual(menus, ['working', 'working']);
  assert.equal(results[0].store.code, 'working'); assert.equal(results[1].recipeId, 'fish');
  time = 10 * 60 * 1000;
  await match(['beef']); assert.equal(searches.length, 2);
});

test('automatic cooking retries unavailable menus and keeps the working restaurant for later cooks', async () => {
  const { adapter, menus } = fixture([open('failed'), open('empty'), open('working')], code => {
    if (code === 'failed') throw new Error('Network unavailable');
    return code === 'empty' ? [] : sample;
  });
  const match = automaticMenu(adapter, search);
  const cooked = await match(['fish']);
  assert.equal(cooked.mode, 'live'); assert.equal(cooked.store.code, 'working');
  assert.equal(cooked.recipeId, 'fish');
  await match(['beef']);
  assert.deepEqual(menus, ['failed', 'empty', 'working', 'working']);
  assert.equal(cooked.store.code, 'working');
});

test('automatic cooking never substitutes demo food when all real menus fail or no restaurant is open', async () => {
  const empty = fixture([]);
  await assert.rejects(automaticMenu(empty.adapter, search)(['beef']), (error: unknown) => error instanceof ApiError && error.code === 'NO_OPEN_STORE');
  const unavailable = fixture([open('failed')], () => { throw new Error('offline'); });
  await assert.rejects(automaticMenu(unavailable.adapter, search)(['beef']), (error: unknown) => error instanceof ApiError && error.code === 'MENU_UNAVAILABLE');
  const wrongFamily = fixture([open('fish-only')], () => sample.filter(item => item.catalogTag === 'fish'));
  await assert.rejects(automaticMenu(wrongFamily.adapter, search)(['beef']), (error: unknown) => error instanceof ApiError && error.code === 'NO_MATCH');
});
