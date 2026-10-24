import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TREES, PICKUPS, clearingAt, heightAt, random } from './world';
import { between, toonRamp } from './materials';

function groundTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#ddddc9';ctx.fillRect(0,0,512,512);
  for(let i=0;i<26000;i++){
    const shade=155+Math.floor(random(i*9)*90);
    ctx.fillStyle=`rgba(${shade},${shade},${shade-10},${.1+random(i)*.2})`;
    ctx.fillRect(random(i*9+1)*512,random(i*9+2)*512,1+random(i*9+3)*3,1+random(i*9+4)*2);
  }
  for(let i=0;i<2400;i++){
    const x=random(i*5+11)*512,y=random(i*5+12)*512;
    ctx.strokeStyle=i%2?'#a8ae9440':'#f0ebd040';ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random(i+3)*5-2,y-random(i+7)*6);ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(65,65);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  return texture;
}
function leafTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;
  for(let i=0;i<220;i++){
    const a=random(i*5+8)*6.28,r=Math.sqrt(random(i*5+9))*104;
    const x=128+Math.cos(a)*r,y=128+Math.sin(a)*r*.85;
    ctx.save();ctx.translate(x,y);ctx.rotate(a+random(i));
    const v=175+Math.floor(random(i*5+11)*80);ctx.fillStyle=`rgb(${v},${v},${v})`;
    const w=3+random(i*5+12)*5,l=7+random(i*5+13)*8;
    ctx.beginPath();ctx.moveTo(0,-l);ctx.quadraticCurveTo(w,0,0,l);ctx.quadraticCurveTo(-w,0,0,-l);ctx.fill();ctx.restore();
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function Terrain() {
  const texture=useMemo(groundTexture,[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(280, 280, 240, 240);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const green = new THREE.Color('#8da454'), light = new THREE.Color('#b1b96c'), soil = new THREE.Color('#b8a379');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, heightAt(x,z));
      const patch = (Math.sin(x*.19+Math.sin(z*.14)*2) * Math.cos(z*.21)+1)*.5;
      const c = green.clone().lerp(light,patch*.65).lerp(soil, clearingAt(x,z)*.93);
      c.multiplyScalar(.94 + random(i)*.10);
      c.toArray(colors, i*3);
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));
    g.computeVertexNormals();
    return g;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors map={texture} bumpMap={texture} bumpScale={.055} roughness={1}/></mesh>;
}

