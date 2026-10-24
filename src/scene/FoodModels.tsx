import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { IngredientId, Recipe } from '../game/data';
import { random } from './world';
import { toonRamp } from './materials';
import { BigMacModel } from './BigMacModel';
import { BurgerModel, CheeseSticksModel, ChickenSnackModel, FriesModel } from './MenuFoodModels';

const mat = (color: string) => <meshToonMaterial color={color} gradientMap={toonRamp} />;

function breadTexture() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#e4ab62';ctx.fillRect(0,0,256,256);
  for(let i=0;i<4200;i++){
    const shade=145+Math.floor(random(i*7+1)*85);
    ctx.fillStyle=`rgba(${shade+20},${shade-32},${shade-83},${.05+random(i*7+2)*.15})`;
    ctx.beginPath();ctx.ellipse(random(i*7+3)*256,random(i*7+4)*256,.4+random(i*7+5)*1.5,.5+random(i*7+6)*1.1,0,0,Math.PI*2);ctx.fill();
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}

function Bread(){
  const texture=useMemo(breadTexture,[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  const seeds=useMemo(()=>Array.from({length:44},(_,i)=>{
    const a=i*2.39996,r=Math.sqrt((i+.5)/44)*.86,x=Math.cos(a)*r*.52,z=Math.sin(a)*r*.46;
    const h=Math.sqrt(1-r*r);
    const normal=new THREE.Vector3(x/(.52*.52),h/.26,z/(.46*.46)).normalize();
    return {position:[x,.08+.26*h+.009,z] as [number,number,number],rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal),angle:random(i+18)*Math.PI};
  }),[]);
  return <>
    <mesh scale={[.52,.26,.46]} position={[0,.08,0]} castShadow receiveShadow><sphereGeometry args={[1,32,16,0,Math.PI*2,0,Math.PI/2]}/><meshToonMaterial map={texture} gradientMap={toonRamp}/></mesh>
    <mesh position={[0,.04,0]} scale={[1,1,.46/.52]} castShadow><cylinderGeometry args={[.52,.49,.08,32]}/>{mat('#e0a55d')}</mesh>
    <mesh position={[0,-.005,0]} scale={[1,1,.46/.52]}><cylinderGeometry args={[.49,.48,.012,32]}/>{mat('#efbf78')}</mesh>
    {seeds.map((seed,i)=><group key={i} position={seed.position} quaternion={seed.rotation}><mesh rotation={[0,seed.angle,0]} scale={[.013,.009,.032]}><sphereGeometry args={[1,7,5]}/>{mat(i%4?'#fff0bf':'#e7d49a')}</mesh></group>)}
  </>;
}

function Patty({id}:{id:'beef'|'chicken'|'fish'}){
  const crust=useMemo(()=>{
    const g=new THREE.CylinderGeometry(.43,.46,.16,id==='beef'?40:20,2);
    const p=g.attributes.position,colors:number[]=[];const base=new THREE.Color(id==='beef'?'#70432c':'#dba04d');
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);
      const wobble=1+Math.sin(a*13)*.025+Math.cos(a*21)*.018;
      p.setXYZ(i,x*wobble,y+Math.sin(a*9+x*31)*.008,z*wobble);
      base.clone().multiplyScalar(.76+random(Math.round(x*500+z*230+y*900))* .44).toArray(colors,i*3);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  },[id]);
  useEffect(()=>()=>crust.dispose(),[crust]);
  return <group scale={id==='fish'?[1,1,.7]:[1,1,1]} rotation={[0,.25,0]}>
    <mesh geometry={crust} castShadow receiveShadow><meshToonMaterial vertexColors gradientMap={toonRamp}/></mesh>
    {id==='beef'&&[-1,0,1].map(i=><mesh key={i} position={[i*.17,.088,0]} rotation={[-Math.PI/2,0,.36]}><planeGeometry args={[.025,.66-Math.abs(i)*.1]}/>{mat('#482e22')}</mesh>)}
    {Array.from({length:id==='beef'?28:42},(_,i)=>{const a=i*2.4,r=Math.sqrt(random(i+50))*.37;return <mesh key={i} position={[Math.cos(a)*r,.084,Math.sin(a)*r]} scale={[.017+random(i)*.012,.009,.016]}><dodecahedronGeometry args={[1,0]}/>{mat(id==='beef'?(i%3?'#89573a':'#392a20'):(i%3?'#e5ad54':'#b97d31'))}</mesh>})}
  </group>;
}

