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

export const RECIPES: Recipe[] = [
  {
    id: 'golden-cheese', name: '金色芝士牛肉堡', subtitle: '麦香与火光，刚刚好',
    description: '芝士慢慢融化，裹住炙烤牛肉。最简单的组合，也能让漫长的旅途变得温暖。',
    ingredients: ['bread', 'beef', 'cheese'], kind: 'burger', quality: 'success', catalogTag: 'cheeseburger', color: '#edbe59',
  },
  {
    id: 'double-beef', name: '双层能量堡', subtitle: '为下一座山补充勇气',
    description: '两层牛肉叠起满满的满足感。咬下这一口，再远的路也值得出发。',
    ingredients: ['bread', 'beef', 'beef', 'cheese'], kind: 'burger', quality: 'success', catalogTag: 'double-beef', color: '#d68b4d',
  },
  {
    id: 'forest-chicken', name: '森林酥鸡堡', subtitle: '一口清脆，一口酥香',
    description: '翠绿生菜托着金黄酥鸡，仿佛把林间午后的阳光一起装进了面包。',
    ingredients: ['bread', 'chicken', 'lettuce'], kind: 'burger', quality: 'success', catalogTag: 'chicken', color: '#9ebd64',
  },
  {
    id: 'flame-chicken', name: '火焰鸡肉堡', subtitle: '给味蕾点一堆小小篝火',
    description: '辣酱沿着酥鸡的纹理展开，热烈得像营地里跳动的火光。',
    ingredients: ['bread', 'chicken', 'chili'], kind: 'burger', quality: 'success', catalogTag: 'spicy-chicken', color: '#dc7650',
  },
  {
    id: 'sea-breeze', name: '海风鱼排堡', subtitle: '从溪流到远方的海',
    description: '鲜香鱼排与酸脆黄瓜相遇，清爽的滋味让人想起吹过水面的风。',
    ingredients: ['bread', 'fish', 'pickle'], kind: 'burger', quality: 'success', catalogTag: 'fish', color: '#80b8ab',
  },
  {
    id: 'camp-fries', name: '篝火金薯条', subtitle: '把金色的快乐分给朋友',
    description: '热腾腾的薯条带着微微辣意。围着篝火聊天时，总会不知不觉吃完。',
    ingredients: ['fries', 'chili'], kind: 'fries', quality: 'success', catalogTag: 'fries', color: '#f0bd61',
  },
  {
    id: 'garden-burger', name: '田园晨光堡', subtitle: '森林醒来时的味道',
    description: '面包夹着生菜与番茄，清甜又轻盈。这是只在营地里才能尝到的原创料理。',
    ingredients: ['bread', 'lettuce', 'tomato'], kind: 'burger', quality: 'success', color: '#9cb16b',
  },
  {
    id: 'cheese-cloud', name: '芝士迷雾', subtitle: '好像……放得有点多了',
    description: '浓厚的芝士盖住了一切。你试着找了找锅里的其他食材，只找到一团温暖的谜。',
    ingredients: ['fish', 'cheese', 'cheese', 'cheese', 'cheese'], kind: 'dubious', quality: 'failure', color: '#e5be6f',
  },
  {
    id: 'blazing-mystery', name: '炽热小火山', subtitle: '这份料理有自己的脾气',
    description: '一阵热气扑面而来。或许下次少放一点辣酱，锅里的东西就能看得更清楚。',
    ingredients: ['chili', 'chili', 'chili'], kind: 'dubious', quality: 'failure', color: '#c56b52',
  },
  {
    id: 'dubious-stew', name: '不可思议的料理', subtitle: '勇气可嘉，味道待考',
    description: '锅认真地完成了工作。至于这一团究竟是什么，森林里的传说还没有记载。',
    ingredients: ['fish', 'beef', 'tomato'], kind: 'dubious', quality: 'failure', color: '#9a83a4',
  },
];

const byId = Object.fromEntries(RECIPES.map((recipe) => [recipe.id, recipe])) as Record<string, Recipe>;
const key = (ingredients: readonly IngredientId[]) => [...ingredients].sort().join('|');
const exactRecipes = new Map(RECIPES.filter((recipe) => recipe.quality === 'success').map((recipe) => [key(recipe.ingredients), recipe]));

export function isIngredientId(value: unknown): value is IngredientId {
  return typeof value === 'string' && Object.hasOwn(INGREDIENT_BY_ID, value);
}

/** Recipe discovery is deterministic: order never matters, quantity always does. */
export function resolveRecipe(ingredients: IngredientId[]): Recipe {
  const counts = ingredients.reduce<Partial<Record<IngredientId, number>>>((all, id) => {
    all[id] = (all[id] ?? 0) + 1;
    return all;
  }, {});
  const exact = exactRecipes.get(key(ingredients));
  if (exact) return { ...exact, ingredients: [...ingredients] };

  const allowed = (ids: IngredientId[]) => ingredients.every((id) => ids.includes(id));
  let recipe: Recipe | undefined;

  if (ingredients.length >= 1 && ingredients.length <= MAX_HELD && ingredients.every(isIngredientId)) {
    // Each family accepts only compatible additions, so no fish/chicken mix silently becomes a beef burger.
    if (counts.bread === 1 && (counts.beef ?? 0) >= 1 && counts.cheese && allowed(['bread', 'beef', 'cheese', 'lettuce', 'tomato', 'pickle'])) {
      recipe = (counts.beef ?? 0) >= 2 ? byId['double-beef'] : byId['golden-cheese'];
    } else if (counts.bread === 1 && counts.chicken && counts.chili && allowed(['bread', 'chicken', 'chili', 'lettuce', 'tomato', 'cheese'])) {
      recipe = byId['flame-chicken'];
    } else if (counts.bread === 1 && counts.chicken && counts.lettuce && allowed(['bread', 'chicken', 'lettuce', 'tomato', 'cheese', 'pickle'])) {
      recipe = byId['forest-chicken'];
    } else if (counts.bread === 1 && counts.fish && counts.pickle && allowed(['bread', 'fish', 'pickle', 'cheese', 'lettuce'])) {
      recipe = byId['sea-breeze'];
    } else if (counts.fries && counts.chili && allowed(['fries', 'chili'])) {
      recipe = byId['camp-fries'];
    }
  }

  if (!recipe) {
    recipe = (counts.cheese ?? 0) >= 3
      ? byId['cheese-cloud']
      : (counts.chili ?? 0) >= 2
        ? byId['blazing-mystery']
        : byId['dubious-stew'];
  }

  // Keep the actual combination on the result and in the recipe journal.
  return { ...recipe, ingredients: [...ingredients] };
}