function Grass() {
  const { geometry, material } = useMemo(() => {
    const positions:number[] = [], colors:number[] = [], normals:number[] = [];
    const base = new THREE.Color('#718c35'), tip = new THREE.Color('#b6c970');
    // Single batched mesh; blades are rooted in the same surface used by the avatar.
    for(let i=0;i<115000;i++){
      const angle=random(i*7+1)*Math.PI*2, radius=Math.sqrt(random(i*7+2))*38;
      const x=Math.cos(angle)*radius, z=Math.sin(angle)*radius-3;
      if(random(i*7+3)<clearingAt(x,z)*.99 || PICKUPS.some(p=>Math.hypot(p.x-x,p.z-z)<.75))continue;
      const h=.12+random(i*7+4)*.29, w=.008+random(i*7+5)*.018, yaw=random(i*7+6)*6.28;
      const y=heightAt(x,z)-.015, dx=Math.cos(yaw)*w, dz=Math.sin(yaw)*w;
      const bend=.04+random(i*11)*.08;
      positions.push(x-dx,y,z-dz,x+dx,y,z+dz,x+dx*.55+bend*.35,y+h*.55,z+dz*.55,
        x-dx,y,z-dz,x+dx*.55+bend*.35,y+h*.55,z+dz*.55,x+bend,y+h,z+.025);
      const shade=.84+random(i+78)*.24;
      base.clone().multiplyScalar(shade).toArray(colors,colors.length);
      base.clone().multiplyScalar(shade).toArray(colors,colors.length);
      tip.clone().lerp(base,random(i+95)*.4).multiplyScalar(shade).toArray(colors,colors.length);
      base.clone().multiplyScalar(shade).toArray(colors,colors.length);
      tip.clone().lerp(base,.4).multiplyScalar(shade).toArray(colors,colors.length);
      tip.clone().multiplyScalar(shade).toArray(colors,colors.length);
      normals.push(0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    const roots=new Float32Array(positions.length/3);
    for(let i=0;i<roots.length;i++) roots[i]=i%6===5?1:(i%6===2||i%6===4?.5:0);
    g.setAttribute('bladeTip',new THREE.BufferAttribute(roots,1));
    const m=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1});
    m.onBeforeCompile=shader=>{
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal *= gl_FrontFacing ? 1.0 : -1.0;');
      shader.uniforms.uWind={value:0}; m.userData.shader=shader;
      shader.vertexShader='uniform float uWind; attribute float bladeTip;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float wind = sin(position.x * .55 + position.z * .38 + uWind * 1.65);
        transformed.x += (wind * .14 + .08) * bladeTip;
        transformed.z += cos(position.z * .36 + uWind) * .07 * bladeTip;`);
    };
    return {geometry:g, material:m};
  },[]);
  useFrame(({clock})=>{if(material.userData.shader)material.userData.shader.uniforms.uWind.value=clock.elapsedTime;});
  useEffect(()=>()=>{geometry.dispose();material.dispose()},[geometry,material]);
  return <mesh geometry={geometry} material={material} receiveShadow frustumCulled={false}/>;
}

function Woodland() {
  const leaves=useRef<THREE.InstancedMesh>(null), leafCards=useRef<THREE.InstancedMesh>(null);
  const leafMap=useMemo(leafTexture,[]);
  useEffect(()=>()=>leafMap.dispose(),[leafMap]);
  const { bark, canopy, material }=useMemo(()=>{
    const trunks:THREE.BufferGeometry[]=[];
    const crown:{position:THREE.Vector3;scale:THREE.Vector3;color:THREE.Color;angle:number}[]=[];
    TREES.forEach(([x,z,s],i)=>{
      const y=heightAt(x,z), trunkTop=new THREE.Vector3(x+.25*s,y+3.3*s,z);
      trunks.push(between(new THREE.Vector3(x,y,z),trunkTop,.27*s,.15*s));
      for(let b=0;b<5;b++){
        const angle=b*2.4+i, end=new THREE.Vector3(x+Math.cos(angle)*1.45*s,y+(3.3+random(i*5+b)*1.2)*s,z+Math.sin(angle)*1.45*s);
        trunks.push(between(new THREE.Vector3(x+.1,y+(2+b*.18)*s,z),end,.11*s,.035*s));
        for(let j=0;j<5;j++){
          const a=j*2.4+b;
          crown.push({position:end.clone().add(new THREE.Vector3(Math.cos(a)*.65*s,(random(j+b*12+i*9)-.3)*.95*s,Math.sin(a)*.65*s)),scale:new THREE.Vector3((.85+random(i+j)*.55)*s,(.58+random(i*j+3)*.38)*s,(.7+random(j+b)*.4)*s),color:new THREE.Color(['#6e963e','#83a747','#9ab755','#6f963b','#8eac46'][Math.floor(random(i*91+j*37+b)*5)]),angle:a});
        }
      }
    });
    const merged=mergeGeometries(trunks);
    trunks.forEach(g=>g.dispose());
    const m=new THREE.MeshStandardMaterial({roughness:1});
    m.onBeforeCompile=shader=>{
      shader.uniforms.uWind={value:0};m.userData.shader=shader;
      shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        transformed.x += sin(uWind * .65 + instanceMatrix[3].x * .4) * .035 * (position.y + 1.0);`);
    };
    return {bark:merged,canopy:crown,material:m};
  },[]);
  useEffect(()=>{
    if(!leaves.current)return;
    const dummy=new THREE.Object3D();
    canopy.forEach((c,i)=>{dummy.position.copy(c.position);dummy.scale.copy(c.scale).multiplyScalar(.72);dummy.rotation.set(.1,c.angle,.1);dummy.updateMatrix();leaves.current!.setMatrixAt(i,dummy.matrix);leaves.current!.setColorAt(i,c.color)});
    canopy.forEach((c,i)=>{for(let k=0;k<7;k++){
      const a=k*2.4+i;
      dummy.position.copy(c.position).add(new THREE.Vector3(Math.cos(a)*c.scale.x*.5,(random(i*7+k)-.4)*c.scale.y,Math.sin(a)*c.scale.z*.5));
      dummy.scale.set(c.scale.x*1.9,c.scale.y*1.9,1);
      dummy.rotation.set((random(i*11+k)-.5)*2.6,a,(random(k*33+i)-.5)*1.5);dummy.updateMatrix();
      leafCards.current!.setMatrixAt(i*7+k,dummy.matrix);leafCards.current!.setColorAt(i*7+k,c.color);
    }});
    leafCards.current!.instanceMatrix.needsUpdate=true;
    if(leafCards.current!.instanceColor)leafCards.current!.instanceColor.needsUpdate=true;
    leaves.current.instanceMatrix.needsUpdate=true;
    if(leaves.current.instanceColor)leaves.current.instanceColor.needsUpdate=true;
  },[canopy]);
  useFrame(({clock})=>{if(material.userData.shader)material.userData.shader.uniforms.uWind.value=clock.elapsedTime});
  useEffect(()=>()=>{bark.dispose();material.dispose()},[bark,material]);
  return <><mesh geometry={bark} castShadow receiveShadow><meshToonMaterial color="#655b40" gradientMap={toonRamp}/></mesh><instancedMesh ref={leaves} args={[undefined,material,canopy.length]} castShadow receiveShadow><icosahedronGeometry args={[1,1]}/></instancedMesh><instancedMesh ref={leafCards} args={[undefined,undefined,canopy.length*7]} castShadow receiveShadow><planeGeometry args={[1,1]}/><meshStandardMaterial map={leafMap} alphaTest={.4} side={THREE.DoubleSide} roughness={1} emissive="#617b27" emissiveIntensity={.12}/></instancedMesh></>;
}

