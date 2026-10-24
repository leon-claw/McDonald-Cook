import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore, type Nearby } from '../game/store';
import { COOK_DURATION, INGREDIENT_BY_ID } from '../game/data';
import { COLLIDERS, PICKUPS, heightAt, type Pickup } from './world';
import { Adventurer, type TravelerMotion } from './Adventurer';
import { CookingPot } from './CookingPot';
import { Environment, Crate } from './Environment';
import { FoodModel } from './FoodModels';

export const isEditing = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('input, select, textarea, button, a, [contenteditable="true"]'));

function useKeys(){
  const keys=useRef(new Set<string>());
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{const s=useGameStore.getState();if(isEditing(e.target)||s.phase!=='explore'||s.panel)return;keys.current.add(e.key.toLowerCase());if(['w','a','s','d','Tab',' '].includes(e.key))e.preventDefault()};
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    const clear=()=>keys.current.clear();
    const move=(e:Event)=>{const d=(e as CustomEvent<{key:string;pressed:boolean}>).detail;if(d.pressed)keys.current.add(d.key);else keys.current.delete(d.key)};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);window.addEventListener('game:move',move);document.addEventListener('visibilitychange',clear);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);window.removeEventListener('game:move',move);document.removeEventListener('visibilitychange',clear)};
  },[]);return keys;
}

function Supply({pickup}:{pickup:Pickup}){
  const ref=useRef<THREE.Group>(null),spark=useRef<THREE.Mesh>(null);
  const collected=useGameStore(s=>s.collected[pickup.id]??0);
  const plant=['lettuce','tomato','chili'].includes(pickup.ingredient);
  useFrame(({clock})=>{
    if(ref.current)ref.current.visible=collected<Date.now();
    if(spark.current){spark.current.rotation.y=clock.elapsedTime;spark.current.scale.setScalar(.035+Math.max(0,Math.sin(clock.elapsedTime*2+pickup.x))*.04)}
  });
  return <group position={[pickup.x,heightAt(pickup.x,pickup.z),pickup.z]} rotation={[0,pickup.x*.2,0]}>
    {!plant&&<Crate position={[0,0,0]} scale={.9}/>}
    <group ref={ref} position={[0,plant?.3:.56,0]}>
      <FoodModel id={pickup.ingredient} scale={plant?.75:.64}/>
      {!plant&&<group position={[-.19,.03,-.14]} rotation={[0,.7,.1]}><FoodModel id={pickup.ingredient} scale={.4}/></group>}
      <mesh ref={spark} position={[0,.5,0]}><octahedronGeometry args={[1,0]}/><meshBasicMaterial color="#fff5c8"/></mesh>
    </group>
  </group>;
}

