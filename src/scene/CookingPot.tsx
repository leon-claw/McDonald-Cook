import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/store';
import { FoodModel, DishModel } from './FoodModels';
import { toonRamp } from './materials';
import type { TravelerMotion } from './Adventurer';
import { random, heightAt } from './world';

function softTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d')!;const gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,255,255,.55)');gradient.addColorStop(.45,'rgba(255,255,255,.32)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(canvas);
}

function Hearth(){
  const flames=useRef<THREE.Group>(null),light=useRef<THREE.PointLight>(null);
  useFrame(({clock})=>{
    const t=clock.elapsedTime,cooking=useGameStore.getState().phase==='cooking';
    if(flames.current)flames.current.children.forEach((m,i)=>{m.scale.y=.75+Math.sin(t*9+i*2)*.23+(cooking?.45:0);m.rotation.z=Math.sin(t*6+i)*.12;});
    if(light.current)light.current.intensity=(cooking?6:3.3)+Math.sin(t*11)*.5;
  });
  return <>
    <mesh position={[0,.018,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[1.25,40]}/><meshToonMaterial color="#5d5541" gradientMap={toonRamp}/></mesh>
    {Array.from({length:11},(_,i)=>{const a=i/11*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*1.06,.13,Math.sin(a)*1.06]} scale={[.24,.17,.19]} rotation={[random(i),a,random(i+7)]} castShadow receiveShadow><dodecahedronGeometry args={[1,0]}/><meshToonMaterial color={i%2?'#777a68':'#8e8e79'} gradientMap={toonRamp}/></mesh>})}
    {[0,1,2,3,4].map(i=><group key={i} rotation={[0,i*1.25,0]} position={[0,.14,0]}>
      <mesh rotation={[Math.PI/2,0,.1]} position={[0,0,.13]} castShadow><cylinderGeometry args={[.105,.14,1.3,9]}/><meshToonMaterial color="#46382a" gradientMap={toonRamp}/></mesh>
      <mesh position={[0,0,.79]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.11,9]}/><meshToonMaterial color="#a17e4b" gradientMap={toonRamp}/></mesh>
      <mesh position={[.04,.06,.2]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.035,.65]}/><meshBasicMaterial color="#e86728"/></mesh>
    </group>)}
    <group ref={flames}>{Array.from({length:9},(_,i)=><group key={i} position={[Math.cos(i*2.4)*.3,.22,Math.sin(i*2.4)*.3]}>
      <mesh position={[0,.19,0]} scale={[.13,.38+random(i)*.2,.12]}><sphereGeometry args={[1,8,8]}/><meshBasicMaterial color="#f18d27" transparent opacity={.8} depthWrite={false}/></mesh>
      <mesh position={[0,.11,.015]} scale={[.07,.23,.07]}><sphereGeometry args={[1,8,8]}/><meshBasicMaterial color="#ffe28a"/></mesh>
    </group>)}</group>
    <pointLight ref={light} position={[0,.45,0]} color="#ff9a38" intensity={3.4} distance={6} decay={2}/>
  </>;
}

