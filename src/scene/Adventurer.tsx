import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/store';
import type { IngredientId } from '../game/data';
import { FoodModel } from './FoodModels';
import { toonRamp } from './materials';
import { heightAt } from './world';

export type TravelerMotion = {x:number;z:number;yaw:number;speed:number};
const colors={cloth:'#2985aa',hem:'#1b5a76',skin:'#e7b68a',hair:'#c49a49',leather:'#664c34',pants:'#c4b997',boot:'#4b4032',ivory:'#e1dac0'};
const material=(color:string)=><meshToonMaterial color={color} gradientMap={toonRamp}/>;

function Tunic(){
  const geo=useMemo(()=>{
    const positions:number[]=[], indices:number[]=[];
    // Tailored, elliptical cross sections: hem, waist, ribs, shoulders, neck.
    const levels=[[.72,.32,.19],[.94,.245,.155],[1.12,.24,.16],[1.31,.29,.17],[1.38,.22,.135],[1.42,.115,.10]];
    levels.forEach(([y,w,d],row)=>{for(let i=0;i<16;i++){const a=i/16*Math.PI*2;positions.push(Math.sin(a)*w,y+(row===0?Math.cos(a*4)*.025:0),Math.cos(a)*d)}});
    for(let r=0;r<levels.length-1;r++)for(let i=0;i<16;i++){const a=r*16+i,b=r*16+(i+1)%16;indices.push(a,b,a+16,b,b+16,a+16)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[]);
  return <><mesh geometry={geo} castShadow receiveShadow>{material(colors.cloth)}</mesh>
    <mesh position={[0,.77,.185]} scale={[.22,.018,.01]}><boxGeometry args={[1,1,1]}/>{material(colors.ivory)}</mesh>
    <mesh position={[0,1.22,.17]} rotation={[0,0,.05]}><boxGeometry args={[.035,.23,.015]}/>{material(colors.ivory)}</mesh>
    {[0,1,2].map(i=><mesh key={i} position={[0,1.28-i*.06,.184]} rotation={[0,0,-.28]}><boxGeometry args={[.105,.013,.013]}/>{material('#cbbf99')}</mesh>)}
    {[-1,1].map(side=><mesh key={side} position={[side*.12,1.39,.09]} rotation={[0,0,side*-.45]}><boxGeometry args={[.14,.05,.1]}/>{material(colors.hem)}</mesh>)}
    <mesh position={[0,.99,0]} scale={[1,1,.65]}><cylinderGeometry args={[.265,.27,.09,16]}/>{material(colors.leather)}</mesh>
    <mesh position={[.05,1,.182]}><boxGeometry args={[.085,.08,.025]}/>{material('#c1a669')}</mesh>
    <mesh position={[-.04,1.20,-.17]} rotation={[0,0,-.7]}><boxGeometry args={[.075,.5,.04]}/>{material(colors.leather)}</mesh>
    <mesh position={[-.04,1.2,.17]} rotation={[0,0,-.7]}><boxGeometry args={[.055,.5,.025]}/>{material(colors.leather)}</mesh>
    <mesh position={[-.25,.91,.03]} scale={[.105,.135,.095]} castShadow><boxGeometry args={[1,1,1]}/>{material('#8b6843')}</mesh>
    <mesh position={[-.25,.97,.13]}><boxGeometry args={[.19,.055,.025]}/>{material('#a47e50')}</mesh>
  </>;
}

function HairLock({points,radius=.07}:{points:[number,number,number][];radius?:number}){
  const g=useMemo(()=>{
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const frames=curve.computeFrenetFrames(7,false),positions:number[]=[],indices:number[]=[];
    for(let i=0;i<=7;i++){
      const p=curve.getPoint(i/7),r=radius*(1-i/8);
      for(let j=0;j<6;j++){const a=j/6*Math.PI*2;const v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);positions.push(...v.toArray())}
    }
    for(let i=0;i<7;i++)for(let j=0;j<6;j++){const a=i*6+j,b=i*6+(j+1)%6;indices.push(a,a+6,b,b,a+6,b+6)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  },[points,radius]);
  return <mesh geometry={g} castShadow>{material(colors.hair)}</mesh>;
}

function Head(){
  return <group position={[0,1.66,0]} scale={.68}>
    <mesh scale={[.166,.217,.16]} castShadow><sphereGeometry args={[1,20,16]}/>{material(colors.skin)}</mesh>
    <mesh position={[0,.11,-.025]} scale={[.185,.155,.18]} castShadow><sphereGeometry args={[1,16,12]}/>{material(colors.hair)}</mesh>
    <mesh position={[0,-.004,.161]} rotation={[.15,0,0]} scale={[.032,.055,.05]}><sphereGeometry args={[1,8,6]}/>{material(colors.skin)}</mesh>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*.183,-.015,-.004]} rotation={[0,0,side*-.85]} scale={[.055,.1,.035]} castShadow><sphereGeometry args={[1,8,6]}/>{material(colors.skin)}</mesh>
      <mesh position={[side*.068,.025,.143]} rotation={[0,side*.26,side*-.09]} scale={[.045,.022,.012]}><sphereGeometry args={[1,12,8]}/>{material('#f1ebdc')}</mesh>
      <mesh position={[side*.067,.023,.155]} scale={[.016,.02,.008]}><sphereGeometry args={[1,10,8]}/>{material('#407c8b')}</mesh>
      <mesh position={[side*.067,.024,.161]} scale={[.007,.014,.004]}><sphereGeometry args={[1,8,6]}/>{material('#233c40')}</mesh>
      <mesh position={[side*.07,.057,.146]} rotation={[0,side*.25,side*.08]}><boxGeometry args={[.078,.013,.012]}/>{material('#805f35')}</mesh>
      <HairLock points={[[side*.12,.15,.07],[side*.18,.03,.07],[side*.15,-.18,.06]]} radius={.075}/>
      <HairLock points={[[side*.08,.19,.09],[side*.05,.13,.16],[side*.13,.04,.16]]} radius={.07}/>
      <HairLock points={[[side*.06,.18,-.07],[side*.15,.03,-.13],[side*.13,-.13,-.08]]} radius={.08}/>
    </group>)}
    <HairLock points={[[-.09,.19,.06],[-.07,.12,.18],[-.035,.04,.17]]} radius={.065}/>
    <HairLock points={[[.02,.2,.02],[.09,.17,.17],[.14,.1,.13]]} radius={.065}/>
    <HairLock points={[[0,.07,-.14],[.015,-.1,-.25],[.045,-.32,-.20]]} radius={.09}/>
    <mesh position={[0,-.115,-.222]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.05,.017,5,10]}/>{material('#356c78')}</mesh>
    <mesh position={[0,-.104,.142]}><boxGeometry args={[.045,.008,.005]}/>{material('#a66f53')}</mesh>
  </group>;
}

