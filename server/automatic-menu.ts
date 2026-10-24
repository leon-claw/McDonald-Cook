import type { IngredientId } from '../src/game/data.js';
import { matchCooking } from './cooking.js';
import { ApiError, type Adapter, type Store } from './types.js';

/** Pick an open restaurant without adding a location step to the game. */
export function automaticMenu(adapter: Adapter, search: { city: string; keyword: string }, now = Date.now) {
  let cached: { stores: Store[]; expiresAt: number } | undefined;
  let searching: Promise<Store[]> | undefined;
  async function candidates() {
    if (cached && cached.expiresAt > now()) return cached.stores;
    if (!searching) {
      searching = adapter.stores(search.city, search.keyword).then(result => {
        const stores = result.stores.filter(store => store.open === true).slice(0, 3);
        if (!stores.length) throw new ApiError(503, '餐品菜单暂时不可用，请稍后重新烹饪。', 'NO_OPEN_STORE');
        cached = { stores, expiresAt: now() + 10 * 60 * 1000 };
        return stores;
      }).finally(() => { searching = undefined; });
    }
    return searching;
  }
  return async (ingredients: IngredientId[]) => {
    const stores = await candidates();
    let hasMenu = false;
    for (const store of stores) {
      try {
        const catalog = await adapter.catalog(store.code);
        hasMenu = true;
        const result = matchCooking(ingredients, catalog);
        // Prefer the working restaurant on subsequent cooks. Each result carries
        // its own restaurant, so later quotes never depend on this shared cache.
        if (cached?.stores === stores && stores[0].code !== store.code) {
          cached.stores = [store, ...stores.filter(item => item.code !== store.code)];
        }
        return result;
      } catch { /* Try the next open restaurant without interrupting the player. */ }
    }
    cached = undefined;
    throw new ApiError(hasMenu ? 409 : 503,
      hasMenu ? '暂时没有与这些食材对应的餐品，请调整食材或稍后重试。' : '餐品菜单暂时不可用，请稍后重新烹饪。',
      hasMenu ? 'NO_MATCH' : 'MENU_UNAVAILABLE');
  };
}
