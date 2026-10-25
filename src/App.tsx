import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from 'lucide-react';
import { useGameStore, type Nearby } from './game/store';
import { RECIPES } from './game/data';
import { GameCanvas, isEditing } from './scene/GameScene';
import { DishIcon, FoodIcon } from './ui/FoodIcon';
import { InventoryPanel } from './ui/InventoryPanel';
import { ResultPanel } from './ui/ResultPanel';
import { MiniMap } from './ui/MiniMap';
import { GameIcon } from './ui/GameIcon';
import './ui/styles.css';
import './ui/game-controls.css';

function Panel({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
  return <div className="shade"><section className="panel" role="dialog" aria-label={title}><header><div><small>旅人的记录</small><h2>{title}</h2></div><button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={23}/></button></header>{children}</section></div>;
}

function MobilePad(){
  const press=(key:string,pressed:boolean)=>window.dispatchEvent(new CustomEvent('game:move',{detail:{key,pressed}}));
  const controls=[['w',ArrowUp,'向前'],['a',ArrowLeft,'向左'],['s',ArrowDown,'向后'],['d',ArrowRight,'向右']] as const;
  return <div className="mobile-pad" aria-label="移动控制">{controls.map(([key,Icon,label])=><button key={key} aria-label={label} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);press(key,true)}} onPointerUp={()=>press(key,false)} onPointerCancel={()=>press(key,false)} onLostPointerCapture={()=>press(key,false)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();press(key,true)}}} onKeyUp={e=>{if(e.key==='Enter'||e.key===' ')press(key,false)}}><Icon size={18} strokeWidth={2}/></button>)}</div>;
}

function CookingOverlay(){
  const matching=useGameStore(s=>s.matching),startedAt=useGameStore(s=>s.cookingStartedAt);
  const [waiting,setWaiting]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>setWaiting(true),Math.max(0,5600-(performance.now()-startedAt)));return()=>window.clearTimeout(timer)},[startedAt]);
  return <div className="cooking-overlay" aria-live="polite"><div className="cinema-bar top"/><div className="cinema-bar bottom"/>
    {!(waiting&&matching)&&<div className="cooking-captions"><span>把食材放入锅中</span><span>咕嘟、咕嘟……</span><span>香气飘起来了</span><span>{matching?'正在确认餐品…':'完成！'}</span></div>}
    {matching&&<div className="menu-wait"><p>{waiting?'料理还在准备中，请稍候…':'正在寻找最合适的料理…'}</p><button className="subtle-btn" onClick={useGameStore.getState().cancelCooking}>取回食材</button></div>}
  </div>;
}

function App(){
  const [near,setNear]=useState<Nearby>(null);const state=useGameStore();
  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.defaultPrevented)return;
      if(e.key==='Escape'){e.preventDefault();if(state.phase==='result')state.dismissResult();else state.closePanel();return;}
      if(isEditing(e.target)||state.phase!=='explore')return;
      if(e.key==='Tab'){e.preventDefault();state.openPanel(state.panel==='inventory'?null:'inventory')}
      if(e.key.toLowerCase()==='r')state.openPanel(state.panel==='recipes'?null:'recipes');
      if(e.key.toLowerCase()==='e'){e.preventDefault();state.interact()}
    };
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[state]);
  return <main className={`game-shell phase-${state.phase} ${state.panel?'panel-open':''}`}>
    <GameCanvas onNear={setNear}/><div className="scene-vignette"/>
    {state.phase==='title'&&<div className="title-screen"><div className="title-copy"><div className="title-kicker"><span/> THE LEGEND OF MCDONALD'S</div><h1>麦当劳<span>传说</span></h1><p>风经过旷野，香气留在锅边。</p><button className="start-btn" onClick={state.startGame}>开始冒险 <span>→</span></button><div className="title-foot">探索 · 收集 · 料理</div></div><div className="title-location"><span>第一章</span><b>初见之森</b><small>THE FIRST CAMP</small></div></div>}
    {state.phase==='explore'&&!state.panel&&<>
      <div className="hud"><div className="hud-left"><div className="hearts" aria-label="旅途状态：三颗心">{[0,1,2].map(i=><GameIcon name="heart" size={23} key={i}/>)}</div><div className="location"><b>初见之森</b><span>料理营地</span></div></div><div className="hud-actions"><button title="已发现的食谱" onClick={()=>state.openPanel('recipes')}><GameIcon name="book" size={20}/><span>食谱</span><kbd>R</kbd></button><button title="打开背包" onClick={()=>state.openPanel('inventory')}><GameIcon name="bag" size={20}/><span>背包</span><kbd>Tab</kbd></button><button title={state.soundEnabled?'关闭声音':'打开声音'} aria-label={state.soundEnabled?'关闭声音':'打开声音'} onClick={()=>state.setSoundEnabled(!state.soundEnabled)}>{state.soundEnabled?<GameIcon name="sound" size={19}/>:<GameIcon name="muted" size={19}/>}</button></div></div>
      <div className="objective"><GameIcon name="quest" size={23}/><div><small>{state.totalCooked?'料理的可能性':'第一份野外料理'}</small><p>{state.totalCooked?'试试不同主料，发现 14 种料理':'打开背包，搭配主料与配料做料理'}</p></div></div>
      <MiniMap/><div className="controls"><span><kbd>W A S D</kbd> 移动</span><span><kbd>Shift</kbd> 奔跑</span><span>拖动视角</span></div><MobilePad/>
      {near&&<button className="interact-btn" onClick={()=>{if(near.kind==='pot'&&!state.held.length)state.openPanel('inventory');else state.interact()}}><kbd>E</kbd>{near.kind==='pot'?(state.held.length?'烹饪':'手持食材'):`拾取 ${near.label}`}<span>＋</span></button>}
      {state.held.length>0&&<div className="held-hud"><GameIcon name="pot" size={17}/>{state.held.map((id,i)=><FoodIcon key={`${id}-${i}`} id={id} size={30}/>)}<span>走近料理锅</span></div>}
    </>}
    {state.toast&&state.phase==='explore'&&<div className="toast">{state.toast}</div>}
    {state.panel==='cook-error'&&<Panel title="这锅还需要一点时间" onClose={state.closePanel}><div className="cooking-error"><p role="alert">{state.cookingError}</p><p>食材已经放回手中，没有消耗。稍后可以重新烹饪。</p><div className="result-actions"><button className="outline-btn" onClick={()=>{state.closePanel();state.setNearby({kind:'pot',label:'料理锅'});void state.startCooking()}}>重试这锅料理</button></div></div></Panel>}
    {state.panel==='inventory'&&<InventoryPanel/>}
    {state.panel==='recipes'&&<Panel title="料理手记" onClose={state.closePanel}><div className="recipe-list">{RECIPES.filter(r=>state.discoveries[r.id]).map(r=><div className="recipe-row" key={r.id}><DishIcon recipe={r} size={62}/><div><b>{r.name}</b><small>{state.discoveries[r.id].count} 次完成 · {r.subtitle}</small></div></div>)}{!Object.keys(state.discoveries).length&&<div className="empty-recipe">火已经生好了。<br/>第一份食谱，正等着你发现。</div>}</div></Panel>}
    {state.phase==='cooking'&&<CookingOverlay/>}{state.phase==='result'&&<ResultPanel/>}
  </main>;
}
export default App;
