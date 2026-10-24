import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Backpack, Volume2, VolumeX, Sun, CookingPot as PotIcon, X } from 'lucide-react';
import { useGameStore, type Nearby } from './game/store';
import { INGREDIENTS, INGREDIENT_BY_ID, RECIPES, type IngredientId } from './game/data';
import { GameCanvas, isEditing } from './scene/GameScene';
import { PICKUPS } from './scene/world';
import { DishIcon, FoodIcon } from './ui/FoodIcon';
import { OrderPanel } from './ui/OrderPanel';
import './ui/styles.css';
import './ui/game-controls.css';

function Panel({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
  return <div className="shade"><section className="panel" role="dialog" aria-label={title}><header><div><small>旅人的记录</small><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={23}/></button></header>{children}</section></div>;
}

function InventoryPanel(){
  const state=useGameStore();const [selected,setSelected]=useState<IngredientId>('bread');const item=INGREDIENT_BY_ID[selected];
  return <div className="inventory-screen" role="dialog" aria-label="背包 · 手持食材">
    <header className="inventory-header"><div className="inventory-heading"><Backpack size={24}/><h1>袋子</h1><span>材料</span></div><button className="icon-btn" onClick={state.closePanel} aria-label="关闭背包"><X size={24}/><kbd>Esc</kbd></button></header>
    <section className="inventory-content">
      <div className="inventory-tabs"><b>料理材料</b><span>{INGREDIENTS.length} 种</span></div>
      <div className="ingredient-grid">{INGREDIENTS.map(ingredient=>{
        const count=Math.max(0,state.inventory[ingredient.id]-state.held.filter(id=>id===ingredient.id).length);
        return <button key={ingredient.id} className={`ingredient-tile ${selected===ingredient.id?'selected':''} ${count===0?'depleted':''}`} onMouseEnter={()=>setSelected(ingredient.id)} onFocus={()=>setSelected(ingredient.id)} onClick={()=>{setSelected(ingredient.id);state.selectIngredient(ingredient.id)}} aria-label={`${ingredient.name}，剩余 ${count} 份`} aria-disabled={count===0||state.held.length>=5}>
          <FoodIcon id={ingredient.id} size={76}/><span className="ingredient-count">×{count}</span><span className="ingredient-name">{ingredient.name}</span>
        </button>;
      })}</div>
      <div className="ingredient-detail"><h2>{item.name}</h2><p>{item.description}</p></div>
      <div className="held-label"><span>手持材料</span><b>{state.held.length} <i>/ 5</i></b></div>
      <div className="hand-slots">{Array.from({length:5},(_,i)=><button key={i} className={`hand-slot ${state.held[i]?'filled':''}`} aria-label={state.held[i]?`放回${INGREDIENT_BY_ID[state.held[i]].name}`:`空位 ${i+1}`} onClick={()=>state.held[i]&&state.removeHeld(i)}>{state.held[i]?<FoodIcon id={state.held[i]} size={45}/>:<span>＋</span>}</button>)}</div>
      <footer><button className="subtle-btn" onClick={state.clearHeld}>全部放回</button><button className="outline-btn" onClick={state.closePanel}>拿好了 <span>→</span></button></footer>
    </section>
    <div className="inventory-traveler"><span>准备一顿好料理</span><p>选好材料，走近火堆旁的锅。</p></div>
  </div>;
}

function ResultPanel(){
  const state=useGameStore();const [ordering,setOrdering]=useState(false);const r=state.result;if(!r)return null;
  return <div className={`result-screen ${ordering?'ordering':''}`}>
    <div className="discovery-caption"><span>◆</span> {state.isNewRecipe?'新食谱':'料理完成'} <span>◆</span></div>
    <section className="result-panel" role="dialog" aria-label="料理结果">
      <small className="result-eyebrow">{r.quality==='success'?'COOKING COMPLETE':'A LITTLE SURPRISE'}</small>
      <h1>{r.name}</h1><div className="result-rule"/><p className="subtitle">{r.subtitle}</p><p className="description">{r.description}</p>
      <div className="recipe-ingredients">{state.cookedIngredients.map((id,i)=><FoodIcon key={`${id}-${i}`} id={id} size={35}/>)}</div>
      {ordering&&r.catalogTag?<OrderPanel catalogTag={r.catalogTag}/>:<div className="result-actions">{r.catalogTag&&<button className="outline-btn" onClick={()=>setOrdering(true)}>创建麦当劳订单 <span>→</span></button>}<button className="subtle-btn" onClick={state.dismissResult}>继续冒险 <kbd>Esc</kbd></button></div>}
      {ordering&&<button className="subtle-btn" onClick={state.dismissResult}>回到营地</button>}
    </section>
  </div>;
}

function MobilePad(){
  const press=(key:string,pressed:boolean)=>window.dispatchEvent(new CustomEvent('game:move',{detail:{key,pressed}}));
  const controls=[['w',ArrowUp,'向前'],['a',ArrowLeft,'向左'],['s',ArrowDown,'向后'],['d',ArrowRight,'向右']] as const;
  return <div className="mobile-pad" aria-label="移动控制">{controls.map(([key,Icon,label])=><button key={key} aria-label={label} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);press(key,true)}} onPointerUp={()=>press(key,false)} onPointerCancel={()=>press(key,false)} onLostPointerCapture={()=>press(key,false)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();press(key,true)}}} onKeyUp={e=>{if(e.key==='Enter'||e.key===' ')press(key,false)}}><Icon size={18} strokeWidth={2}/></button>)}</div>;
}

