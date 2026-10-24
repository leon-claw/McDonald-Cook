# Implementation contract

This file coordinates the first playable implementation. TypeScript, React 19, @react-three/fiber 9, Three.js, Zustand, Vite; Node/Express backend using official MCP TypeScript SDK. Root owns package/config, src/App.tsx, src/main.tsx, src/scene/**, README. Other ownership is assigned per agent.

## Game data and store contract (src/game/data.ts and src/game/store.ts)

IngredientId = 'bread' | 'beef' | 'chicken' | 'fish' | 'cheese' | 'lettuce' | 'tomato' | 'pickle' | 'chili' | 'fries'.
Ingredient = { id: IngredientId; name: string; description: string; color: string; category: string }.
Export INGREDIENTS: Ingredient[], INGREDIENT_BY_ID: Record<IngredientId, Ingredient>.
Recipe = { id: string; name: string; subtitle: string; description: string; ingredients: IngredientId[]; kind: 'burger' | 'fries' | 'dubious'; quality: 'success' | 'failure'; catalogTag?: string; color: string }.
Export RECIPES: Recipe[], resolveRecipe(ingredients: IngredientId[]): Recipe. At least six successes and three failures. Exact deterministic multisets with meaningful class fallback, no misleading ingredient ignoring. Export COOK_DURATION = 5.6 (seconds).

Store export useGameStore from Zustand with getState available. Fields:
- phase: 'title' | 'explore' | 'cooking' | 'result'
- panel: 'inventory' | 'recipes' | 'help' | 'order' | null
- inventory: Record<IngredientId, number>; held: IngredientId[]; cookedIngredients: IngredientId[]
- result: Recipe | null; discoveries: Record<string, { at: string; ingredients: IngredientId[]; count: number }>; isNewRecipe: boolean
- cookingStartedAt: number (performance.now()); collected: Record<string, number> (Date.now expiry per spawnId)
- nearby: { kind: 'pot' | 'ingredient'; label: string; ingredientId?: IngredientId; spawnId?: string } | null
- toast: string | null; soundEnabled: boolean; totalCooked: number
- startGame(), openPanel(panel), closePanel(), selectIngredient(id), removeHeld(index), clearHeld(), setNearby(nearby), interact(), startCooking(), finishCooking(), dismissResult(), setSoundEnabled(value), notify(message), resetProgress()

Held is reservation against inventory; select must ensure available minus held. Consume exactly once when cooking starts. At most 5. startCooking only when explore, no panel, nearby pot, held nonempty; guard duplicate calls. finishCooking only when cooking and elapsed >= COOK_DURATION seconds; discovers/saves; no request or purchase side effects. initial inventory 2 bread, 2 beef, 2 cheese (starter supplies), others 0. collect ingredient through interact with +2 quantity and 45 second cooldown. Inventory, discoveries, total persist with defensive parsing; do not persist unfinished cooking. Reset only via explicit UI confirmation. sound utility exports initAudio(), playSound('pickup'|'select'|'hold'|'cook'|'success'|'discovery'|'failure'|'click'), setAudioEnabled(), stopAllSounds(). Local WAV samples cover pickup, holding, throwing, discoveries, results and failure reactions; synthesized cues cover menu and cooking rhythm. Scene transitions cancel active and pending sounds.

## UI contract

src/ui/GameUI.tsx exports default GameUI. src/ui/styles.css owns all UI CSS imported in GameUI. src/ui/FoodIcon.tsx exports FoodIcon({id: IngredientId, size?:number}) and DishIcon({recipe: Recipe, size?:number}) using original inline SVG. No external images/fonts necessary. Icons may use lucide-react for utility only.
GameUI reads store. Full-screen overlay around scene, title screen, sparse in-game HUD, compass, location, objective, controls hint, inventory panel, recipe panel, help, results, order. Name 麦野食光, eyebrow WILDFIRE KITCHEN, camp 初见之森 / 料理营地. Palette forest #193b30, grass #87a86a, parchment #f4e8cc, amber #f2c76c, coral #d76746, ivory #fff9e9. Display Songti SC / STSong / Georgia; body system sans. Must feel like fantasy adventure game, no SaaS cards or normal website. Fullscreen responsive accessible buttons, reduced motion. Controls W A S D move, Shift sprint, mouse drag orbit, E interact, Tab inventory, R recipes, Esc close. Buttons use store actions. No duplicate global key listeners (App owns). Mobile directional buttons dispatch CustomEvent('game:move', {detail:{key:'w'|'a'|'s'|'d',pressed:boolean}}). Main HUD interact button store.interact. Cooking duration managed by scene/App not UI. UI can show skip only if store supports but not required.

## Backend / UI API contract

All endpoints JSON. No token in browser.
GET /api/health -> {mode:'demo'|'live'|'unconfigured', ready:boolean, message?:string}
GET /api/catalog?storeCode=... -> {mode:'demo'|'live', store:{code:string,name:string}, products:[{id:string,name:string,price:number|null,catalogTag:string}], message?:string}
POST /api/quote {productId:string,storeCode:string,quantity:1} -> {quoteId:string,mode:'demo'|'live',product:{id,name,price,catalogTag},store:{code,name},quantity:number,total:number,currency:'CNY',expiresAt:string}
POST /api/orders {quoteId:string,requestId:string} -> {mode:'demo'|'live',orderId:string,status:'demo'|'created'|'unknown',payUrl?:string,message?:string}
GET /api/orders/:id -> same order shape or 404
Errors non-2xx {error:string,code?:string}. No automatic retry of create. Stable requestId from UI per quote; preserved for uncertain response. One server quote maps to at most one order regardless of requestId. Demo explicitly marked and no real pay links. Default demo enabled without credentials; live only explicit MCD_MODE=live and token/config. UI clearly shows 演示订单 / 不会产生真实订单. Live must require store code; if unavailable mapping no order action. Backend agent can document extra config/schema adapters in server/README.md.