function Scene({onNear}:{onNear:(near:Nearby)=>void}){
  const motion=useRef<TravelerMotion>({x:0,z:-.2,yaw:Math.PI,speed:0});
  const orbit=useRef({yaw:.05,pitch:.16,distance:6.2});
  const keys=useKeys();const {camera,gl,size}=useThree();
  const phase=useGameStore(s=>s.phase),panel=useGameStore(s=>s.panel),nearby=useGameStore(s=>s.nearby);
  const lastPhase=useRef(phase),proximityClock=useRef(0);
  const vectors=useMemo(()=>({position:new THREE.Vector3(),target:new THREE.Vector3(),look:new THREE.Vector3(0,1,-4)}),[]);
  useEffect(()=>{
    const canvas=gl.domElement;let dragging=false,lastX=0,lastY=0;
    const down=(e:PointerEvent)=>{if(useGameStore.getState().phase!=='explore'||useGameStore.getState().panel)return;dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)};
    const move=(e:PointerEvent)=>{if(!dragging)return;orbit.current.yaw-=(e.clientX-lastX)*.004;orbit.current.pitch=THREE.MathUtils.clamp(orbit.current.pitch+(e.clientY-lastY)*.003,-.08,.7);lastX=e.clientX;lastY=e.clientY};
    const up=()=>{dragging=false};
    const wheel=(e:WheelEvent)=>{if(useGameStore.getState().phase!=='explore'||useGameStore.getState().panel)return;orbit.current.distance=THREE.MathUtils.clamp(orbit.current.distance+e.deltaY*.004,3.8,8.5)};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:true});
    return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel)};
  },[gl]);
  useFrame(({clock},rawDelta)=>{
    const delta=Math.min(rawDelta,.05),state=useGameStore.getState(),m=motion.current,o=orbit.current;
    const mobile=size.width<720;
    if(state.phase!==lastPhase.current){
      if(state.phase==='cooking'){m.x=-1.15;m.z=-2.5;m.yaw=Math.atan2(-m.x,-4-m.z)}
      lastPhase.current=state.phase;
    }
    if(state.phase!=='explore'||state.panel)keys.current.clear();
    const forward=(keys.current.has('w')?1:0)-(keys.current.has('s')?1:0),right=(keys.current.has('d')?1:0)-(keys.current.has('a')?1:0);
    let dx=right*Math.cos(o.yaw)-forward*Math.sin(o.yaw),dz=-forward*Math.cos(o.yaw)-right*Math.sin(o.yaw);
    const length=Math.hypot(dx,dz),speed=length?(keys.current.has('shift')?5.1:2.75):0;
    m.speed=THREE.MathUtils.damp(m.speed,speed,14,delta);
    if(length){
      dx/=length;dz/=length;
      const nx=THREE.MathUtils.clamp(m.x+dx*speed*delta,-21,21),nz=THREE.MathUtils.clamp(m.z+dz*speed*delta,-22,22);
      const blocked=(x:number,z:number)=>COLLIDERS.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+.28);
      if(!blocked(nx,m.z))m.x=nx;if(!blocked(m.x,nz))m.z=nz;
      const desired=Math.atan2(dx,dz);m.yaw+=Math.atan2(Math.sin(desired-m.yaw),Math.cos(desired-m.yaw));
    }
    const py=heightAt(m.x,m.z);
    let fov=mobile?57:48;
    if(state.phase==='title'){
      vectors.position.set(7+Math.sin(clock.elapsedTime*.06)*.7,3.8,6.5);vectors.target.set(-.6,1.25,-4);
    }else if(state.phase==='cooking'){
      const t=(performance.now()-state.cookingStartedAt)/1000;
      vectors.position.set(3.9-t*.065,2.65,-.35-t*.035);vectors.target.set(-.25,t>4.2?1.65:1.18,-3.85);fov=mobile?54:43;
      if(t>=COOK_DURATION)state.finishCooking();
    }else if(state.phase==='result'){
      vectors.position.set(mobile?3.6:4.2,mobile?3.2:2.8,.1);vectors.target.set(mobile?0:1.25,mobile?.9:1.65,-3.8);fov=mobile?52:42;
    }else if(state.panel==='inventory'){
      vectors.position.set(m.x+1.3,py+1.75,m.z+3.2);vectors.target.set(m.x-(mobile?.25:1.0),py+.95,m.z);fov=mobile?48:39;m.yaw=.32;
    }else{
      vectors.position.set(m.x+Math.sin(o.yaw)*o.distance+Math.cos(o.yaw)*.65,py+2.55+o.pitch*4,m.z+Math.cos(o.yaw)*o.distance-Math.sin(o.yaw)*.65);
      vectors.target.set(m.x-Math.sin(o.yaw)*2,py+1.45,m.z-Math.cos(o.yaw)*2);
    }
    const blend=1-Math.exp(-delta*(state.phase==='cooking'?3.5:5));
    camera.position.lerp(vectors.position,blend);vectors.look.lerp(vectors.target,blend);camera.lookAt(vectors.look);
    if(camera instanceof THREE.PerspectiveCamera&&Math.abs(camera.fov-fov)>.01){camera.fov=THREE.MathUtils.damp(camera.fov,fov,5,delta);camera.updateProjectionMatrix()}
    proximityClock.current+=delta;
    if(proximityClock.current<.12)return;proximityClock.current=0;
    const mapPlayer=document.getElementById('map-player');
    if(mapPlayer)mapPlayer.setAttribute('transform',`translate(${100+m.x*2.6} ${100+m.z*2.6}) rotate(${-m.yaw*180/Math.PI+180})`);
    let next:Nearby=null;
    if(state.phase==='explore'&&!state.panel){
      if(Math.hypot(m.x,m.z+4)<2.45)next={kind:'pot',label:state.held.length?'烹饪':'打开背包，手持食材'};
      else{
        let best:Pickup|undefined,dist=Infinity;
        for(const p of PICKUPS){if((state.collected[p.id]??0)>Date.now())continue;const d=Math.hypot(p.x-m.x,p.z-m.z);if(d<dist){dist=d;best=p}}
        if(best&&dist<1.7)next={kind:'ingredient',label:INGREDIENT_BY_ID[best.ingredient].name,ingredientId:best.ingredient,spawnId:best.id};
      }
    }
    if(next?.kind!==state.nearby?.kind||next?.label!==state.nearby?.label||next?.spawnId!==state.nearby?.spawnId){state.setNearby(next);onNear(next)}
  });
  return <>
    <Environment/><CookingPot motion={motion}/><Adventurer motion={motion}/>
    {PICKUPS.map(p=><Supply key={p.id} pickup={p}/>)}
    {nearby&&phase==='explore'&&!panel&&<Html position={nearby.kind==='pot'?[0,1.6,-4]:[PICKUPS.find(p=>p.id===nearby.spawnId)!.x,1.2,PICKUPS.find(p=>p.id===nearby.spawnId)!.z]} center><div className="world-label">{nearby.kind==='pot'?'料理锅':nearby.label}<span>◆</span></div></Html>}
  </>;
}

export function GameCanvas({onNear}:{onNear:(near:Nearby)=>void}){
  return <Canvas shadows dpr={[1,1.7]} camera={{position:[7,3.8,6.5],fov:48,near:.1,far:350}} gl={{antialias:true,powerPreference:'high-performance',toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.1}}><Scene onNear={onNear}/></Canvas>;
}