function Steam(){
  const group=useRef<THREE.Group>(null);
  const texture=useMemo(softTexture,[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useFrame(({clock})=>{
    const state=useGameStore.getState(),elapsed=(performance.now()-state.cookingStartedAt)/1000;
    const cooking=state.phase==='cooking',burst=cooking&&elapsed>3.7&&elapsed<4.7;
    group.current?.children.forEach((child,i)=>{
      const smoke=child as THREE.Sprite;
      const p=(clock.elapsedTime*(burst?.9:.26)+i/14)%1;
      smoke.position.set(Math.sin(i*7+p*2)*(.15+p*.5),1.04+p*(burst?2.3:1.5),Math.cos(i*4+p)*(.1+p*.25));
      smoke.scale.setScalar((.2+p*(burst?2.2:1.0))*(cooking?1:.65));
      (smoke.material as THREE.SpriteMaterial).opacity=Math.sin(p*Math.PI)*(cooking?.55:.22);
    });
  });
  return <group ref={group}>{Array.from({length:14},(_,i)=><sprite key={i}><spriteMaterial map={texture} color="#f8f0d4" transparent depthWrite={false}/></sprite>)}</group>;
}

function Embers(){
  const group=useRef<THREE.Group>(null);
  useFrame(({clock})=>{group.current?.children.forEach((m,i)=>{const p=(clock.elapsedTime*.4+random(i))%1;m.position.set(Math.sin(i*5+p*3)*(.3+p*.5),.3+p*1.7,Math.cos(i*4+p*2)*(.3+p*.5));m.scale.setScalar(Math.sin(p*Math.PI)*.018)})});
  return <group ref={group}>{Array.from({length:16},(_,i)=><mesh key={i}><sphereGeometry args={[1,4,4]}/><meshBasicMaterial color="#ffcb62"/></mesh>)}</group>;
}

function CookingIngredients({motion}:{motion:RefObject<TravelerMotion>}){
  const groups=useRef<THREE.Group>(null);
  const ingredients=useGameStore(s=>s.cookedIngredients);
  useFrame(()=>{
    const state=useGameStore.getState(),t=(performance.now()-state.cookingStartedAt)/1000;
    groups.current?.children.forEach((food,i)=>{
      const start=.18+i*.13,u=THREE.MathUtils.clamp((t-start)/.78,0,1);
      food.visible=state.phase==='cooking'&&t>start&&t<3.85;
      if(u<1){
        const x=motion.current.x,z=motion.current.z+4;
        food.position.set(x*(1-u)+Math.sin(i*2.4)*.28*u,1.18+Math.sin(u*Math.PI)*1.55-u*.2,z*(1-u));
      }else{
        const bounce=Math.abs(Math.sin((t-1)*6.8+i*1.4));
        food.position.set(Math.cos(i*2.4+t*1.5)*.35,1.05+bounce*(.6+random(i)*.3),Math.sin(i*2.4+t*1.5)*.35);
      }
      food.rotation.set(t*3+i,t*2+i,t+i);
    });
  });
  return <group ref={groups}>{ingredients.map((id,i)=><group key={`${id}-${i}`}><FoodModel id={id} scale={.48}/></group>)}</group>;
}

function RevealDish(){
  const dish=useRef<THREE.Group>(null),burst=useRef<THREE.Group>(null);
  const recipe=useGameStore(s=>s.result);
  useFrame(({clock})=>{
    const state=useGameStore.getState();
    const revealT=(performance.now()-state.revealStartedAt)/1000;
    const visible=!!state.result&&((state.phase==='cooking'&&revealT>0)||state.phase==='result');
    if(dish.current){
      dish.current.visible=visible;
      const p=THREE.MathUtils.clamp(revealT/.65,0,1),ease=1-Math.pow(1-p,3);
      dish.current.position.y=1.1+ease*1.1+Math.sin(clock.elapsedTime*1.7)*.045;
      dish.current.rotation.y=clock.elapsedTime*.28;
      dish.current.scale.setScalar(.05+ease*1.14);
    }
    if(burst.current){burst.current.visible=visible;burst.current.children.forEach((m,i)=>{const a=i/12*Math.PI*2+clock.elapsedTime*.12;m.position.set(Math.sin(a)*1.25,2.1+Math.cos(a)*.8,Math.sin(i)*.3);m.rotation.z=clock.elapsedTime*.4;m.scale.setScalar(.02+Math.max(0,Math.sin(clock.elapsedTime*2+i))*.035);})}
  });
  return <><group ref={dish} visible={false}>{recipe&&<DishModel recipe={recipe}/>}</group><group ref={burst} visible={false}>{Array.from({length:12},(_,i)=><mesh key={i}><octahedronGeometry args={[1,0]}/><meshBasicMaterial color="#fff1b6"/></mesh>)}</group></>;
}

export function CookingPot({motion}:{motion:RefObject<TravelerMotion>}){
  const pot=useRef<THREE.Group>(null);
  const profile=useMemo(()=>[
    [.0,.42],[.23,.42],[.4,.49],[.55,.64],[.64,.88],[.65,1.02],[.61,1.05],[.57,1.01],[.56,.86],[.47,.64],[.3,.54],[0,.53],
  ].map(([r,y])=>new THREE.Vector2(r,y)),[]);
  useFrame(()=>{
    if(!pot.current)return;
    const state=useGameStore.getState(),t=(performance.now()-state.cookingStartedAt)/1000;
    const stirring=state.phase==='cooking'&&t>1&&t<4.1;
    pot.current.rotation.z=stirring?Math.sin(t*16)*.045:0;
    pot.current.position.y=stirring?Math.abs(Math.sin(t*10))*.035:0;
  });
  return <group position={[0,heightAt(0,-4),-4]}>
    <Hearth/>
    <group ref={pot}>
      <mesh castShadow receiveShadow><latheGeometry args={[profile,48]}/><meshToonMaterial color="#384549" gradientMap={toonRamp} side={THREE.DoubleSide}/></mesh>
      <mesh position={[0,1.035,0]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.624,.047,10,48]}/><meshToonMaterial color="#69716c" gradientMap={toonRamp}/></mesh>
      <mesh position={[0,.73,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.51,32]}/><meshStandardMaterial color="#4c4130" roughness={.25}/></mesh>
      {[-1,1].map(side=><group key={side} position={[side*.66,.86,0]} rotation={[0,Math.PI/2,0]}><mesh castShadow><torusGeometry args={[.16,.038,8,20]}/><meshToonMaterial color="#313a3a" gradientMap={toonRamp}/></mesh><mesh position={[0,-.055,0]}><boxGeometry args={[.16,.11,.07]}/><meshToonMaterial color="#62665d" gradientMap={toonRamp}/></mesh></group>)}
      {[0,1,2].map(i=><group key={i} rotation={[0,i*Math.PI*2/3,0]}><mesh position={[0,.38,.42]} rotation={[.25,0,0]} castShadow><cylinderGeometry args={[.06,.075,.6,8]}/><meshToonMaterial color="#333b38" gradientMap={toonRamp}/></mesh></group>)}
      {Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2;return <mesh key={i} position={[Math.sin(a)*.635,.88,Math.cos(a)*.635]}><sphereGeometry args={[.025,8,6]}/><meshToonMaterial color="#82867b" gradientMap={toonRamp}/></mesh>})}
    </group>
    <Steam/><Embers/><CookingIngredients motion={motion}/><RevealDish/>
  </group>;
}
