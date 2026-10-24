import { create } from 'zustand';
import { COOK_DURATION, COLLECTION_COOLDOWN, INGREDIENTS, INGREDIENT_BY_ID, LEGACY_RECIPE_IDS, LEGACY_RECIPE_MAP, RECIPE_BY_ID, isRecipeId, MAX_HELD, RECIPES, isIngredientId, resolveRecipe } from './data';
import type { IngredientId, Recipe } from './data';
import { initAudio, playSound, setAudioEnabled, stopAllSounds } from './audio';
import type { SoundName } from './audio';
import type { CookingMatch } from '../../server/types';
import { api } from './api';

export type GamePhase = 'title' | 'explore' | 'cooking' | 'result';
export type GamePanel = 'inventory' | 'recipes' | 'help' | 'order' | 'cook-error' | null;
export type Nearby = { kind: 'pot' | 'ingredient'; label: string; ingredientId?: IngredientId; spawnId?: string } | null;
export type Inventory = Record<IngredientId, number>;
export type Discovery = { at: string; ingredients: IngredientId[]; count: number };

export interface GameState {
  phase: GamePhase;
  panel: GamePanel;
  inventory: Inventory;
  held: IngredientId[];
  cookedIngredients: IngredientId[];
  result: Recipe | null;
  cookingMatch: CookingMatch | null;
  matching: boolean;
  cookingError: string | null;
  revealStartedAt: number;
  cancelCooking: () => void;
  discoveries: Record<string, Discovery>;
  isNewRecipe: boolean;
  cookingStartedAt: number;
  collected: Record<string, number>;
  nearby: Nearby;
  toast: string | null;
  soundEnabled: boolean;
  totalCooked: number;
  startGame: () => void;
  openPanel: (panel: GamePanel) => void;
  closePanel: () => void;
  selectIngredient: (id: IngredientId) => void;
  removeHeld: (index: number) => void;
  clearHeld: () => void;
  setNearby: (nearby: Nearby) => void;
  interact: () => void;
  startCooking: () => Promise<void>;
  finishCooking: () => void;
  dismissResult: () => void;
  setSoundEnabled: (value: boolean) => void;
  notify: (message: string) => void;
  resetProgress: () => void;
}

export const SAVE_KEY = 'wildfire-kitchen:progress:v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type GameDependencies = {
  storage?: StorageLike | null;
  match?: (ingredients: IngredientId[], signal: AbortSignal) => Promise<CookingMatch>;
  now?: () => number;
  wallNow?: () => number;
  audio?: { init: () => void; play: (name: SoundName) => void; enabled: (value: boolean) => void; stop?: () => void };
};

export function initialInventory(): Inventory {
  return Object.fromEntries(INGREDIENTS.map(({ id }) => [id, ['bread', 'beef', 'cheese'].includes(id) ? 2 : 0])) as Inventory;
}

function browserStorage(): StorageLike | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedCount(value: unknown, max = 999): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
}

function loadProgress(storage: StorageLike | null) {
  const fallback = { inventory: initialInventory(), discoveries: {} as Record<string, Discovery>, totalCooked: 0, soundEnabled: true };
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!object(parsed) || ![1, 2].includes(Number(parsed.version)) || !object(parsed.inventory)) return fallback;
    const savedInventory = parsed.inventory;
    const inventory = Object.fromEntries(INGREDIENTS.map(({ id }) => [id, boundedCount(savedInventory[id])])) as Inventory;
    const discoveries: Record<string, Discovery> = {};
    if (object(parsed.discoveries)) {
      for (const id of [...RECIPES.map(recipe => recipe.id), ...LEGACY_RECIPE_IDS]) {
        const value: unknown = parsed.discoveries[id];
        if (!object(value) || typeof value.at !== 'string' || !Number.isFinite(Date.parse(value.at))) continue;
        if (!Array.isArray(value.ingredients) || value.ingredients.length < 1 || value.ingredients.length > MAX_HELD || !value.ingredients.every(isIngredientId)) continue;
        const count = boundedCount(value.count, 1_000_000);
        if (count < 1) continue;
        const discovery: Discovery = { at: value.at, ingredients: [...value.ingredients], count };
        const recipeId = isRecipeId(id) ? id : LEGACY_RECIPE_MAP[id];
        const previous = discoveries[recipeId];
        const earliest = previous && Date.parse(previous.at) <= Date.parse(discovery.at) ? previous : discovery;
        discoveries[recipeId] = { at: earliest.at, ingredients: [...earliest.ingredients], count: (previous?.count ?? 0) + count };
      }
    }
    return {
      inventory,
      discoveries,
      totalCooked: Object.values(discoveries).reduce((sum, discovery) => sum + discovery.count, 0),
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    };
  } catch { return fallback; }
}

