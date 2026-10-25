import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../game/store';
import type { IngredientId } from '../game/data';
import { FoodModel } from './FoodModels';
import { toonRamp } from './materials';
import { heightAt } from './world';

export type TravelerMotion = {x:number;z:number;yaw:number;speed:number};
const colors={cloth:'#2b8cae',hem:'#1d6a8a',skin:'#edc39f',hair:'#dcae4e',leather:'#705039',pants:'#d5c9a8',boot:'#594434',ivory:'#eee4c8'};
const material=(color:string)=><meshToonMaterial color={color} gradientMap={toonRamp}/>;

function Tunic(){
  const geo=useMemo(()=>{
    const positions:number[]=[], indices:number[]=[];
    // Tailored, elliptical cross sections: hem, waist, ribs, shoulders, neck.
    const levels=[[.72,.305,.185],[.94,.24,.15],[1.12,.225,.15],[1.31,.27,.163],[1.38,.215,.132],[1.42,.112,.098]];
    levels.forEach(([y,w,d],row)=>{for(let i=0;i<16;i++){const a=i/16*Math.PI*2;positions.push(Math.sin(a)*w,y+(row===0?Math.cos(a*4)*.025:0),Math.cos(a)*d)}});
    for(let r=0;r<levels.length-1;r++)for(let i=0;i<16;i++){const a=r*16+i,b=r*16+(i+1)%16;indices.push(a,b,a+16,b,b+16,a+16)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[]);
  return <>
    <mesh position={[0,.775,0]} scale={[1,1,.64]} castShadow><cylinderGeometry args={[.265,.3,.22,24]}/>{material(colors.ivory)}</mesh>
    <mesh geometry={geo} castShadow receiveShadow>{material(colors.cloth)}</mesh>
    {[-1,1].map(side=><group key={`seam-${side}`}>
      <mesh position={[side*.233,.87,.092]} rotation={[0,0,side*.19]}><boxGeometry args={[.014,.21,.018]}/>{material(colors.hem)}</mesh>
      {[0,1,2,3].map(i=><mesh key={i} position={[side*(.075+i*.044),.752,.181-i*.012]}><boxGeometry args={[.022,.012,.009]}/>{material(colors.ivory)}</mesh>)}
      <mesh position={[side*.11,1.365,.128]} rotation={[0,0,side*-.5]}><boxGeometry args={[.14,.025,.035]}/>{material(colors.ivory)}</mesh>
    </group>)}
    <mesh position={[0,1.135,.176]}><boxGeometry args={[.018,.17,.012]}/>{material('#f5eacc')}</mesh>
    <mesh position={[0,1.17,.184]}><boxGeometry args={[.092,.013,.01]}/>{material('#f5eacc')}</mesh>
    <mesh position={[0,1.055,.178]} rotation={[0,0,Math.PI/4]}><boxGeometry args={[.035,.035,.012]}/>{material('#f5eacc')}</mesh>
    <mesh position={[0,.77,.185]} scale={[.22,.018,.01]}><boxGeometry args={[1,1,1]}/>{material(colors.ivory)}</mesh>
    <mesh position={[0,1.22,.17]} rotation={[0,0,.05]}><boxGeometry args={[.035,.23,.015]}/>{material(colors.ivory)}</mesh>
    {[0,1,2].map(i=><mesh key={i} position={[0,1.28-i*.06,.184]} rotation={[0,0,-.28]}><boxGeometry args={[.105,.013,.013]}/>{material('#cbbf99')}</mesh>)}
    {[-1,1].map(side=><mesh key={side} position={[side*.12,1.39,.09]} rotation={[0,0,side*-.45]}><boxGeometry args={[.14,.05,.1]}/>{material(colors.hem)}</mesh>)}
    <mesh position={[0,.99,0]} scale={[1,1,.65]}><cylinderGeometry args={[.265,.27,.09,16]}/>{material(colors.leather)}</mesh>
    <mesh position={[.05,1,.182]}><boxGeometry args={[.085,.08,.025]}/>{material('#c1a669')}</mesh>
    <mesh position={[.05,1,.198]}><boxGeometry args={[.052,.047,.009]}/>{material(colors.leather)}</mesh>
    <mesh position={[.05,1,.205]}><boxGeometry args={[.008,.055,.008]}/>{material('#d8c28b')}</mesh>
    <group position={[.27,.92,.055]} rotation={[0,.25,-.12]}>
      <mesh castShadow><boxGeometry args={[.14,.21,.095]}/>{material('#3c5557')}</mesh>
      <mesh position={[0,0,.052]}><boxGeometry args={[.105,.155,.012]}/>{material('#a9864f')}</mesh>
      <mesh position={[0,.012,.061]} scale={[1,1.35,1]}><torusGeometry args={[.028,.006,5,16]}/>{material('#62bdcc')}</mesh>
      <mesh position={[0,.014,.063]}><sphereGeometry args={[.012,8,6]}/>{material('#87dce0')}</mesh>
    </group>
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
  return <group position={[0,1.635,.012]} scale={[.88,.86,.86]}>
    <mesh scale={[.166,.217,.16]} castShadow><sphereGeometry args={[1,32,24]}/>{material(colors.skin)}</mesh>
    <mesh position={[0,-.116,.018]} scale={[.123,.103,.127]} castShadow><sphereGeometry args={[1,24,16]}/>{material(colors.skin)}</mesh>
    <mesh position={[0,.11,-.025]} scale={[.185,.155,.18]} castShadow><sphereGeometry args={[1,16,12]}/>{material(colors.hair)}</mesh>
    <mesh position={[0,-.004,.161]} rotation={[.15,0,0]} scale={[.032,.055,.05]}><sphereGeometry args={[1,8,6]}/>{material(colors.skin)}</mesh>
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*.205,.005,-.004]} rotation={[0,0,side*-.95]} scale={[.05,.135,.032]} castShadow><sphereGeometry args={[1,12,8]}/>{material(colors.skin)}</mesh>
      <mesh position={[side*.205,.005,.024]} rotation={[0,0,side*-.95]} scale={[.022,.082,.008]}><sphereGeometry args={[1,10,6]}/>{material('#cf9678')}</mesh>
      {side===1&&<mesh position={[side*.198,-.055,.03]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.017,.0042,5,12]}/>{material('#79b7ce')}</mesh>}
      <mesh position={[side*.068,.025,.143]} rotation={[0,side*.26,side*-.09]} scale={[.045,.022,.012]}><sphereGeometry args={[1,12,8]}/>{material('#f1ebdc')}</mesh>
      <mesh position={[side*.067,.023,.155]} scale={[.016,.02,.008]}><sphereGeometry args={[1,10,8]}/>{material('#407c8b')}</mesh>
      <mesh position={[side*.067,.024,.161]} scale={[.007,.014,.004]}><sphereGeometry args={[1,8,6]}/>{material('#233c40')}</mesh>
      <mesh position={[side*.063,.032,.165]}><sphereGeometry args={[.004,8,6]}/>{material('#fff9ed')}</mesh>
      <mesh position={[side*.068,.045,.15]} rotation={[0,side*.26,side*-.09]}><boxGeometry args={[.077,.005,.009]}/>{material('#624b37')}</mesh>
      <mesh position={[side*.07,.057,.146]} rotation={[0,side*.25,side*.08]}><boxGeometry args={[.078,.013,.012]}/>{material('#805f35')}</mesh>
      <HairLock points={[[side*.12,.15,.07],[side*.18,.03,.07],[side*.15,-.18,.06]]} radius={.075}/>
      <HairLock points={[[side*.08,.19,.09],[side*.05,.13,.16],[side*.13,.04,.16]]} radius={.07}/>
      <HairLock points={[[side*.06,.18,-.07],[side*.15,.03,-.13],[side*.13,-.13,-.08]]} radius={.08}/>
    </group>)}
    <HairLock points={[[-.09,.19,.06],[-.07,.12,.18],[-.035,.04,.17]]} radius={.065}/>
    <HairLock points={[[.02,.2,.02],[.09,.17,.17],[.14,.1,.13]]} radius={.065}/>
    <HairLock points={[[0,.07,-.14],[.015,-.1,-.25],[.045,-.32,-.20]]} radius={.09}/>
    <HairLock points={[[.035,.02,-.17],[.075,-.17,-.25],[.10,-.30,-.19]]} radius={.064}/>
    <HairLock points={[[-.035,.02,-.17],[-.04,-.14,-.26],[-.01,-.29,-.22]]} radius={.059}/>
    <HairLock points={[[-.11,.17,-.03],[-.18,.0,.04],[-.14,-.23,.08]]} radius={.046}/>
    <HairLock points={[[.10,.18,-.03],[.19,.0,.03],[.16,-.20,.07]]} radius={.049}/>
    <HairLock points={[[-.075,.225,.035],[-.04,.18,.16],[.035,.085,.177]]} radius={.043}/>
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
      <mesh position={[0,-.13,0]} castShadow><cylinderGeometry args={[.078,.067,.17,14]}/>{material(colors.leather)}</mesh>
      <mesh position={[0,-.12,.065]}><boxGeometry args={[.072,.12,.018]}/>{material('#987650')}</mesh>
      {[-1,1].map(i=><mesh key={i} position={[0,-.12+i*.053,.071]}><boxGeometry args={[.088,.014,.012]}/>{material('#c1ab7a')}</mesh>)}
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
  const bow = useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.21,-.43,-.12),new THREE.Vector3(-.41,-.12,-.16),
    new THREE.Vector3(-.43,.18,-.16),new THREE.Vector3(-.24,.46,-.12),
  ]),24,.018,7,false),[]);
  return <group position={[0,1.15,-.22]} rotation={[0,0,-.12]}>
    <mesh geometry={bow} castShadow>{material('#9c754a')}</mesh>
    <mesh position={[-.225,.015,-.12]} rotation={[0,0,-.034]}><cylinderGeometry args={[.002,.002,.89,5]}/>{material('#e1d6b5')}</mesh>
    <group position={[.24,-.12,-.03]} rotation={[0,0,-.23]}>
      <mesh castShadow><cylinderGeometry args={[.065,.048,.38,12]}/>{material('#8b6542')}</mesh>
      <mesh position={[0,.19,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.062,.009,5,12]}/>{material('#c5a97a')}</mesh>
      {[-1,0,1].map((i)=><group key={i} position={[i*.024,.28,i*.014]}>
        <mesh><cylinderGeometry args={[.004,.004,.29,5]}/>{material('#d5bc8b')}</mesh>
        <mesh position={[0,.105,0]} rotation={[0,0,.1]}><boxGeometry args={[.029,.06,.006]}/>{material('#e8debc')}</mesh>
      </group>)}
    </group>
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
