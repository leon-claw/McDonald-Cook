import type { IngredientId } from '../game/data';

export type Pickup = { id: string; ingredient: IngredientId; x: number; z: number };
export const PICKUPS: Pickup[] = [
  {id:'bread-basket',ingredient:'bread',x:-3.8,z:.8},
  {id:'beef-crate',ingredient:'beef',x:3.8,z:.2},
  {id:'cheese-board',ingredient:'cheese',x:4.6,z:-2.5},
  {id:'lettuce-garden',ingredient:'lettuce',x:-5.6,z:2.8},
  {id:'tomato-garden',ingredient:'tomato',x:-7.8,z:-1.2},
  {id:'chicken-crate',ingredient:'chicken',x:6.8,z:-5.8},
  {id:'fish-crate',ingredient:'fish',x:2.8,z:-8.5},
  {id:'pickle-jar',ingredient:'pickle',x:-3.5,z:-8.5},
  {id:'chili-plant',ingredient:'chili',x:-10,z:4.5},
  {id:'fries-crate',ingredient:'fries',x:9,z:6},
];
export const TREES = [
  [-9,-5,1.65],[-12,1,1.15],[-13,8,1.1],[-9,13,1.05],[8,12,1.3],[13,6,1.5],
  [9,-8,1.65],[12,-15,1.45],[-7,-14,1.2],[-15,-12,1.6],[-19,-5,1.3],
  [18,-9,1.4],[20,2,1.25],[-19,12,1.4],[16,17,1.5],[-21,-20,1.4],
  [22,-23,1.4],[-27,-7,1.5],[27,12,1.7],[-21,22,1.7],[-11,-24,1.15],
  [28,-15,1.4],[-30,-22,1.5],[34,-28,1.5],[-24,-32,1.2],
] as const;
export const COLLIDERS = [
  ...TREES.map(([x,z,s])=>({x,z,r:.35*s})),
  ...PICKUPS.map(p=>({x:p.x,z:p.z,r:.5})),
  {x:0,z:-4,r:.9}, {x:-5.8,z:-6,r:1.55}, {x:4.1,z:-5,r:.7},
];
export function random(seed: number) { const x=Math.sin(seed*127.1+311.7)*43758.5453123; return x-Math.floor(x); }
export function heightAt(x:number,z:number) {
  const radius = Math.hypot(x, z + 3);
  const edge = Math.max(0, Math.min(1, (radius - 8) / 18));
  const hills = Math.sin(x*.105+1.2)*Math.cos(z*.085)*2.9 + Math.sin(x*.2+z*.09)*.7;
  return edge * hills + Math.sin(x*.38)*Math.sin(z*.31)*.075;
}
export function clearingAt(x:number,z:number) {
  const camp = 1 - Math.min(1, Math.max(0, (Math.hypot(x * .9, z + 4) - 1.7) / 1.9));
  const path = 1 - Math.min(1, Math.max(0, (Math.abs(x - Math.sin(z*.22)*1.2) - .45) / .85));
  const tent = 1 - Math.min(1, Math.max(0, (Math.hypot(x + 5.8,z + 6) - 1.2) / 1.1));
  return Math.max(camp, path * .88, tent);
}
