import { explainIngredients, isRecipeId, RECIPE_BY_ID, recipeCandidates, resolveRecipe, type IngredientId } from '../src/game/data.js';
import { ApiError, type Catalog, type CookingMatch } from './types.js';

export function matchCooking(ingredients: IngredientId[], catalog: Catalog): CookingMatch {
  const preferred = resolveRecipe(ingredients);
  const candidates = recipeCandidates(preferred);
  const product = candidates.map(id => catalog.products.find(item => item.catalogTag === id)).find(Boolean);
  if (!product || !isRecipeId(product.catalogTag)) {
    throw new ApiError(409, `暂时没有与「${preferred.name}」同类的可售餐品，请调整食材或稍后重试。`, 'NO_MATCH');
  }
  const actual = RECIPE_BY_ID[product.catalogTag];
  const substituted = actual.id !== preferred.id;
  let explanation = explainIngredients(ingredients, preferred);
  if (substituted) explanation = `暂未提供${preferred.name}，本锅改为同类的${product.name}。` + explanation;
  if (substituted && ingredients.includes('chili')) explanation += '本次替代款不保证辣味。';
  if (substituted && !ingredients.includes('chili') && (actual.id === 'wings' || actual.id === 'spicy-chicken')) explanation += '本次替代款带有辣味。';
  return { mode: catalog.mode, recipeId: actual.id, modelVariant: actual.modelVariant,
    preferredRecipeId: preferred.id, product: { ...product }, store: { ...catalog.store },
    ingredients: [...ingredients], explanation, substituted, matchedAt: new Date().toISOString() };
}
