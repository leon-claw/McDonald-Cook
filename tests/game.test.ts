import assert from 'node:assert/strict';
import test from 'node:test';
import { COOK_DURATION, COLLECTION_COOLDOWN, RECIPES, resolveRecipe } from '../src/game/data';
import type { IngredientId } from '../src/game/data';
import { createGameStore, SAVE_KEY } from '../src/game/store';

function setup(raw?: string) {
  const saved = new Map<string, string>(raw ? [[SAVE_KEY, raw]] : []);
  const sounds: string[] = [];
  let stopped = 0;
  let time = 1000;
  let wallTime = Date.parse('2026-10-24T10:00:00Z');
  const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value); }, removeItem: (key: string) => { saved.delete(key); } };
  const options = { storage, now: () => time, wallNow: () => wallTime, audio: { init: () => undefined, play: (name: string) => { sounds.push(name); }, enabled: () => undefined, stop: () => { stopped += 1; } } };
  const store = createGameStore(options);
  return { store, saved, sounds, options, stopCount: () => stopped, advance: (ms: number) => { time += ms; wallTime += ms; } };
}

function hold(store: ReturnType<typeof createGameStore>, ingredients: IngredientId[]) {
  store.getState().openPanel('inventory');
  ingredients.forEach((id) => store.getState().selectIngredient(id));
  store.getState().closePanel();
}

function cook(store: ReturnType<typeof createGameStore>, ingredients: IngredientId[]) {
  hold(store, ingredients);
  store.getState().setNearby({ kind: 'pot', label: '料理锅' });
  store.getState().interact();
}

test('recipes ignore ingredient order but preserve duplicates and reject incompatible additions', () => {
  assert.equal(resolveRecipe(['bread', 'beef', 'cheese']).id, resolveRecipe(['cheese', 'beef', 'bread']).id);
  assert.equal(resolveRecipe(['bread', 'beef', 'beef', 'cheese']).id, 'double-beef');
  assert.equal(resolveRecipe(['bread', 'beef', 'cheese', 'fish']).quality, 'failure');
  assert.equal(resolveRecipe(['bread', 'beef', 'cheese', 'tomato']).id, 'golden-cheese');
  assert.deepEqual(resolveRecipe(['tomato', 'cheese', 'bread', 'beef']).ingredients, ['tomato', 'cheese', 'bread', 'beef']);
  assert.equal(resolveRecipe(['cheese', 'cheese', 'cheese']).id, 'cheese-cloud');
  assert.equal(resolveRecipe(['chili', 'chili', 'fish']).id, 'blazing-mystery');
  assert.equal(resolveRecipe(['fish']).id, 'dubious-stew');
  assert.ok(RECIPES.filter((recipe) => recipe.quality === 'success').length >= 6);
  assert.ok(RECIPES.filter((recipe) => recipe.quality === 'failure').length >= 3);
});

test('holding reserves owned inventory, caps at five, and never consumes it before cooking', () => {
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

test('cooking requires held ingredients at the pot, consumes once, and reveals only when the animation finishes', () => {
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
  store.getState().interact();
  store.getState().startCooking();
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
  assert.equal(store.getState().result?.id, 'golden-cheese');
  assert.equal(store.getState().totalCooked, 1);
  assert.equal(store.getState().discoveries['golden-cheese']?.count, 1);
  assert.equal(store.getState().isNewRecipe, true);
  assert.equal(sounds.filter((name) => name === 'discovery').length, 1);
});

test('collection cooldown prevents held interaction from duplicating a spawn and permits refill later', () => {
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

test('voices follow held food and result cues distinguish discovery, repeat, and failure', () => {
  const { store, sounds, advance, stopCount } = setup();
  store.getState().startGame();
  store.getState().openPanel('inventory');
  store.getState().closePanel();
  assert.equal(sounds.includes('hold'), false);
  cook(store, ['bread', 'beef', 'cheese']);
  assert.equal(sounds.filter(name => name === 'hold').length, 1);
  assert.equal(stopCount(), 1);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(sounds.at(-1), 'discovery');
  assert.equal(stopCount(), 2);
  store.getState().dismissResult();
  assert.equal(stopCount(), 3);
  cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(sounds.at(-1), 'success');
  store.getState().dismissResult();
  store.getState().setNearby({ kind: 'ingredient', label: '鱼排', ingredientId: 'fish', spawnId: 'fish-audio' });
  store.getState().interact();
  cook(store, ['fish']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(sounds.at(-1), 'failure');
});

test('muted play still completes cooking and emits no cues until sound is enabled', () => {
  const { store, sounds, advance } = setup();
  store.getState().setSoundEnabled(false);
  store.getState().startGame();
  cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(store.getState().phase, 'result');
  assert.deepEqual(sounds, []);
  store.getState().setSoundEnabled(true);
  assert.deepEqual(sounds, ['click']);
});

test('completed progress survives reload and an interrupted animation does not lose food', () => {
  const { store, options, advance } = setup();
  store.getState().startGame();
  cook(store, ['bread', 'beef', 'cheese']);
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
  assert.equal(restored.getState().discoveries['golden-cheese']?.count, 1);
  assert.deepEqual(restored.getState().held, []);

  store.getState().dismissResult();
  cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  assert.equal(store.getState().isNewRecipe, false);
  assert.equal(store.getState().discoveries['golden-cheese']?.count, 2);
  assert.equal(store.getState().totalCooked, 2);
});

test('invalid or tampered storage is bounded and discarded without breaking startup', () => {
  assert.equal(setup('{broken-json').store.getState().inventory.bread, 2);
  const saved = { version: 1, inventory: { bread: -12, cheese: 99999999, beef: 'Infinity', fish: 1.7 }, discoveries: { 'golden-cheese': { at: 'bad-date', ingredients: ['bread', 'beef', 'cheese'], count: 5 }, 'unknown-recipe': { at: '2026-10-24', ingredients: ['fish'], count: 2 } }, totalCooked: 1000, soundEnabled: false };
  const { store } = setup(JSON.stringify(saved));
  assert.equal(store.getState().inventory.bread, 0);
  assert.equal(store.getState().inventory.cheese, 999);
  assert.equal(store.getState().inventory.beef, 0);
  assert.equal(store.getState().inventory.fish, 1);
  assert.equal(store.getState().totalCooked, 0);
  assert.deepEqual(store.getState().discoveries, {});
  assert.equal(store.getState().soundEnabled, false);
});

test('blocked storage never blocks completing a meal', () => {
  let time = 0;
  const store = createGameStore({ storage: { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined }, now: () => time, audio: { init: () => undefined, play: () => undefined, enabled: () => undefined } });
  store.getState().startGame();
  cook(store, ['bread', 'beef', 'cheese']);
  time = COOK_DURATION * 1000;
  assert.doesNotThrow(() => store.getState().finishCooking());
  assert.equal(store.getState().totalCooked, 1);
});

test('a reset returns a fresh playable title and clears persisted discoveries', () => {
  const { store, advance, options } = setup();
  store.getState().startGame();
  cook(store, ['bread', 'beef', 'cheese']);
  advance(COOK_DURATION * 1000);
  store.getState().finishCooking();
  store.getState().resetProgress();
  assert.equal(store.getState().phase, 'title');
  assert.equal(store.getState().inventory.bread, 2);
  assert.equal(store.getState().totalCooked, 0);
  assert.deepEqual(createGameStore(options).getState().discoveries, {});
});