function MiniMap(){
  return <aside className="minimap" aria-label="营地地图"><div className="map-north">N</div><svg viewBox="0 0 200 200" aria-hidden="true">
    <defs><radialGradient id="map-ground"><stop stopColor="#8c8d57"/><stop offset="1" stopColor="#353e2a"/></radialGradient><clipPath id="map-clip"><circle cx="100" cy="100" r="94"/></clipPath></defs>
    <circle cx="100" cy="100" r="98" fill="#252d28" stroke="#d4c8a3" strokeWidth="1"/><g clipPath="url(#map-clip)"><circle cx="100" cy="100" r="94" fill="url(#map-ground)"/>
      {Array.from({length:8},(_,i)=><path key={i} d={`M ${-30+i*4} ${20+i*19} Q ${55+i*6} ${-5+i*15} ${72+i*10} ${48+i*15} T ${230} ${72+i*17}`} fill="none" stroke="#c7be84" strokeWidth=".7" opacity=".25"/>)}
      <path d="M90 205Q124 143 100 99T110 -20" stroke="#c6b78b" strokeWidth="5" opacity=".35" fill="none"/>
      {PICKUPS.map(p=><circle key={p.id} cx={100+p.x*2.6} cy={100+p.z*2.6} r="1.7" fill="#e2d4a2"/>)}
      <path d="M97 85h6l-1 6h-4z" fill="#ebaa5b"/><path d="M101 83q-4-4 1-7q-1 4 1 5" fill="#e8b576"/>
      <g id="map-player" transform="translate(100 100)"><path d="M0 -6L4 5L0 3L-4 5Z" fill="#faf5cc" stroke="#474931" strokeWidth="1"/></g>
    </g></svg><div className="map-weather"><Sun size={15}/><span>16:20</span><span className="weather-dots">···</span></div></aside>;
}

function CookingOverlay(){return <div className="cooking-overlay" aria-live="polite"><div className="cinema-bar top"/><div className="cinema-bar bottom"/><div className="cooking-captions"><span>把食材放入锅中</span><span>咕嘟、咕嘟……</span><span>香气飘起来了</span><span>完成！</span></div></div>}