function Cheese(){
  const geometry=useMemo(()=>{
    const g=new THREE.PlaneGeometry(.8,.7,10,10);g.rotateX(-Math.PI/2);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i),edge=Math.max(Math.abs(x)/.4,Math.abs(z)/.35);
      p.setY(i,.015-Math.pow(edge,6)*(.025+.045*(.5+.5*Math.sin(x*11+z*8))));
    }
    g.computeVertexNormals();return g;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} rotation={[0,.2,0]} castShadow receiveShadow><meshToonMaterial color="#f6c740" gradientMap={toonRamp} side={THREE.DoubleSide}/></mesh>;
}

export function FoodModel({ id, scale = 1 }: { id: IngredientId; scale?: number }) {
  return <group scale={scale}>
    {id === 'bread' && <Bread/>}
    {(id === 'beef' || id === 'chicken' || id === 'fish') && <Patty id={id}/>}
    {id === 'cheese' && <Cheese/>}
    {id === 'lettuce' && <group>{[0,1,2,3,4].map(i=><mesh key={i} position={[Math.cos(i*1.25)*.19,Math.sin(i*2)*.06,Math.sin(i*1.25)*.18]} scale={[.35,.07,.28]} rotation={[0,i, .18]} castShadow><sphereGeometry args={[1,7,5]} />{mat(i%2?'#94bc4c':'#60a24d')}</mesh>)}</group>}
    {id === 'tomato' && <><mesh scale={[.34,.28,.34]} castShadow><sphereGeometry args={[1,16,12]} />{mat('#d75b43')}</mesh><mesh position={[0,.28,0]} rotation={[0,0,.3]}><cylinderGeometry args={[.025,.04,.16,5]} />{mat('#4c7844')}</mesh></>}
    {id === 'pickle' && <mesh rotation={[0,0,.7]} scale={[.17,.45,.17]} castShadow><capsuleGeometry args={[1,1,3,8]} />{mat('#7b9a3f')}</mesh>}
    {id === 'chili' && <><mesh rotation={[0,0,-.5]} scale={[.18,.5,.18]} castShadow><coneGeometry args={[1,1.8,10]} />{mat('#cd5039')}</mesh><mesh position={[.13,.43,0]} rotation={[0,0,-.4]}><cylinderGeometry args={[.035,.04,.18,6]} />{mat('#577e44')}</mesh></>}
    {id === 'roast-sauce' && <group><mesh position={[0,-.04,0]} castShadow><cylinderGeometry args={[.19,.22,.48,24]}/>{mat('#a56a36')}</mesh><mesh position={[0,.23,0]} castShadow><cylinderGeometry args={[.12,.14,.11,20]}/>{mat('#735235')}</mesh><mesh position={[0,-.02,.203]}><planeGeometry args={[.21,.22]}/>{mat('#e9d19b')}</mesh></group>}
    {id === 'fries' && <group>{[-2,-1,0,1,2].map((n)=><mesh key={n} position={[n*.1,.05+Math.abs(n)*.025,0]} rotation={[0,0,n*.09]} castShadow><boxGeometry args={[.09,.65-Math.abs(n)*.05,.12]} />{mat(n%2?'#eeba48':'#f4cc64')}</mesh>)}</group>}
  </group>;
}

export function DishModel({ recipe, scale = 1 }: { recipe: Recipe; scale?: number }) {
  const variant = recipe.modelVariant;
  if (variant === 'big-mac') return <BigMacModel scale={scale}/>;
  if (variant === 'fries') return <FriesModel scale={scale}/>;
  if (variant === 'nuggets' || variant === 'wings') return <ChickenSnackModel wings={variant === 'wings'} scale={scale * 1.12}/>;
  if (variant === 'cheese-sticks') return <CheeseSticksModel scale={scale * 1.12}/>;
  return <BurgerModel variant={variant} scale={scale * 1.06}/>;
}
