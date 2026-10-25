import { useState } from 'react';
import { useGameStore } from '../game/store';
import { FoodIcon } from './FoodIcon';
import { GameIcon } from './GameIcon';
import { OrderPanel } from './OrderPanel';

export function ResultPanel() {
  const state = useGameStore();
  const [ordering, setOrdering] = useState(false);
  const recipe = state.result;
  if (!recipe) return null;
  return <div className={`result-screen ${ordering ? 'ordering' : ''}`}>
    <div className="discovery-caption"><span/> {state.isNewRecipe ? '发现新的料理' : '料理完成'} <span/></div>
    <section className="result-panel" role="dialog" aria-modal="true" aria-label="料理结果">
      <div className="result-type"><GameIcon name="pot" size={18}/><span>{ordering ? '营地餐台' : '料理'}</span>{state.isNewRecipe && !ordering && <b>NEW</b>}</div>
      <h1>{recipe.name}</h1><div className="result-rule"/>
      {!ordering && <><p className="description">{recipe.description}</p><div className="recipe-ingredients"><span>使用材料</span>{state.cookedIngredients.map((id, i) => <FoodIcon key={`${id}-${i}`} id={id} size={39}/>)}</div></>}
      {ordering && state.cookingMatch ? <>
        <div className="match-notes"><span>{state.cookingMatch.mode === 'live' ? '真实菜单' : '演示料理'}</span><p>{state.cookingMatch.explanation}</p></div>
        <OrderPanel match={state.cookingMatch}/>
        <button className="subtle-btn" onClick={state.dismissResult}>回到营地 <kbd>Esc</kbd></button>
      </> : <div className="result-actions">
        <button className="outline-btn continue-adventure" onClick={state.dismissResult}>继续冒险 <kbd>Esc</kbd></button>
        {state.cookingMatch && <button className="subtle-btn order-entry" onClick={() => setOrdering(true)}>在麦当劳点这份料理 <span>›</span></button>}
      </div>}
    </section>
  </div>;
}