function App(){
  const [near,setNear]=useState<Nearby>(null);const state=useGameStore();
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){if(state.phase==='result')state.dismissResult();else state.closePanel();return;}
      if(isEditing(e.target)||state.phase!=='explore')return;
      if(e.key==='Tab'){e.preventDefault();state.openPanel(state.panel==='inventory'?null:'inventory')}
      if(e.key.toLowerCase()==='r')state.openPanel(state.panel==='recipes'?null:'recipes');
      if(e.key.toLowerCase()==='e'){e.preventDefault();state.interact()}
    };
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[state]);
  return <main className={`game-shell phase-${state.phase} ${state.panel?'panel-open':''}`}>
    <GameCanvas onNear={setNear}/><div className="scene-vignette"/>
    {state.phase==='title'&&<div className="title-screen"><div className="title-copy"><div className="title-kicker"><span/> WILDFIRE KITCHEN</div><h1>麦野<span>食光</span></h1><p>风经过旷野，香气留在锅边。</p><button className="start-btn" onClick={state.startGame}>开始冒险 <span>→</span></button><div className="title-foot">探索 · 收集 · 料理</div></div><div className="title-location"><span>第一章</span><b>初见之森</b><small>THE FIRST CAMP</small></div></div>}
    {state.phase==='explore'&&!state.panel&&<>
      <div className="hud"><div className="hud-left"><div className="hearts" aria-label="旅途状态">♥ ♥ ♥</div><div className="location"><b>初见之森</b><span>料理营地</span></div></div><div className="hud-actions"><button title="已发现的食谱" onClick={()=>state.openPanel('recipes')}><BookOpen size={19}/><span>食谱</span><kbd>R</kbd></button><button title="打开背包" onClick={()=>state.openPanel('inventory')}><Backpack size={20}/><span>背包</span><kbd>Tab</kbd></button><button title={state.soundEnabled?'关闭声音':'打开声音'} aria-label={state.soundEnabled?'关闭声音':'打开声音'} onClick={()=>state.setSoundEnabled(!state.soundEnabled)}>{state.soundEnabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button></div></div>
      <div className="objective"><span>◇</span><div><small>{state.totalCooked?'料理的可能性':'第一份野外料理'}</small><p>{state.totalCooked?'寻找新的材料，发现更多食谱':'打开背包，试试面包、牛肉和芝士'}</p></div></div>
      <MiniMap/><div className="controls"><span><kbd>W A S D</kbd> 移动</span><span><kbd>Shift</kbd> 奔跑</span><span>拖动视角</span></div><MobilePad/>
      {near&&<button className="interact-btn" onClick={()=>{if(near.kind==='pot'&&!state.held.length)state.openPanel('inventory');else state.interact()}}><kbd>E</kbd>{near.kind==='pot'?(state.held.length?'烹饪':'手持食材'):`拾取 ${near.label}`}<span>＋</span></button>}
      {state.held.length>0&&<div className="held-hud"><PotIcon size={17}/>{state.held.map((id,i)=><FoodIcon key={`${id}-${i}`} id={id} size={30}/>)}<span>走近料理锅</span></div>}
    </>}
    {state.toast&&state.phase==='explore'&&<div className="toast">{state.toast}</div>}
    {state.panel==='inventory'&&<InventoryPanel/>}
    {state.panel==='recipes'&&<Panel title="料理手记" onClose={state.closePanel}><div className="recipe-list">{RECIPES.filter(r=>state.discoveries[r.id]).map(r=><div className="recipe-row" key={r.id}><DishIcon recipe={r} size={62}/><div><b>{r.name}</b><small>{state.discoveries[r.id].count} 次完成 · {r.subtitle}</small></div></div>)}{!Object.keys(state.discoveries).length&&<div className="empty-recipe">火已经生好了。<br/>第一份食谱，正等着你发现。</div>}</div></Panel>}
    {state.phase==='cooking'&&<CookingOverlay/>}{state.phase==='result'&&<ResultPanel/>}
  </main>;
}
export default App;
