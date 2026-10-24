export type IngredientId =
  | 'bread' | 'beef' | 'chicken' | 'fish' | 'cheese'
  | 'lettuce' | 'tomato' | 'pickle' | 'chili' | 'fries' | 'roast-sauce';

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
  { id: 'roast-sauce', name: '烤味酱', description: '刷在鸡肉上，让炭烤的香气留在每一口里。', color: '#985c31', category: '配料' },
  { id: 'fries', name: '金脆薯条', description: '细长的金色小棍，适合在旅途中分享。', color: '#efbd58', category: '小食' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
) as Record<IngredientId, Ingredient>;

export type RecipeId = 'beef' | 'cheeseburger' | 'double-beef' | 'big-mac' | 'angus'
  | 'chicken' | 'spicy-chicken' | 'grilled-chicken' | 'fish' | 'double-fish'
  | 'nuggets' | 'wings' | 'fries' | 'cheese-sticks';
export type FoodFamily = 'beef' | 'chicken' | 'fish' | 'potato' | 'cheese';
export interface Recipe {
  id: RecipeId;
  modelVariant: RecipeId;
  name: string;
  subtitle: string;
  description: string;
  ingredients: IngredientId[];
  kind: 'burger' | 'fries' | 'snack';
  family: FoodFamily;
  quality: 'success';
  catalogTag: RecipeId;
  color: string;
}
export const COOK_DURATION = 5.6;
export const MAX_HELD = 5;
export const COLLECTION_COOLDOWN = 45_000;