function Ridge({distance,height,color,seed}:{distance:number;height:number;color:string;seed:number}){
  const geometry=useMemo(()=>{
    const g=new THREE.PlaneGeometry(420,65,140,24);g.rotateX(-Math.PI/2);const p=g.attributes.position, colors:number[]=[];const base=new THREE.Color(color);
    for(let i=0;i<p.count;i++){
      const x=p.getX(i);
      const z=p.getZ(i),front=(z+32.5)/65;
      const ridge=height*(.55+Math.sin(x*.019+seed)*.17+Math.sin(x*.049+seed*2)*.15+Math.cos(x*.087+seed)*.12+Math.sin(x*.31+z*.1)*.025);
      const shape=Math.pow(Math.max(0,Math.sin(front*Math.PI)),1.4);
      p.setY(i,ridge*shape-6);
      base.clone().multiplyScalar(.91+shape*.12+Math.sin(x*.08+z*.12)*.035).toArray(colors,i*3);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  },[height,seed,color]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh position={[0,0,-distance]} geometry={geometry}><meshBasicMaterial vertexColors fog={false}/></mesh>;
}

function SkyDome(){
  const material=useMemo(()=>new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
    varying vec3 vPosition; uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    void main(){vec3 dir=normalize(vPosition);float h=max(dir.y,0.);vec3 col=mix(vec3(.57,.75,.78),vec3(.09,.35,.57),pow(h,.55));
      vec2 uv=dir.xz/(max(dir.y,.04))*.8+vec2(time*.002,0);
      float cloud=noise(uv*2.)*.55+noise(uv*4.)*.25+noise(uv*8.)*.13+noise(uv*16.)*.07;
      float mask=smoothstep(.48,.74,cloud)*smoothstep(.02,.22,dir.y);
      col=mix(col,vec3(.98,.98,.9),mask*.8);
      float sun=max(dot(dir,normalize(vec3(-.65,.6,-.5))),0.);
      col+=vec3(.2,.16,.09)*pow(sun,20.)+vec3(.3,.25,.13)*pow(sun,250.);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}),[]);
  useFrame(({clock})=>{material.uniforms.time.value=clock.elapsedTime});
  useEffect(()=>()=>material.dispose(),[material]);
  return <mesh material={material} renderOrder={-10}><sphereGeometry args={[220,40,24]}/></mesh>;
}

function StonesAndFlowers(){
  const rocks=useRef<THREE.InstancedMesh>(null),flowers=useRef<THREE.InstancedMesh>(null);
  useEffect(()=>{
    const d=new THREE.Object3D();
    for(let i=0;i<180;i++){
      const x=(random(i*3+7)-.5)*67,z=(random(i*3+8)-.5)*67;
      d.position.set(x,heightAt(x,z)-.06,z);d.rotation.set(random(i),random(i+1)*6.28,random(i+2));
      const s=.12+random(i*3+9)*.7;d.scale.set(s,s*.7,s*.9);d.updateMatrix();rocks.current!.setMatrixAt(i,d.matrix);rocks.current!.setColorAt(i,new THREE.Color().setHSL(.16,.09,.32+random(i)*.14));
    }
    for(let i=0;i<280;i++){
      const x=(random(i*4+951)-.5)*42,z=(random(i*4+952)-.5)*42;
      d.position.set(x,heightAt(x,z)+.27,z);d.scale.setScalar(clearingAt(x,z)>.25?0:.045+random(i+11)*.035);d.updateMatrix();flowers.current!.setMatrixAt(i,d.matrix);flowers.current!.setColorAt(i,new THREE.Color(i%4===0?'#d8d5ed':'#ede5ba'));
    }
    for(const mesh of [rocks.current,flowers.current]){mesh!.instanceMatrix.needsUpdate=true;if(mesh!.instanceColor)mesh!.instanceColor.needsUpdate=true;}
  },[]);
  return <><instancedMesh ref={rocks} args={[undefined,undefined,180]} castShadow receiveShadow><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial roughness={1}/></instancedMesh><instancedMesh ref={flowers} args={[undefined,undefined,280]}><icosahedronGeometry args={[1,0]}/><meshToonMaterial gradientMap={toonRamp}/></instancedMesh></>;
}

function Tent(){
  const cloth=useMemo(()=>{
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([
      -1.45,0,-1.4,0,1.8,-1.4,0,1.8,1.4,-1.45,0,-1.4,0,1.8,1.4,-1.45,0,1.4,
      0,1.8,-1.4,1.45,0,-1.4,1.45,0,1.4,0,1.8,-1.4,1.45,0,1.4,0,1.8,1.4,
      -1.45,0,-1.4,1.45,0,-1.4,0,1.8,-1.4,
      -1.45,0,1.4,0,1.8,1.4,-.4,0,1.4,0,1.8,1.4,1.45,0,1.4,.9,0,1.4,
    ],3));g.computeVertexNormals();return g;
  },[]);
  useEffect(()=>()=>cloth.dispose(),[cloth]);
  return <group position={[-5.8,heightAt(-5.8,-6),-6]} rotation={[0,.3,0]}>
    <mesh geometry={cloth} castShadow receiveShadow><meshToonMaterial color="#a99f71" gradientMap={toonRamp} side={THREE.DoubleSide}/></mesh>
    {[-1.45,1.45].map(z=><mesh key={z} position={[0,.95,z]} castShadow><cylinderGeometry args={[.045,.06,1.95,6]}/><meshToonMaterial color="#62513b"/></mesh>)}
    <mesh position={[0,1.82,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.045,.045,3.1,6]}/><meshToonMaterial color="#5a4934"/></mesh>
    <mesh position={[-.1,.1,.1]} rotation={[0,0,Math.PI/2]} scale={[.23,1.1,.35]}><cylinderGeometry args={[1,1,1,12]}/><meshToonMaterial color="#4e6657"/></mesh>
  </group>;
}