function Arm({side,arm,forearm}:{side:number;arm:RefObject<THREE.Group|null>;forearm:RefObject<THREE.Group|null>}){
  return <group ref={arm} position={[side*.275,1.30,0]} scale={.92} rotation={[0,0,side*.12]}>
    <mesh position={[0,-.105,0]} castShadow><capsuleGeometry args={[.105,.18,6,10]}/>{material(colors.cloth)}</mesh>
    <mesh position={[0,-.22,0]}><cylinderGeometry args={[.108,.09,.055,10]}/>{material(colors.ivory)}</mesh>
    <group ref={forearm} position={[0,-.26,0]}>
      <mesh position={[0,-.09,0]} castShadow><capsuleGeometry args={[.067,.16,6,10]}/>{material(colors.skin)}</mesh>
      <mesh position={[0,-.13,0]} castShadow><cylinderGeometry args={[.078,.067,.17,10]}/>{material(colors.leather)}</mesh>
      <mesh position={[0,-.24,.005]} scale={[.065,.09,.05]} castShadow><sphereGeometry args={[1,10,8]}/>{material(colors.skin)}</mesh>
      <mesh position={[-side*.05,-.205,.025]} rotation={[0,0,-side*.4]} scale={[.025,.045,.025]}><sphereGeometry args={[1,8,6]}/>{material(colors.skin)}</mesh>
    </group>
  </group>;
}

function Leg({side,leg,knee}:{side:number;leg:RefObject<THREE.Group|null>;knee:RefObject<THREE.Group|null>}){
  return <group ref={leg} position={[side*.13,.93,0]}>
    <mesh position={[0,-.22,0]} castShadow><capsuleGeometry args={[.09,.34,6,12]}/>{material(colors.pants)}</mesh>
    <group ref={knee} position={[0,-.48,0]}>
      <mesh position={[0,-.13,0]} castShadow><capsuleGeometry args={[.078,.19,6,10]}/>{material(colors.pants)}</mesh>
      <mesh position={[0,-.19,0]} castShadow><cylinderGeometry args={[.09,.075,.29,12]}/>{material(colors.boot)}</mesh>
      <mesh position={[0,-.045,.006]}><cylinderGeometry args={[.102,.098,.055,12]}/>{material('#776446')}</mesh>
      <mesh position={[0,-.35,.058]} scale={[.09,.075,.16]} castShadow><sphereGeometry args={[1,12,8]}/>{material(colors.boot)}</mesh>
      <mesh position={[0,-.396,.057]}><boxGeometry args={[.17,.035,.28]}/>{material('#38372b')}</mesh>
      {[0,1].map(i=><mesh key={i} position={[0,-.15-i*.09,.08]} rotation={[0,0,.18]}><boxGeometry args={[.11,.025,.025]}/>{material('#9b855c')}</mesh>)}
    </group>
  </group>;
}