/** Dependency injection makes timing, persistence, and repeated interactions testable without WebGL. */
export function createGameStore(dependencies: GameDependencies = {}) {
  const storage = dependencies.storage === undefined ? browserStorage() : dependencies.storage;
  const now = dependencies.now ?? (() => performance.now());
  const wallNow = dependencies.wallNow ?? (() => Date.now());
  const audio = dependencies.audio ?? { init: initAudio, play: playSound, enabled: setAudioEnabled, stop: stopAllSounds };
  const match = dependencies.match ?? ((ingredients, signal) => api<CookingMatch>('/api/cooking-match', { ingredients }, signal));
  let operation = 0;
  let controller: AbortController | null = null;
  let pendingInventory: Inventory | null = null;
  const saved = loadProgress(storage);
  audio.enabled(saved.soundEnabled);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const store = create<GameState>((set, get) => {
    const persist = () => {
      const state = get();
      // An interrupted cooking animation is not saved halfway through consumption.
      if (state.phase === 'cooking') return;
      try {
        storage?.setItem(SAVE_KEY, JSON.stringify({ version: 2, inventory: state.inventory, discoveries: state.discoveries, totalCooked: state.totalCooked, soundEnabled: state.soundEnabled }));
      } catch { /* private mode and full storage keep the current play session intact */ }
    };

    const sound = (name: SoundName) => {
      if (get().soundEnabled) { audio.init(); audio.play(name); }
    };

    return {
      phase: 'title', panel: null, ...saved, held: [], cookedIngredients: [], result: null,
      cookingMatch: null, matching: false, cookingError: null, revealStartedAt: 0,
      isNewRecipe: false, cookingStartedAt: 0, collected: {}, nearby: null, toast: null,

      cancelCooking: () => {
        if (get().phase !== 'cooking') return;
        operation++; controller?.abort(); controller = null;
        audio.stop?.();
        const inventory = pendingInventory ?? get().inventory;
        pendingInventory = null;
        set({ phase: 'explore', panel: null, inventory, held: [...get().cookedIngredients], cookedIngredients: [],
          result: null, cookingMatch: null, matching: false, cookingError: null });
        get().notify('食材已放回手中，可以重新烹饪');
      },
      startGame: () => {
        if (get().phase !== 'title') return;
        set({ phase: 'explore', panel: null });
        sound('click');
      },

      openPanel: (panel) => {
        const state = get();
        if (panel === null) { state.closePanel(); return; }
        if (state.phase === 'cooking') return;
        if (panel === 'inventory' && state.phase !== 'explore') return;
        if (panel === 'order' && (state.phase !== 'result' || !state.result?.catalogTag)) return;
        if (panel === 'recipes' && state.phase === 'title') return;
        set({ panel });
        sound('click');
      },

      closePanel: () => {
        const state = get();
        if (!state.panel) return;
        set({ panel: null });
        sound('click');
        if (state.panel === 'inventory' && state.held.length > 0) sound('hold');
      },

      selectIngredient: (id) => {
        const state = get();
        if (state.phase !== 'explore' || state.panel !== 'inventory' || !isIngredientId(id)) return;
        if (state.held.length >= MAX_HELD) { state.notify('双手最多拿 5 份食材'); return; }
        if (state.inventory[id] <= state.held.filter((held) => held === id).length) { state.notify(`${INGREDIENT_BY_ID[id].name}已经拿完了，去营地找找吧`); return; }
        set({ held: [...state.held, id] });
        sound('select');
      },

      removeHeld: (index) => {
        const state = get();
        if (state.phase !== 'explore' || !Number.isInteger(index) || index < 0 || index >= state.held.length) return;
        set({ held: state.held.filter((_, heldIndex) => heldIndex !== index) });
        sound('select');
      },

      clearHeld: () => {
        if (get().phase !== 'explore') return;
        set({ held: [] });
      },

      setNearby: (nearby) => {
        const current = get().nearby;
        if (current?.kind === nearby?.kind && current?.label === nearby?.label && current?.ingredientId === nearby?.ingredientId && current?.spawnId === nearby?.spawnId) return;
        set({ nearby });
      },

      interact: () => {
        const state = get();
        if (state.phase !== 'explore' || state.panel || !state.nearby) return;
        const target = state.nearby;
        if (target.kind === 'pot') { state.startCooking(); return; }
        if (!target.spawnId || !isIngredientId(target.ingredientId)) return;
        const currentTime = wallNow();
        if ((state.collected[target.spawnId] ?? 0) > currentTime) return;
        const id = target.ingredientId;
        if (state.inventory[id] >= 999) { state.notify('背包里这种食材已经装满了'); return; }
        const amount = Math.min(2, 999 - state.inventory[id]);
        const collected = Object.fromEntries(Object.entries(state.collected).filter(([, expiry]) => expiry > currentTime));
        set({ inventory: { ...state.inventory, [id]: state.inventory[id] + amount }, collected: { ...collected, [target.spawnId]: currentTime + COLLECTION_COOLDOWN }, nearby: null });
        persist();
        sound('pickup');
        get().notify(`${INGREDIENT_BY_ID[id].name} +${amount}`);
      },

      startCooking: async () => {
        const state = get();
        if (state.phase !== 'explore' || state.panel || state.nearby?.kind !== 'pot') return;
        if (!state.held.length) { state.notify('打开背包，先把食材拿在手里'); return; }
        if (state.held.length > MAX_HELD) return;
        try { resolveRecipe(state.held); }
        catch (error) { state.notify((error as Error).message); return; }
        const inventory = { ...state.inventory };
        for (const id of state.held) {
          if (!isIngredientId(id) || inventory[id] < 1) return;
          inventory[id] -= 1;
        }
        const ingredients = [...state.held];
        const currentOperation = ++operation;
        controller?.abort(); controller = new AbortController();
        pendingInventory = state.inventory;
        audio.stop?.();
        set({ phase: 'cooking', panel: null, inventory, held: [], cookedIngredients: ingredients,
          result: null, cookingMatch: null, matching: true, cookingError: null, revealStartedAt: 0,
          cookingStartedAt: now(), isNewRecipe: false, nearby: null, toast: null });
        sound('cook');
        try {
          const matched = await match(ingredients, controller.signal);
          if (operation !== currentOperation || get().phase !== 'cooking') return;
          if (!isRecipeId(matched.recipeId) || matched.modelVariant !== matched.recipeId
            || matched.product.catalogTag !== matched.recipeId || !matched.store.code
            || !['live', 'demo'].includes(matched.mode)) throw new Error('餐品匹配信息发生变化，请重新烹饪。');
          set({ matching: false, cookingMatch: matched,
            result: { ...RECIPE_BY_ID[matched.recipeId], name: matched.product.name, ingredients },
            revealStartedAt: Math.max(now(), get().cookingStartedAt + 4350) });
        } catch (error) {
          if (operation !== currentOperation || get().phase !== 'cooking') return;
          audio.stop?.();
          const message = error instanceof Error && error.name !== 'TimeoutError' ? error.message : '菜单查询超时，请稍后重试。';
          set({ phase: 'explore', panel: 'cook-error', inventory: pendingInventory ?? state.inventory,
            held: ingredients, cookedIngredients: [], result: null, cookingMatch: null, matching: false, cookingError: message });
          pendingInventory = null;
        }
      },

      finishCooking: () => {
        const state = get();
        if (state.phase !== 'cooking' || state.matching || !state.result || now() - state.cookingStartedAt < COOK_DURATION * 1000 || now() - state.revealStartedAt < 1250) return;
        pendingInventory = null;
        const previous = state.discoveries[state.result.id];
        const discovery = { at: previous?.at ?? new Date(wallNow()).toISOString(), ingredients: [...state.cookedIngredients], count: (previous?.count ?? 0) + 1 };
        audio.stop?.();
        set({ phase: 'result', isNewRecipe: !previous, discoveries: { ...state.discoveries, [state.result.id]: discovery }, totalCooked: state.totalCooked + 1 });
        persist();
        sound(state.result.quality !== 'success' ? 'failure' : previous ? 'success' : 'discovery');
      },

      dismissResult: () => {
        if (get().phase !== 'result') return;
        audio.stop?.();
        set({ phase: 'explore', panel: null, result: null, cookingMatch: null, cookedIngredients: [], isNewRecipe: false });
        sound('click');
      },

      setSoundEnabled: (value) => {
        set({ soundEnabled: value });
        audio.enabled(value);
        if (value) sound('click');
        persist();
      },

      notify: (message) => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ toast: message });
        toastTimer = setTimeout(() => set({ toast: null }), 2800);
        // Node's test runner should not wait for a transient notification.
        if (typeof toastTimer === 'object' && 'unref' in toastTimer) toastTimer.unref();
      },

      resetProgress: () => {
        operation++; controller?.abort(); controller = null; pendingInventory = null;
        if (toastTimer) clearTimeout(toastTimer);
        audio.stop?.();
        set({ phase: 'title', panel: null, inventory: initialInventory(), held: [], cookedIngredients: [], result: null, discoveries: {}, totalCooked: 0, isNewRecipe: false, cookingStartedAt: 0, collected: {}, nearby: null, toast: null, matching: false, cookingMatch: null, cookingError: null, revealStartedAt: 0 });
        persist();
      },
    };
  });
  return store;
}

export const useGameStore = createGameStore();