export function Crate({position,scale=1}:{position:[number,number,number];scale?:number}){
  return <group position={position} scale={scale}>
    <mesh position={[0,.23,0]} castShadow receiveShadow><boxGeometry args={[.9,.46,.7]}/><meshToonMaterial color="#6d5032" gradientMap={toonRamp}/></mesh>
    {[0,1,2].map(i=><group key={i}><mesh position={[0,.08+i*.15,.365]} castShadow><boxGeometry args={[.96,.11,.055]}/><meshToonMaterial color={i%2?'#a78752':'#9a7b4b'} gradientMap={toonRamp}/></mesh><mesh position={[0,.08+i*.15,-.365]}><boxGeometry args={[.96,.11,.055]}/><meshToonMaterial color="#9a7b4b" gradientMap={toonRamp}/></mesh></group>)}
    {[-.37,.37].map(x=><mesh key={x} position={[x,.25,.4]}><boxGeometry args={[.075,.52,.06]}/><meshToonMaterial color="#665039" gradientMap={toonRamp}/></mesh>)}
    {[0,1,2,3].map(i=><mesh key={i} position={[-.35+i*.235,.48,0]} receiveShadow><boxGeometry args={[.22,.06,.76]}/><meshToonMaterial color="#af8e57" gradientMap={toonRamp}/></mesh>)}
  </group>;
}

