export type IngredientId =
  | 'bread' | 'beef' | 'chicken' | 'fish' | 'cheese'
  | 'lettuce' | 'tomato' | 'pickle' | 'chili' | 'fries';

export interface Ingredient {
  id: IngredientId;
  name: string;
  description: string;
  color: string;
  category: string;
}

export const INGREDIENTS: Ingredient[] = [
  { id: 'bread', name: '芝麻面包', description: '蓬松的麦香里，藏着一场冒险的开头。', color: '#e9ad59', category: '谷物' },
  { id: 'beef', name: '厚切牛肉', description: '在篝火上滋滋作响，香气会招来森林的朋友。', color: '#915437', category: '肉类' },
  { id: 'chicken', name: '酥嫩鸡肉', description: '外皮金黄，里面还保留着鲜嫩的汁水。', color: '#dc964a', category: '肉类' },
  { id: 'fish', name: '鲜香鱼排', description: '来自溪流的礼物，适合搭配一点清爽的味道。', color: '#eac58b', category: '肉类' },
  { id: 'cheese', name: '金色芝士', description: '遇到温热的食材，就会软软地拥抱它们。', color: '#f5ca57', category: '配料' },
  { id: 'lettuce', name: '翠叶生菜', description: '带着清晨露水的脆嫩叶片。', color: '#86b65a', category: '蔬果' },
  { id: 'tomato', name: '红熟番茄', description: '阳光把它染红，也把酸甜留在了里面。', color: '#dc6650', category: '蔬果' },
  { id: 'pickle', name: '酸脆黄瓜', description: '小小的一片，能让整份料理精神起来。', color: '#7f9c49', category: '蔬果' },
  { id: 'chili', name: '火焰辣酱', description: '颜色像晚霞。尝过之后，脸颊也是。', color: '#bd5137', category: '配料' },
  { id: 'fries', name: '金脆薯条', description: '细长的金色小棍，适合在旅途中分享。', color: '#efbd58', category: '小食' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
) as Record<IngredientId, Ingredient>;

export interface Recipe {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  ingredients: IngredientId[];
  kind: 'burger' | 'fries' | 'dubious';
  quality: 'success' | 'failure';
  catalogTag?: string;
  color: string;
}

export const COOK_DURATION = 5.6;
export const MAX_HELD = 5;
export const COLLECTION_COOLDOWN = 45_000;

/** The camp's magic pot turns every valid selection into the same signature burger. */
export const BIG_MAC_RECIPE: Recipe = {
  id: 'big-mac', name: '巨无霸', subtitle: '双层牛肉，三层麦香',
  description: '金黄芝麻面包夹着双层牛肉、芝士、生菜与酸黄瓜，拌上浓郁酱汁。营地的魔法，让每一种搭配都变成这份经典汉堡。',
  ingredients: ['bread', 'beef', 'beef', 'cheese', 'lettuce'],
  kind: 'burger', quality: 'success', catalogTag: 'big-mac', color: '#edbe59',
};

export const RECIPES: Recipe[] = [BIG_MAC_RECIPE];

// Keep completed meals from the previous recipe system when loading existing saves.
export const LEGACY_RECIPE_IDS = [
  'golden-cheese', 'double-beef', 'forest-chicken', 'flame-chicken', 'sea-breeze',
  'camp-fries', 'garden-burger', 'cheese-cloud', 'blazing-mystery', 'dubious-stew',
];

export function isIngredientId(value: unknown): value is IngredientId {
  return typeof value === 'string' && Object.hasOwn(INGREDIENT_BY_ID, value);
}

export function resolveRecipe(ingredients: IngredientId[]): Recipe {
  if (ingredients.length < 1 || ingredients.length > MAX_HELD || !ingredients.every(isIngredientId)) {
    throw new RangeError('烹饪需要 1 至 5 份有效食材');
  }
  // Record the player's actual selection, including its order and repeated ingredients.
  return { ...BIG_MAC_RECIPE, ingredients: [...ingredients] };
}
