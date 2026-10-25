import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { INGREDIENTS, INGREDIENT_BY_ID, MAX_HELD, type IngredientId } from '../game/data';
import { useGameStore } from '../game/store';
import { FoodIcon } from './FoodIcon';
import { GameIcon, type GameIconName } from './GameIcon';

const categories: Array<{ label: string; icon: GameIconName; category?: string }> = [
  { label: '全部材料', icon: 'all' }, { label: '谷物', icon: 'grain', category: '谷物' },
  { label: '肉类', icon: 'protein', category: '肉类' }, { label: '蔬果', icon: 'leaf', category: '蔬果' },
  { label: '配料', icon: 'seasoning', category: '配料' }, { label: '小食', icon: 'snack', category: '小食' },
];

export function InventoryPanel() {
  const state = useGameStore();
  const [category, setCategory] = useState(0);
  const [selected, setSelected] = useState<IngredientId>('bread');
  const grid = useRef<HTMLDivElement>(null);
  const focusGridAfterChange = useRef(true);
  const items = INGREDIENTS.filter(item => !categories[category].category || item.category === categories[category].category);
  const item = INGREDIENT_BY_ID[selected];
  const available = (id: IngredientId) => Math.max(0, state.inventory[id] - state.held.filter(held => held === id).length);
  const focusItem = (id: IngredientId) => grid.current?.querySelector<HTMLButtonElement>(`[data-ingredient="${id}"]`)?.focus({ preventScroll: true });

  useEffect(() => {
    if (focusGridAfterChange.current) {
      grid.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus({ preventScroll: true });
      focusGridAfterChange.current = false;
    }
  }, [category]);

  function changeCategory(next: number) {
    const value = (next + categories.length) % categories.length;
    setCategory(value);
    const first = INGREDIENTS.find(ingredient => !categories[value].category || ingredient.category === categories[value].category)!;
    setSelected(first.id);
  }

  function onKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === 'q' || key === 'e') {
      event.preventDefault(); event.stopPropagation();
      focusGridAfterChange.current = true;
      changeCategory(category + (key === 'q' ? -1 : 1));
    } else if (key === 'backspace') {
      event.preventDefault(); event.stopPropagation();
      if (state.held.length) state.removeHeld(state.held.length - 1);
    } else if (key === 'x') {
      event.preventDefault(); event.stopPropagation(); state.clearHeld();
    }
  }

  function navigateGrid(event: KeyboardEvent) {
    const direction = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5, a: -1, d: 1, w: -5, s: 5 }[event.key];
    if (direction === undefined && !['Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const current = items.findIndex(ingredient => ingredient.id === selected);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, current + direction!));
    setSelected(items[next].id); focusItem(items[next].id);
  }

  return <div className="inventory-screen" role="dialog" aria-modal="true" aria-label="背包 · 手持食材" onKeyDown={onKeyDown}>
    <header className="inventory-header">
      <div className="inventory-heading"><GameIcon name="bag" size={27}/><h1>袋子</h1><span>材料</span></div>
      <div className="inventory-header-actions"><button onClick={() => state.openPanel('recipes')}><GameIcon name="book" size={19}/>料理手记</button><button className="icon-btn" onClick={state.closePanel} aria-label="关闭背包">×</button></div>
    </header>

    <section className="inventory-content">
      <div className="inventory-categories" role="tablist" aria-label="材料分类">
        {categories.map((entry, i) => <button key={entry.label} role="tab" aria-selected={category === i} aria-controls="inventory-materials" id={`category-${i}`} className={category === i ? 'active' : ''} onClick={() => changeCategory(i)} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const next = (i + (event.key === 'ArrowLeft' ? -1 : 1) + categories.length) % categories.length; changeCategory(next); document.getElementById(`category-${next}`)?.focus(); }
        }} tabIndex={category === i ? 0 : -1} title={entry.label} aria-label={entry.label}><GameIcon name={entry.icon} size={24}/></button>)}
      </div>
      <div className="inventory-section-label"><span>{categories[category].label}</span><small>{items.length} 种</small></div>
      <div id="inventory-materials" role="tabpanel" aria-labelledby={`category-${category}`}>
        <div className="ingredient-grid" ref={grid} onKeyDown={navigateGrid}>
          {items.map(ingredient => {
            const count = available(ingredient.id);
            return <button key={ingredient.id} data-ingredient={ingredient.id} className={`ingredient-tile ${selected === ingredient.id ? 'selected' : ''} ${count === 0 ? 'depleted' : ''}`} tabIndex={selected === ingredient.id ? 0 : -1} onMouseEnter={() => setSelected(ingredient.id)} onFocus={() => setSelected(ingredient.id)} onClick={() => { setSelected(ingredient.id); state.selectIngredient(ingredient.id); }} aria-label={`${ingredient.name}，剩余 ${count} 份`} aria-describedby="ingredient-description" aria-disabled={count === 0 || state.held.length >= MAX_HELD}>
              <FoodIcon id={ingredient.id} size={92}/><span className="selection-corners"/><span className="ingredient-count">×{count}</span>
            </button>;
          })}
          {Array.from({ length: 15 - items.length }, (_, i) => <div className="ingredient-tile empty" key={`empty-${i}`} aria-hidden="true"/>)}
        </div>
      </div>
      <div className="inventory-hands">
        <div className="held-label"><span>手持材料</span><b aria-live="polite">{state.held.length} <i>/ {MAX_HELD}</i></b></div>
        <div className="hand-slots">{Array.from({ length: MAX_HELD }, (_, i) => <button key={i} className={`hand-slot ${state.held[i] ? 'filled' : ''}`} aria-label={state.held[i] ? `放回${INGREDIENT_BY_ID[state.held[i]].name}` : `空位 ${i + 1}`} disabled={!state.held[i]} onClick={() => state.removeHeld(i)}>{state.held[i] ? <FoodIcon id={state.held[i]} size={51}/> : <span>·</span>}</button>)}</div>
        <p className="holding-hint" aria-live="polite">{state.held.length === MAX_HELD ? '双手已经拿满了，可以去料理锅旁了。' : state.held.length ? '选择材料继续拿取，点击手中材料可放回。' : '选择食材拿在手中，最多可以拿 5 份。'}</p>
      </div>
    </section>

    <section className="ingredient-detail" aria-live="polite">
      <span className="ingredient-kind">{item.category}</span><h2>{item.name}</h2><div className="detail-rule"/>
      <p id="ingredient-description">{item.description}</p>
      <small>{available(selected) ? `袋中还剩 ${available(selected)} 份` : '暂时用完了，去营地附近找找吧。'}</small>
    </section>
    <footer className="inventory-footer">
      <div className="inventory-keyboard-hints"><span><kbd>↑ ↓ ← →</kbd> 选择</span><span><kbd>Enter</kbd> 拿取</span><span><kbd>Q / E</kbd> 分类</span></div>
      <div className="inventory-footer-actions"><button onClick={state.clearHeld} disabled={!state.held.length}><kbd>X</kbd> 全部放回</button><button className="return-to-game" onClick={state.closePanel}><kbd>Esc</kbd> {state.held.length ? '拿好了' : '返回游戏'}</button></div>
    </footer>
  </div>;
}