function CampProps(){
  return <>
    <Tent/>
    <group position={[4.1,heightAt(4.1,-5)+.3,-5]} rotation={[0,-.5,Math.PI/2]}>
      <mesh castShadow><cylinderGeometry args={[.3,.34,2.7,10]}/><meshToonMaterial color="#574b33" gradientMap={toonRamp}/></mesh>
      {[-1.36,1.36].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[.27,.27,.015,16]}/><meshToonMaterial color="#bfab76" gradientMap={toonRamp}/></mesh>)}
    </group>
    <group position={[8,heightAt(8,-15),-15]} rotation={[0,-.4,0]}>
      {Array.from({length:10},(_,i)=><mesh key={i} position={[(i<5?-1:1)*1.55,(i%5)*.6+.3,0]} rotation={[0,(i%3)*.035,(i%2)*.025]} castShadow receiveShadow><boxGeometry args={[.88,.57,.95]}/><meshToonMaterial color={i%3?'#8b9180':'#73836b'} gradientMap={toonRamp}/></mesh>)}
      {Array.from({length:9},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/8)*1.55,2.8+Math.sin(i*Math.PI/8)*1.55,0]} rotation={[0,0,i*Math.PI/8-Math.PI/2]} castShadow><boxGeometry args={[.65,.65,1]}/><meshToonMaterial color="#9a9e89" gradientMap={toonRamp}/></mesh>)}
      <mesh position={[2.6,.3,1.3]} rotation={[.1,.6,-.2]} castShadow><boxGeometry args={[1.1,.55,.9]}/><meshToonMaterial color="#7f8977" gradientMap={toonRamp}/></mesh>
    </group>
    <group position={[-3.5,heightAt(-3.5,-4.8),-4.8]}><mesh position={[0,.33,0]} castShadow scale={[.33,.47,.33]}><sphereGeometry args={[1,12,10]}/><meshToonMaterial color="#976445" gradientMap={toonRamp}/></mesh><mesh position={[0,.7,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.13,.045,6,16]}/><meshToonMaterial color="#ab7952" gradientMap={toonRamp}/></mesh></group>
  </>;
}

function Birds(){
  const ref=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(ref.current){ref.current.position.x=Math.sin(clock.elapsedTime*.025)*20;ref.current.rotation.y=clock.elapsedTime*.012;}});
  return <group ref={ref} position={[0,17,-55]}>{[0,1,2,3,4].map(i=><group key={i} position={[i*2.1,Math.sin(i)*.7,-i*.8]}>{[-1,1].map(side=><mesh key={side} rotation={[0,0,side*.2]} position={[side*.25,0,0]} scale={[.5,.025,.1]}><sphereGeometry args={[1,6,4]}/><meshBasicMaterial color="#647e7f"/></mesh>)}</group>)}</group>;
}

export function Environment(){
  return <>
    <color attach="background" args={['#bfd6cd']}/><fog attach="fog" args={['#bfd6cd',38,135]}/>
    <ambientLight intensity={.3} color="#e3ecda"/>
    <hemisphereLight intensity={1.35} color="#c4e0ed" groundColor="#78834c"/>
    <directionalLight position={[-18,27,12]} intensity={2.8} color="#fff1cd" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} shadow-camera-near={1} shadow-camera-far={75} shadow-bias={-.00035} shadow-normalBias={.035} shadow-radius={3}/>
    <SkyDome/>
    <Ridge distance={130} height={56} color="#93b0b4" seed={3}/><Ridge distance={105} height={39} color="#78999e" seed={6}/><Ridge distance={80} height={23} color="#718d85" seed={2}/>
    <Terrain/><Grass/><Woodland/><StonesAndFlowers/><CampProps/><Birds/>
  </>;
}
