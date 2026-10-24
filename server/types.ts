import type { IngredientId, RecipeId } from '../src/game/data.js';
export type Mode = 'demo' | 'live';
export interface Store {
  code: string; name: string; address?: string; open?: boolean; hours?: string;
  reservationOptions?: { date: string; today: boolean; text: string }[];
}
export interface TakeWay { code: string; title: string; subtitle?: string }
export interface Product {
  id: string; name: string; price: number | null; catalogTag: string;
  productCode?: string; choiceCode?: string; round?: string; supportModify?: boolean;
}
export interface Catalog { mode: Mode; store: Store; products: Product[]; message?: string }
export interface CookingMatch {
  mode: Mode; recipeId: RecipeId; modelVariant: RecipeId; preferredRecipeId: RecipeId;
  product: Product; store: Store; ingredients: IngredientId[];
  explanation: string; substituted: boolean; matchedAt: string;
}
export interface Quote {
  quoteId: string; mode: Mode; product: Product; store: Store;
  quantity: 1; total: number; currency: 'CNY'; expiresAt: string;
  takeWays: TakeWay[]; configuration: string;
}
export interface Order {
  mode: Mode; orderId: string; status: 'demo' | 'created' | 'unknown';
  payUrl?: string; message?: string;
}
export interface TrustedQuote { public: Quote; context: unknown }
export interface Adapter {
  mode: Mode;
  health(): Promise<{ mode: Mode | 'unconfigured'; ready: boolean; message?: string }>;
  stores(city: string, keyword: string): Promise<{ mode: Mode; stores: Store[] }>;
  catalog(storeCode: string): Promise<Catalog>;
  quote(productId: string, storeCode: string): Promise<Omit<TrustedQuote, 'public'> & { public: Omit<Quote, 'quoteId' | 'expiresAt'> }>;
  createOrder(quote: TrustedQuote, takeWayCode: string): Promise<Order>;
  close?(): Promise<void>;
}
export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'REQUEST_FAILED') { super(message); }
}
