import { useSyncExternalStore } from 'react';
import type { IngredientId } from '../game/data';

const thumbnails = new Map<IngredientId, string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function publishFoodThumbnail(id: IngredientId, url: string) {
  thumbnails.set(id, url);
  listeners.forEach(listener => listener());
}

export function useFoodThumbnail(id: IngredientId) {
  return useSyncExternalStore(subscribe, () => thumbnails.get(id), () => undefined);
}