function recipe(id: RecipeId, name: string, subtitle: string, description: string, family: FoodFamily,
  ingredients: IngredientId[], kind: Recipe['kind'] = 'burger'): Recipe {
  return { id, modelVariant: id, name, subtitle, description, ingredients, family, kind,
    quality: 'success', catalogTag: id, color: family === 'fish' ? '#e8ce97' : '#edbe59' };
}
export const RECIPES: Recipe[] = [
  recipe('beef', '汉堡包', '一份牛肉，简单的美味', '柔软面包夹着牛肉饼、酸黄瓜与洋葱，经典从这一口开始。', 'beef', ['bread','beef']),
  recipe('cheeseburger', '吉士汉堡包', '牛肉与芝士的相遇', '融化的芝士覆在牛肉饼上，配上酸黄瓜与松软面包。', 'beef', ['bread','beef','cheese']),
  recipe('double-beef', '双层吉士汉堡', '双层牛肉，双倍满足', '两层牛肉与芝士叠在一起，香气在面包里相遇。', 'beef', ['bread','beef','beef','cheese']),
  recipe('big-mac', '巨无霸', '双层牛肉，三层麦香', '三层芝麻面包、双层牛肉、生菜、芝士和酸黄瓜，搭配经典风味酱汁。', 'beef', ['bread','beef','beef','lettuce','pickle']),
  recipe('angus', '芝士安格斯厚牛堡', '厚牛肉与鲜番茄', '厚实牛肉搭配芝士、番茄与生菜，鲜嫩与浓郁层层交织。', 'beef', ['bread','beef','cheese','tomato']),
  recipe('chicken', '麦香鸡', '金黄酥脆，清爽麦香', '金黄鸡肉饼、细碎生菜与柔和酱汁，藏在芝麻面包之间。', 'chicken', ['bread','chicken','lettuce']),
  recipe('spicy-chicken', '麦辣鸡腿汉堡', '酥脆外衣，热烈滋味', '厚实酥嫩的鸡腿肉裹上香辣外衣，搭配生菜和芝麻面包。', 'chicken', ['bread','chicken','chili']),
  recipe('grilled-chicken', '板烧鸡腿堡', '炭烤香气，鲜嫩多汁', '烤味酱与板烧鸡腿肉相伴，配上清脆生菜与柔软面包。', 'chicken', ['bread','chicken','roast-sauce']),
  recipe('fish', '麦香鱼', '方形鱼排，温柔海风', '金黄方形鱼排与芝士、柔和鱼酱，夹在光滑松软的面包中。', 'fish', ['bread','fish','cheese']),
  recipe('double-fish', '原味双层深海鳕鱼堡', '双层鱼排，满口鲜香', '两层方形酥炸鱼排叠起，搭配芝士与鱼酱。', 'fish', ['bread','fish','fish','cheese']),
  recipe('nuggets', '麦乐鸡5块', '五块金黄，分享快乐', '五块外酥里嫩的鸡块，装下营地里的小小快乐。', 'chicken', ['chicken'], 'snack'),
  recipe('wings', '麦辣鸡翅2块', '两块香辣，酥香过瘾', '两块金红酥脆的鸡翅，带来热烈的香辣滋味。', 'chicken', ['chicken','chili'], 'snack'),
  recipe('fries', '中薯条', '金黄细长，趁热分享', '细长薯条装进红色纸盒，外脆内软，满是土豆香气。', 'potato', ['fries'], 'fries'),
  recipe('cheese-sticks', '马苏里拉拉丝芝士条', '酥脆外衣，绵长芝香', '金黄酥皮包裹柔软芝士，轻轻拉开，芝香绵延。', 'cheese', ['cheese'], 'snack'),
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(item => [item.id, item])) as Record<RecipeId, Recipe>;
export const BIG_MAC_RECIPE = RECIPE_BY_ID['big-mac'];
// Preserve earlier completed dishes, including the former all-Big-Mac version.
export const LEGACY_RECIPE_MAP: Record<string, RecipeId> = {
  'golden-cheese': 'cheeseburger', 'forest-chicken': 'chicken', 'flame-chicken': 'spicy-chicken',
  'sea-breeze': 'fish', 'camp-fries': 'fries', 'garden-burger': 'big-mac',
  'cheese-cloud': 'cheese-sticks', 'blazing-mystery': 'big-mac', 'dubious-stew': 'big-mac',
};
export const LEGACY_RECIPE_IDS = Object.keys(LEGACY_RECIPE_MAP);
export function isIngredientId(value: unknown): value is IngredientId {
  return typeof value === 'string' && Object.hasOwn(INGREDIENT_BY_ID, value);
}
export function isRecipeId(value: unknown): value is RecipeId {
  return typeof value === 'string' && Object.hasOwn(RECIPE_BY_ID, value);
}
export function resolveRecipe(ingredients: IngredientId[]): Recipe {
  if (ingredients.length < 1 || ingredients.length > MAX_HELD || !ingredients.every(isIngredientId)) {
    throw new RangeError('烹饪需要 1 至 5 份有效食材');
  }
  const count = (id: IngredientId) => ingredients.filter(value => value === id).length;
  const has = (id: IngredientId) => ingredients.includes(id);
  const meats = ingredients.filter(id => id === 'beef' || id === 'chicken' || id === 'fish');
  // Count first; the last meat added wins a tie, regardless of vegetable placement.
  const main = [...meats].reverse().sort((a, b) => count(b) - count(a))[0];
  let id: RecipeId;
  if (main === 'beef') {
    id = count('beef') >= 2 && has('lettuce') ? 'big-mac'
      : count('beef') >= 2 && has('cheese') ? 'double-beef'
      : has('cheese') && has('tomato') ? 'angus' : has('cheese') ? 'cheeseburger' : 'beef';
  } else if (main === 'fish') id = count('fish') >= 2 ? 'double-fish' : 'fish';
  else if (main === 'chicken') {
    id = has('bread') ? (has('chili') ? 'spicy-chicken' : has('roast-sauce') ? 'grilled-chicken' : 'chicken')
      : has('chili') ? 'wings' : 'nuggets';
  } else if (has('fries')) id = 'fries';
  else if (has('cheese')) id = 'cheese-sticks';
  else throw new RangeError('这锅还缺主料：加入牛肉、鸡肉、鱼肉、薯条或芝士再试试。');
  return { ...RECIPE_BY_ID[id], ingredients: [...ingredients] };
}
/** Fallbacks never cross proteins or turn a chicken snack into a burger. */
export function recipeCandidates(preferred: Recipe): RecipeId[] {
  const nearest: Record<RecipeId, RecipeId[]> = {
    beef: ['cheeseburger', 'double-beef', 'angus', 'big-mac'],
    cheeseburger: ['beef', 'double-beef', 'angus', 'big-mac'],
    'double-beef': ['big-mac', 'cheeseburger', 'angus', 'beef'],
    'big-mac': ['double-beef', 'angus', 'cheeseburger', 'beef'],
    angus: ['cheeseburger', 'big-mac', 'double-beef', 'beef'],
    chicken: ['grilled-chicken', 'spicy-chicken'],
    'spicy-chicken': ['chicken', 'grilled-chicken'],
    'grilled-chicken': ['chicken', 'spicy-chicken'],
    fish: ['double-fish'], 'double-fish': ['fish'],
    nuggets: ['wings'], wings: ['nuggets'], fries: [], 'cheese-sticks': [],
  };
  return [preferred.id, ...nearest[preferred.id]];
}
export function explainIngredients(ingredients: IngredientId[], preferred: Recipe): string {
  const meats = new Set(ingredients.filter(id => ['beef', 'chicken', 'fish'].includes(id)));
  const notes = ['按主料和风味匹配，实际餐品采用标准配方。'];
  if (meats.size > 1) notes.push('混合肉类按数量最多、并列时最后加入的肉类决定；其他肉类不会添加到实际商品。');
  if (preferred.kind === 'burger' && !ingredients.includes('bread')) notes.push('面包由营地补足。');
  return notes.join('');
}