function Equipment(){
  return <group position={[0,1.15,-.22]} rotation={[0,0,-.12]}>
    <mesh rotation={[Math.PI/2,0,0]} castShadow scale={[.92,1,1.1]}><cylinderGeometry args={[.29,.29,.055,16]}/>{material('#73543a')}</mesh>
    <mesh position={[0,0,-.035]}><torusGeometry args={[.275,.023,6,20]}/>{material('#aa9b72')}</mesh>
    {[0,1,2,3].map(i=><mesh key={i} position={[i*.12-.18,0,-.033]}><boxGeometry args={[.008,.42,.012]}/>{material('#493e30')}</mesh>)}
    <mesh position={[0,0,-.05]} scale={[.08,.08,.028]}><sphereGeometry args={[1,10,6]}/>{material('#b4a37a')}</mesh>
    <group position={[.23,.12,.05]} rotation={[0,0,-.5]}>
      <mesh position={[0,-.14,0]} castShadow><boxGeometry args={[.065,.78,.04]}/>{material('#3c575b')}</mesh>
      <mesh position={[0,.37,0]}><cylinderGeometry args={[.035,.032,.2,8]}/>{material('#504733')}</mesh>
      <mesh position={[0,.27,0]}><boxGeometry args={[.22,.045,.07]}/>{material('#a4a27f')}</mesh>
      <mesh position={[0,.49,0]}><sphereGeometry args={[.047,8,6]}/>{material('#b5b48a')}</mesh>
    </group>
  </group>;
}

export function Adventurer({motion}:{motion:RefObject<TravelerMotion>}){
  const root=useRef<THREE.Group>(null),body=useRef<THREE.Group>(null),leftArm=useRef<THREE.Group>(null),rightArm=useRef<THREE.Group>(null),leftFore=useRef<THREE.Group>(null),rightFore=useRef<THREE.Group>(null),leftLeg=useRef<THREE.Group>(null),rightLeg=useRef<THREE.Group>(null),leftKnee=useRef<THREE.Group>(null),rightKnee=useRef<THREE.Group>(null);
  const held=useGameStore(s=>s.held);
  const stride=useRef(0);
  useFrame(({clock},delta)=>{
    const state=useGameStore.getState(),m=motion.current;
    stride.current+=delta*m.speed*3.5;
    const walk=Math.min(m.speed/2.8,1),swing=Math.sin(stride.current)*walk;
    const cooking=state.phase==='cooking',t=(performance.now()-state.cookingStartedAt)/1000;
    if(root.current){root.current.position.set(m.x,heightAt(m.x,m.z),m.z);root.current.rotation.y=THREE.MathUtils.damp(root.current.rotation.y,m.yaw,12,delta)}
    if(body.current){body.current.position.y=Math.abs(Math.sin(stride.current))*walk*.035+Math.sin(clock.elapsedTime*1.8)*.006;body.current.rotation.z=swing*.025;}
    if(leftLeg.current)leftLeg.current.rotation.x=swing*.62;
    if(rightLeg.current)rightLeg.current.rotation.x=-swing*.62;
    if(leftKnee.current)leftKnee.current.rotation.x=Math.max(0,-swing)*.9;
    if(rightKnee.current)rightKnee.current.rotation.x=Math.max(0,swing)*.9;
    const hold=held.length>0;
    const toss=cooking&&t<1.2?Math.sin(Math.min(t/1.2,1)*Math.PI)*1.8:0;
    if(leftArm.current)leftArm.current.rotation.x=hold?-.65:cooking?-toss:swing*.48;
    if(rightArm.current)rightArm.current.rotation.x=hold?-.65:cooking?-toss:-swing*.48;
    if(leftFore.current)leftFore.current.rotation.x=hold?-.9:cooking?-.3:-.12;
    if(rightFore.current)rightFore.current.rotation.x=hold?-.9:cooking?-.3:-.12;
  });
  return <group ref={root}><group ref={body}>
    <group position={[0,.12,0]}><Tunic/><Head/><Equipment/><mesh position={[0,1.47,0]}><cylinderGeometry args={[.07,.085,.14,12]}/>{material(colors.skin)}</mesh>
    <Arm side={-1} arm={leftArm} forearm={leftFore}/><Arm side={1} arm={rightArm} forearm={rightFore}/>
    {held.length>0&&<group position={[0,1.08,.41]}>{held.map((id:IngredientId,i)=><group key={`${id}-${i}`} position={[(i%3-1)*.19,Math.floor(i/3)*.16,(i%2)*.1]} rotation={[0,i*1.5,0]}><FoodModel id={id} scale={.34}/></group>)}</group>}
  </group><Leg side={-1} leg={leftLeg} knee={leftKnee}/><Leg side={1} leg={rightLeg} knee={rightKnee}/></group></group>;
}
