import { RECIPES } from '../src/game/data.js';
import { randomUUID } from 'node:crypto';
import { ApiError, type Adapter, type Product, type TrustedQuote } from './types.js';

// These are game demonstration fixtures, not a live McDonald's menu or prices.
export const DEMO_PRODUCTS: Product[] = RECIPES.map(recipe => ({
  id: `demo-${recipe.id}`, name: recipe.name, price: recipe.id === 'double-beef' ? 26 : recipe.kind === 'burger' ? 22 : 12,
  catalogTag: recipe.id,
}));
export class DemoAdapter implements Adapter {
  mode = 'demo' as const;
  async health() { return { mode: this.mode, ready: true, message: '演示模式，不会产生真实订单或扣款。' }; }
  async stores(_city: string, _keyword: string) {
    return { mode: this.mode, stores: [{ code: 'demo-camp', name: '森林营地 · 演示门店', address: '初见之森', open: true }] };
  }
  async catalog(_storeCode = '') {
    return { mode: this.mode, store: { code: 'demo-camp', name: '森林营地 · 演示门店' },
      products: DEMO_PRODUCTS.map(product => ({ ...product })), message: '餐品与价格仅用于玩法演示。' };
  }
  async quote(productId: string, storeCode: string) {
    if (storeCode !== 'demo-camp') throw new ApiError(400, '请选择演示门店。', 'INVALID_STORE');
    const catalog = await this.catalog();
    const product = catalog.products.find(item => item.id === productId);
    if (!product) throw new ApiError(404, '这份料理暂时没有可用餐品。', 'PRODUCT_UNAVAILABLE');
    return { public: { mode: this.mode, product, store: catalog.store, quantity: 1 as const,
      total: product.price!, currency: 'CNY' as const, takeWays: [{ code: 'demo-pickup', title: '营地取餐' }], configuration: '标准配方 · 一份单品' }, context: null };
  }
  async createOrder(_quote: TrustedQuote) {
    return { mode: this.mode, orderId: `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'demo' as const, message: '演示订单已完成，没有创建真实麦当劳订单，也不会扣款。' };
  }
}
