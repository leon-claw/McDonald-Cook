import assert from 'node:assert/strict';
import test from 'node:test';
import { COOK_DURATION, COLLECTION_COOLDOWN, INGREDIENTS, RECIPES, resolveRecipe } from '../src/game/data';
import type { IngredientId } from '../src/game/data';
import { matchCooking } from '../server/cooking';
import { DemoAdapter } from '../server/demo';
import type { CookingMatch } from '../server/types';
import { createGameStore, SAVE_KEY } from '../src/game/store';

function setup(raw?: string) {
  const saved = new Map<string, string>(raw ? [[SAVE_KEY, raw]] : []);
  const sounds: string[] = [];
  let stopped = 0;
  let time = 1000;
  let wallTime = Date.parse('2026-10-24T10:00:00Z');
  const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); }, removeItem: (key: string) => { saved.delete(key); } };
  const options = { match: async (ingredients: IngredientId[]) => matchCooking(ingredients, await new DemoAdapter().catalog()), storage, now: () => time, wallNow: () => wallTime, audio: { init: () => undefined, play: (name: string) => { sounds.push(name); }, enabled: () => undefined, stop: () => { stopped += 1; } } };
  const store = createGameStore(options);
  return { store, saved, sounds, options, stopCount: () => stopped, advance: (ms: number) => { time += ms; wallTime += ms; } };
}

function hold(store: ReturnType<typeof createGameStore>, ingredients: IngredientId[]) {
  store.getState().openPanel('inventory');
  ingredients.forEach((id) => store.getState().selectIngredient(id));
  store.getState().closePanel();
}

async function cook(store: ReturnType<typeof createGameStore>, ingredients: IngredientId[]) {
  hold(store, ingredients);
  store.getState().setNearby({ kind: 'pot', label: '料理锅' });
  await store.getState().startCooking();
}

test('all fourteen canonical recipes resolve to their matching dish and preserve ingredients', async () => {
  for (const recipe of RECIPES) {
    const result = resolveRecipe(recipe.ingredients);
    assert.equal(result.id, recipe.id);
    assert.equal(result.modelVariant, recipe.id);
    assert.equal(result.catalogTag, recipe.id);
    assert.deepEqual(result.ingredients, recipe.ingredients);
    assert.notEqual(result.ingredients, recipe.ingredients);
  }
  assert.equal(resolveRecipe(['beef', 'fish']).id, 'fish');
  assert.equal(resolveRecipe(['fish', 'beef']).id, 'beef');
  assert.equal(resolveRecipe(['beef', 'fish', 'beef']).id, 'beef');
  assert.equal(resolveRecipe(['chicken', 'bread', 'roast-sauce', 'chili']).id, 'spicy-chicken');
  assert.equal(resolveRecipe(['beef', 'beef', 'cheese', 'lettuce']).id, 'big-mac');
  assert.equal(resolveRecipe(['fish', 'fish']).id, 'double-fish');
  assert.equal(resolveRecipe(['cheese', 'fries']).id, 'fries');
  assert.throws(() => resolveRecipe(['bread', 'lettuce', 'tomato']), /缺主料/);
});

test('invalid selections cannot resolve to a cooked burger', async () => {
  for (const ingredients of [[], Array(6).fill('bread'), ['unknown']] as IngredientId[][]) {
    assert.throws(() => resolveRecipe(ingredients), RangeError);
  }
});

test('holding reserves owned inventory, caps at five, and never consumes it before cooking', async () => {
  const { store } = setup();
  store.getState().startGame();
  store.getState().openPanel('inventory');
  store.getState().selectIngredient('bread');
  store.getState().selectIngredient('bread');
  store.getState().selectIngredient('bread');
  store.getState().selectIngredient('fish');
  assert.deepEqual(store.getState().held, ['bread', 'bread']);
  assert.equal(store.getState().inventory.bread, 2);
  store.getState().selectIngredient('beef');
  store.getState().selectIngredient('beef');
  store.getState().selectIngredient('cheese');
  store.getState().selectIngredient('cheese');
  assert.equal(store.getState().held.length, 5);
  store.getState().removeHeld(0);
  store.getState().selectIngredient('cheese');
  assert.equal(store.getState().held.length, 5);
  store.getState().clearHeld();
  assert.deepEqual(store.getState().held, []);
  assert.equal(store.getState().inventory.bread, 2);
});

test('cooking requires held ingredients at the pot, consumes once, and reveals only when the animation finishes', async () => {
  const { store, advance, sounds } = setup();
  store.getState().startGame();
  store.getState().setNearby({ kind: 'pot', label: '锅' });
  store.getState().startCooking();
  assert.equal(store.getState().phase, 'explore');
  store.getState().setNearby(null);
  hold(store, ['bread', 'beef', 'cheese']);
  store.getState().startCooking();
  assert.equal(store.getState().phase, 'explore');
  store.getState().setNearby({ kind: 'pot', label: '锅' });
  await store.getState().startCooking();
  await store.getState().startCooking();
  assert.equal(store.getState().phase, 'cooking');
  assert.equal(store.getState().inventory.bread, 1);
  assert.deepEqual(store.getState().held, []);
  assert.equal(sounds.filter((name) => name === 'cook').length, 1);
  store.getState().openPanel('inventory');
  assert.equal(store.getState().panel, null);
  store.getState().finishCooking();
  assert.equal(store.getState().phase, 'cooking');
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  store.getState().finishCooking();
  assert.equal(store.getState().phase, 'result');
  assert.equal(store.getState().result?.id, 'cheeseburger');
  assert.equal(store.getState().totalCooked, 1);
  assert.equal(store.getState().discoveries['cheeseburger']?.count, 1);
  assert.equal(store.getState().isNewRecipe, true);
  assert.equal(sounds.filter((name) => name === 'discovery').length, 1);
});

test('collection cooldown prevents held interaction from duplicating a spawn and permits refill later', async () => {
  const { store, advance } = setup();
  store.getState().startGame();
  const target = { kind: 'ingredient' as const, label: '鱼排', ingredientId: 'fish' as const, spawnId: 'fish-1' };
  store.getState().setNearby(target);
  store.getState().interact();
  assert.equal(store.getState().inventory.fish, 2);
  store.getState().setNearby(target);
  store.getState().interact();
  assert.equal(store.getState().inventory.fish, 2);
  advance(COLLECTION_COOLDOWN);
  store.getState().interact();
  assert.equal(store.getState().inventory.fish, 4);
});

test('voices follow held food and every combination plays discovery or success', async () => {
  const { store, sounds, advance, stopCount } = setup();
  store.getState().startGame();
  store.getState().openPanel('inventory');
  store.getState().closePanel();
  assert.equal(sounds.includes('hold'), false);
  await cook(store, ['bread', 'beef', 'cheese']);
  assert.equal(sounds.filter(name => name === 'hold').length, 1);
  assert.equal(stopCount(), 1);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(sounds.at(-1), 'discovery');
  assert.equal(stopCount(), 2);
  store.getState().dismissResult();
  assert.equal(stopCount(), 3);
  await cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(sounds.at(-1), 'success');
  store.getState().dismissResult();
  store.getState().setNearby({ kind: 'ingredient', label: '鱼排', ingredientId: 'fish', spawnId: 'fish-audio' });
  store.getState().interact();
  await cook(store, ['fish']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(sounds.at(-1), 'discovery');
  assert.equal(sounds.includes('failure'), false);
  assert.equal(store.getState().result?.name, '麦香鱼');
});

test('muted play still completes cooking and emits no cues until sound is enabled', async () => {
  const { store, sounds, advance } = setup();
  store.getState().setSoundEnabled(false);
  store.getState().startGame();
  await cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(store.getState().phase, 'result');
  assert.deepEqual(sounds, []);
  store.getState().setSoundEnabled(true);
  assert.deepEqual(sounds, ['click']);
});

test('completed progress survives reload and an interrupted animation does not lose food', async () => {
  const { store, options, advance } = setup();
  store.getState().startGame();
  await cook(store, ['bread', 'beef', 'cheese']);
  const interrupted = createGameStore(options);
  assert.equal(interrupted.getState().phase, 'title');
  assert.equal(interrupted.getState().inventory.bread, 2);
  assert.equal(interrupted.getState().totalCooked, 0);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  const restored = createGameStore(options);
  assert.equal(restored.getState().phase, 'title');
  assert.equal(restored.getState().inventory.bread, 1);
  assert.equal(restored.getState().totalCooked, 1);
  assert.equal(restored.getState().discoveries['cheeseburger']?.count, 1);
  assert.deepEqual(restored.getState().held, []);

  store.getState().dismissResult();
  await cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(store.getState().isNewRecipe, false);
  assert.equal(store.getState().discoveries['cheeseburger']?.count, 2);
  assert.equal(store.getState().totalCooked, 2);
});

test('legacy recipes merge into the burger journal without losing inventory or completed counts', async () => {
  const legacy = {
    version: 1, inventory: { bread: 5, beef: 2, cheese: 3, fish: 1 }, totalCooked: 6, soundEnabled: false,
    discoveries: {
      'golden-cheese': { at: '2026-10-24T10:00:00Z', ingredients: ['bread', 'beef', 'cheese'], count: 2 },
      'dubious-stew': { at: '2026-10-24T09:00:00Z', ingredients: ['fish'], count: 3 },
      'big-mac': { at: '2026-10-24T11:00:00Z', ingredients: ['cheese'], count: 1 },
    },
  };
  const { store, options } = setup(JSON.stringify(legacy));
  assert.equal(store.getState().inventory.bread, 5);
  assert.equal(store.getState().inventory.fish, 1);
  assert.equal(store.getState().soundEnabled, false);
  assert.equal(store.getState().totalCooked, 6);
  assert.deepEqual(store.getState().discoveries, {
    'big-mac': { at: '2026-10-24T09:00:00Z', ingredients: ['fish'], count: 4 },
    'cheeseburger': { at: '2026-10-24T10:00:00Z', ingredients: ['bread','beef','cheese'], count: 2 },
  });
  store.getState().setSoundEnabled(true);
  const restored = createGameStore(options);
  assert.equal(restored.getState().totalCooked, 6);
  assert.equal(restored.getState().discoveries['big-mac'].count, 4);
  assert.equal(restored.getState().inventory.cheese, 3);
});

test('invalid or tampered storage is bounded and discarded without breaking startup', async () => {
  assert.equal(setup('{broken-json').store.getState().inventory.bread, 2);
  const saved = { version: 1, inventory: { bread: -12, cheese: 99999999, beef: 'Infinity', fish: 1.7 }, discoveries: { 'big-mac': { at: 'bad-date', ingredients: ['bread', 'beef', 'cheese'], count: 5 }, 'unknown-recipe': { at: '2026-10-24', ingredients: ['fish'], count: 2 } }, totalCooked: 1000, soundEnabled: false };
  const { store } = setup(JSON.stringify(saved));
  assert.equal(store.getState().inventory.bread, 0);
  assert.equal(store.getState().inventory.cheese, 999);
  assert.equal(store.getState().inventory.beef, 0);
  assert.equal(store.getState().inventory.fish, 1);
  assert.equal(store.getState().totalCooked, 0);
  assert.deepEqual(store.getState().discoveries, {});
  assert.equal(store.getState().soundEnabled, false);
});

test('blocked storage never blocks completing a meal', async () => {
  let time = 0;
  const store = createGameStore({ match: async ingredients => matchCooking(ingredients, await new DemoAdapter().catalog()), storage: { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined }, now: () => time, audio: { init: () => undefined, play: () => undefined, enabled: () => undefined } });
  store.getState().startGame();
  await cook(store, ['bread', 'beef', 'cheese']);
  time = COOK_DURATION * 1000;
  assert.doesNotThrow(() => store.getState().finishCooking());
  assert.equal(store.getState().totalCooked, 1);
});

test('a reset returns a fresh playable title and clears persisted discoveries', async () => {
  const { store, advance, options } = setup();
  store.getState().startGame();
  await cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  store.getState().resetProgress();
  assert.equal(store.getState().phase, 'title');
  assert.equal(store.getState().inventory.bread, 2);
  assert.equal(store.getState().totalCooked, 0);
  assert.deepEqual(createGameStore(options).getState().discoveries, {});
});


test('missing main ingredient preserves food; valid cooking starts without a restaurant picker', async () => {
  const { store } = setup();
  store.getState().startGame();
  await cook(store, ['bread']);
  assert.equal(store.getState().phase, 'explore');
  assert.equal(store.getState().inventory.bread, 2);
  store.getState().clearHeld();
  await cook(store, ['bread', 'beef']);
  assert.equal(store.getState().panel, null);
  assert.equal(store.getState().phase, 'cooking');
  assert.equal(store.getState().result?.id, 'beef');
  assert.equal(store.getState().inventory.beef, 1);
});

test('late menu response delays reveal and finish; cancellation returns food and ignores stale replies', async () => {
  const { options, advance } = setup();
  let release!: (value: CookingMatch) => void;
  const store = createGameStore({ ...options, match: () => new Promise(resolve => { release = resolve; }) });
  store.getState().startGame();
  const work = cook(store, ['bread', 'beef']);
  advance(10_000); store.getState().finishCooking();
  assert.equal(store.getState().phase, 'cooking'); assert.equal(store.getState().result, null);
  release(matchCooking(['bread','beef'], await new DemoAdapter().catalog())); await work;
  store.getState().finishCooking(); assert.equal(store.getState().phase, 'cooking');
  advance(1250); store.getState().finishCooking(); assert.equal(store.getState().result?.id, 'beef');
  store.getState().dismissResult();
  const canceled = cook(store, ['bread','beef']); store.getState().cancelCooking();
  assert.equal(store.getState().inventory.beef, 1); assert.equal(store.getState().phase, 'explore');
  release(matchCooking(['bread','beef'], await new DemoAdapter().catalog())); await canceled;
  assert.equal(store.getState().result, null); assert.equal(store.getState().totalCooked, 1);
});

test('network failure refunds ingredients and reset invalidates a pending match', async () => {
  const { options } = setup();
  const store = createGameStore({ ...options, match: async () => { throw new Error('菜单暂不可用'); } });
  store.getState().startGame();
  await cook(store, ['bread','beef']);
  assert.equal(store.getState().inventory.beef, 2); assert.equal(store.getState().panel, 'cook-error');
  assert.deepEqual(store.getState().held, ['bread','beef']); assert.equal(store.getState().totalCooked, 0);
  let release!: (value: CookingMatch) => void;
  const pending = createGameStore({ ...options, match: () => new Promise(resolve => { release = resolve; }) });
  pending.getState().startGame();
  const work = cook(pending,['bread','beef']); pending.getState().resetProgress();
  release(matchCooking(['bread','beef'],await new DemoAdapter().catalog())); await work;
  assert.equal(pending.getState().phase,'title'); assert.equal(pending.getState().inventory.beef,2);
  assert.equal(pending.getState().result,null);
});
