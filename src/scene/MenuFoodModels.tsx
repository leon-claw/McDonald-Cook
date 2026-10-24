import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { RecipeId } from '../game/data';
import { bunGeometry, cheeseGeometry, Details, lettuceGeometry, pattyGeometry, type Instance } from './BigMacModel';
import { toonRamp } from './materials';
import { random } from './world';

const material = (color: string, doubleSide = false) => <meshToonMaterial color={color} gradientMap={toonRamp} side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}/>;
const baked = () => <meshToonMaterial vertexColors gradientMap={toonRamp}/>;

function roughen(geometry: THREE.BufferGeometry, color: string, amount: number, seed: number) {
  const p = geometry.attributes.position, colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const grain = Math.sin(x * 139 + y * 71 + z * 109 + seed) * Math.cos(z * 83 - y * 97 + x * 59);
    const n = 1 + grain * amount;
    p.setXYZ(i, x * n, y * n, z * n);
    new THREE.Color(color).multiplyScalar(.84 + (grain + 1) * .15).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
function roundedBox(width: number, height: number, depth: number, bevel: number) {
  const shape = new THREE.Shape();
  const w = width / 2 - bevel, h = height / 2 - bevel;
  shape.moveTo(-w, -h); shape.lineTo(w, -h); shape.lineTo(w, h); shape.lineTo(-w, h); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 4 });
  geo.translate(0, 0, -depth / 2 + bevel);
  return geo;
}
function useBurgerGeometry() {
  const resources = useMemo(() => {
    const dome: [number, number][] = Array.from({ length: 25 }, (_, i) => {
      const angle = i / 24 * Math.PI / 2;
      return [Math.cos(angle) * .64, .045 + Math.sin(angle) * .29];
    });
    return {
      top: bunGeometry([[0, 0], [.53, 0], [.61, .012], ...dome], 73),
      heel: bunGeometry([[0, 0], [.46, 0], [.57, .025], [.615, .075], [.62, .13], [.58, .16], [0, .16]], 86),
      beef: pattyGeometry(), cheese: cheeseGeometry(), lettuce: lettuceGeometry(),
      seed: new THREE.SphereGeometry(1, 7, 5), crumb: new THREE.DodecahedronGeometry(1, 0),
      fish: roughen(roundedBox(1.08, .19, 1.02, .035), '#d39b42', .014, 8),
      chicken: roughen(new THREE.SphereGeometry(1, 48, 24), '#d59b42', .045, 19),
      grilled: roughen(new THREE.SphereGeometry(1, 48, 24), '#a36129', .05, 32),
    };
  }, []);
  useEffect(() => () => Object.values(resources).forEach(g => g.dispose()), [resources]);
  return resources;
}
function Sesame({ y, geometry, count = 68 }: { y: number; geometry: THREE.BufferGeometry; count?: number }) {
  const instances = useMemo<Instance[]>(() => Array.from({ length: count }, (_, i) => {
    const a = i * 2.39996, r = Math.sqrt((i + .5) / count) * .565;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    return { position: [x, y + .05 + .29 * Math.sqrt(1 - r * r / .4096), z],
      rotation: [z, random(i + 92) * Math.PI, -x], scale: [.012, .007, .029] };
  }), [y, count]);
  return <Details geometry={geometry} instances={instances} color="#fff1c7"/>;
}
function ShreddedLettuce({ y, geometry }: { y: number; geometry: THREE.BufferGeometry }) {
  const instances = useMemo<Instance[]>(() => Array.from({ length: 60 }, (_, i) => {
    const a = i * 2.39996, r = .49 + random(i + 45) * .11;
    return { position: [Math.cos(a) * r, y + random(i + 71) * .05, Math.sin(a) * r],
      rotation: [(random(i + 11) - .5) * .8, a, random(i + 15) * .4],
      scale: [.8 + random(i + 31) * .6, 1, .9], color: i % 3 ? '#8bba4b' : '#b3cd69' };
  }), [y]);
  return <Details geometry={geometry} instances={instances} color="#ffffff" doubleSide/>;
}
function Crust({ y, geometry, square = false, spicy = false, scaleY = 1 }: { y: number; geometry: THREE.BufferGeometry; square?: boolean; spicy?: boolean; scaleY?: number }) {
  const instances = useMemo<Instance[]>(() => Array.from({ length: 150 }, (_, i) => {
    const angle = i * 2.39996;
    const r = Math.sqrt(random(i + 18)) * .57;
    const x = square ? (random(i + 41) - .5) * 1.05 : Math.cos(angle) * r;
    const z = square ? (random(i + 52) - .5) * .99 : Math.sin(angle) * r;
    const edge = i < 70;
    const px = edge ? (square ? (i % 2 ? x : (i % 4 ? .535 : -.535)) : Math.cos(angle) * .57) : x;
    const pz = edge ? (square ? (i % 2 ? (i % 4 === 1 ? .5 : -.5) : z) : Math.sin(angle) * .57) : z;
    return { position: [px, y + (edge ? (random(i + 61) - .5) * .14 : .09) * scaleY, pz],
      rotation: [angle, angle * .5, angle], scale: [.015 + random(i + 51) * .015, .011, .025],
      color: spicy ? (i % 3 ? '#c97929' : '#a34a1d') : (i % 3 ? '#efbf63' : '#a86b28') };
  }), [y, square, spicy, scaleY]);
  return <Details geometry={geometry} instances={instances} color="#ffffff"/>;
}
function Sauce({ y, color = '#f6e3b5' }: { y: number; color?: string }) {
  return <mesh position={[0, y, 0]}><cylinderGeometry args={[.57, .58, .025, 48]}/>{material(color)}</mesh>;
}
function Pickles({ y }: { y: number }) {
  return <group position={[0, y, 0]}>{[-1, 1].map(n => <group key={n} position={[n * .24, 0, .12]}>
    <mesh castShadow><cylinderGeometry args={[.16, .16, .035, 28]}/>{material('#5f8235')}</mesh>
    <mesh position={[0, .02, 0]}><cylinderGeometry args={[.135, .135, .008, 28]}/>{material('#b0bd65')}</mesh>
  </group>)}</group>;
}
function TomatoSlices({ y }: { y: number }) {
  return <group position={[0, y, 0]}>{[-1, 1].map(n => <group key={n} position={[n * .24, 0, .05]}>
    <mesh castShadow><cylinderGeometry args={[.31, .31, .055, 36]}/>{material('#c84e30')}</mesh>
    <mesh position={[0, .03, 0]}><cylinderGeometry args={[.275, .275, .008, 36]}/>{material('#e27643')}</mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * 1.256) * .16, .037, Math.sin(i * 1.256) * .16]} scale={[.055, .004, .032]} rotation={[0, i * 1.256, 0]}><sphereGeometry args={[1, 8, 4]}/>{material('#efc27a')}</mesh>)}
  </group>)}</group>;
}

/** Each burger is a compact, closed stack. Fish and chicken have their own fillet geometry. */
export function BurgerModel({ variant, scale = 1 }: { variant: RecipeId; scale?: number }) {
  const g = useBurgerGeometry();
  const fish = variant === 'fish' || variant === 'double-fish';
  const double = variant === 'double-beef' || variant === 'double-fish';
  const chicken = ['chicken', 'spicy-chicken', 'grilled-chicken'].includes(variant);
  const grilled = variant === 'grilled-chicken', spicy = variant === 'spicy-chicken', angus = variant === 'angus';
  const cheese = ['cheeseburger', 'double-beef', 'angus', 'fish', 'double-fish'].includes(variant);
  const meatY = -.135, secondY = meatY + (fish ? .235 : .18);
  const topY = fish ? (double ? .235 : -.005) : chicken ? .11 : angus ? .18 : double ? .135 : -.045;
  const center = (topY + .335 - .38) / 2;
  return <group scale={scale} name={`dish-${variant}`}><group position={[0, -center, 0]}>
    <mesh geometry={g.heel} position={[0, -.38, 0]} castShadow receiveShadow>{baked()}</mesh>
    <Sauce y={-.21} color={fish || chicken ? '#f3e5c3' : '#d47333'}/>
    {fish ? <>
      <mesh geometry={g.fish} position={[0, meatY, 0]} rotation={[0, .08, 0]} castShadow receiveShadow>{baked()}</mesh>
      <Crust geometry={g.crumb} y={meatY} square/>
      {double && <><mesh geometry={g.fish} position={[0, secondY, 0]} rotation={[0, -.08, 0]} castShadow receiveShadow>{baked()}</mesh><Crust geometry={g.crumb} y={secondY} square/></>}
    </> : chicken ? <>
      <mesh geometry={grilled ? g.grilled : g.chicken} position={[0, -.09, 0]} scale={[.64, spicy ? .17 : .135, .57]} castShadow receiveShadow>{baked()}</mesh>
      {!grilled && <Crust geometry={g.crumb} y={-.09} spicy={spicy} scaleY={1.4}/>}
      {grilled && [-2, -1, 0, 1, 2].map(i => <mesh key={i} position={[i * .19, .026 - Math.abs(i) * .014, 0]} rotation={[-Math.PI / 2, .02, .2]}><planeGeometry args={[.026, .65 - Math.abs(i) * .1]}/>{material('#533321')}</mesh>)}
      <Sauce y={.062} color={grilled ? '#b78a51' : '#f3e9cc'}/>
      <ShreddedLettuce geometry={g.lettuce} y={.07}/>
    </> : <>
      <mesh geometry={g.beef} position={[0, meatY, 0]} scale={[angus ? 1.04 : 1, angus ? 1.65 : 1, angus ? 1.04 : 1]} castShadow receiveShadow>{baked()}</mesh>
      {double && <mesh geometry={g.beef} position={[0, secondY, 0]} rotation={[0, .7, 0]} castShadow receiveShadow>{baked()}</mesh>}
      {!angus && <Pickles y={double ? .123 : -.052}/>}
      {angus && <><TomatoSlices y={.045}/><ShreddedLettuce geometry={g.lettuce} y={.115}/></>}
    </>}
    {cheese && <mesh geometry={g.cheese} position={[0, angus ? -.015 : meatY + (fish ? .103 : .07), 0]} rotation={[0, fish ? .08 : .32, 0]} castShadow receiveShadow>{material('#f3be32', true)}</mesh>}
    {double && !fish && <mesh geometry={g.cheese} position={[0, secondY + .07, 0]} rotation={[0, -.3, 0]} castShadow>{material('#f3be32', true)}</mesh>}
    {fish && <Sauce y={topY - .015}/>}
    <mesh geometry={g.top} position={[0, topY, 0]} castShadow receiveShadow>{baked()}</mesh>
    {(chicken || angus) && <Sesame y={topY} geometry={g.seed} count={angus ? 90 : 68}/>}
  </group></group>;
}

function Tray() {
  return <group position={[0, -.31, 0]}>
    <mesh receiveShadow><boxGeometry args={[1.3, .055, .86]}/>{material('#eee1bd')}</mesh>
    {[-1, 1].map(n => <mesh key={n} position={[0, .045, n * .42]} rotation={[n * .17, 0, 0]}><boxGeometry args={[1.32, .115, .025]}/>{material('#ca4931')}</mesh>)}
    {[-1, 1].map(n => <mesh key={n} position={[n * .64, .045, 0]} rotation={[0, 0, -n * .17]}><boxGeometry args={[.025, .115, .84]}/>{material('#ca4931')}</mesh>)}
  </group>;
}
export function ChickenSnackModel({ wings = false, scale = 1 }: { wings?: boolean; scale?: number }) {
  const g = useMemo(() => ({
    nugget: roughen(new THREE.SphereGeometry(1, 32, 20), '#d4a050', .09, 41),
    wing: roughen(new THREE.SphereGeometry(1, 40, 24), '#ba6d2c', .1, 55),
    crumb: new THREE.DodecahedronGeometry(1, 0),
  }), []);
  useEffect(() => () => Object.values(g).forEach(item => item.dispose()), [g]);
  const pieces = wings ? [
    { p: [-.29, -.03, .04], r: [.2, -.45, .4], s: [.22, .22, .43] },
    { p: [.28, -.06, -.02], r: [-.2, .65, -.12], s: [.21, .18, .46] },
  ] : [
    { p: [-.43, -.14, -.21], r: [.2, -.2, .1], s: [.20, .125, .17] },
    { p: [0, -.14, -.21], r: [.1, .25, .12], s: [.205, .13, .16] },
    { p: [.43, -.14, -.20], r: [.15, .2, -.05], s: [.19, .13, .18] },
    { p: [-.25, -.12, .20], r: [-.1, -.3, .1], s: [.23, .135, .18] },
    { p: [.25, -.12, .20], r: [-.1, .3, .15], s: [.22, .13, .18] },
  ];
  const crumbs = useMemo<Instance[]>(() => Array.from({ length: wings ? 125 : 100 }, (_, i) => {
    const part = pieces[i % pieces.length];
    const a = i * 2.39996, r = Math.sqrt(random(i + 87));
    const x = Math.cos(a) * r * part.s[0], z = Math.sin(a) * r * part.s[2];
    const point = new THREE.Vector3(x, part.s[1] * Math.sqrt(1 - r * r), z)
      .applyEuler(new THREE.Euler(...part.r as [number, number, number]))
      .add(new THREE.Vector3(...part.p as [number, number, number]));
    return { position: point.toArray(),
      rotation: [a, a, 0], scale: [.015, .012, .018], color: wings ? '#d88e37' : '#efc674' };
  }), [wings]);
  return <group scale={scale} name={wings ? 'dish-wings' : 'dish-nuggets'}>
    <Tray/>
    {pieces.map((piece, i) => <group key={i} position={piece.p as [number, number, number]} rotation={piece.r as [number, number, number]}>
      <mesh geometry={wings ? g.wing : g.nugget} scale={piece.s as [number, number, number]} castShadow receiveShadow>{baked()}</mesh>
      {wings && <mesh geometry={g.wing} position={[.04, -.01, .27]} scale={[.105, .1, .2]} castShadow>{baked()}</mesh>}
    </group>)}
    <Details geometry={g.crumb} instances={crumbs} color="#ffffff"/>
  </group>;
}
export function FriesModel({ scale = 1 }: { scale?: number }) {
  const g = useMemo(() => {
    const frontShape = new THREE.Shape();
    frontShape.moveTo(-.34, -.46); frontShape.lineTo(.34, -.46); frontShape.lineTo(.5, .18);
    frontShape.bezierCurveTo(.28, .08, -.28, .08, -.5, .18); frontShape.closePath();
    const front = new THREE.ExtrudeGeometry(frontShape, { depth: .018, bevelEnabled: false });
    const arch = (offset: number) => new THREE.TubeGeometry(new THREE.CubicBezierCurve3(
      new THREE.Vector3(offset - .13, -.25, .322), new THREE.Vector3(offset - .14, .07, .322),
      new THREE.Vector3(offset + .14, .07, .322), new THREE.Vector3(offset + .13, -.25, .322)), 24, .023, 6, false);
    return { front, fry: roughen(roundedBox(.083, .8, .085, .009), '#ecc25b', .015, 94),
      archLeft: arch(-.13), archRight: arch(.13) };
  }, []);
  useEffect(() => () => Object.values(g).forEach(item => item.dispose()), [g]);
  return <group scale={scale} name="dish-fries">
    <mesh position={[0, -.12, -.25]} rotation={[-.09, 0, 0]} castShadow><boxGeometry args={[.89, .71, .025]}/>{material('#bf3c25')}</mesh>
    <mesh position={[0, -.45, .015]} receiveShadow><boxGeometry args={[.68, .025, .52]}/>{material('#e9b959')}</mesh>
    {Array.from({ length: 33 }, (_, i) => {
      const row = Math.floor(i / 11), col = i % 11;
      return <mesh key={i} geometry={g.fry} position={[(col - 5) * .077, .10 + random(i + 71) * .24, -.16 + row * .16]}
        rotation={[(random(i + 21) - .5) * .23, (random(i + 6) - .5) * .5, (col - 5) * -.035]} scale={[1, .73 + random(i + 31) * .28, 1]} castShadow receiveShadow>{baked()}</mesh>;
    })}
    {[-1, 1].map(n => <mesh key={n} position={[n * .42, -.13, .02]} rotation={[0, 0, -n * .23]} castShadow><boxGeometry args={[.025, .67, .56]}/>{material('#ce4b2d')}</mesh>)}
    <mesh geometry={g.front} position={[0, 0, .29]} castShadow>{material('#c93724')}</mesh>
    <mesh geometry={g.archLeft}>{material('#ffce43')}</mesh><mesh geometry={g.archRight}>{material('#ffce43')}</mesh>
  </group>;
}
export function CheeseSticksModel({ scale = 1 }: { scale?: number }) {
  const g = useMemo(() => ({
    stick: roughen(roundedBox(.21, .19, .84, .065), '#b7792e', .035, 87),
    crumb: new THREE.DodecahedronGeometry(1, 0),
    pull: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.15, .06, .11), new THREE.Vector3(-.01, .10, .14),
      new THREE.Vector3(.15, .22, .2), new THREE.Vector3(.32, .38, .25),
    ]), 28, .03, 7, false),
  }), []);
  useEffect(() => () => Object.values(g).forEach(item => item.dispose()), [g]);
  const crumbs = useMemo<Instance[]>(() => Array.from({length: 120}, (_, i) => {
    const n = i % 3 - 1;
    const point = new THREE.Vector3((random(i+92)-.5)*.19, .105, (random(i+51)-.5)*.76)
      .applyEuler(new THREE.Euler(0,n*-.12+.18,0)).add(new THREE.Vector3(n*.29,-.15,-.04));
    return { position: point.toArray(), rotation: [i, i*.4, 0], scale: [.012,.008,.016], color: i%3 ? '#e4b152' : '#9d6327' };
  }), []);
  return <group scale={scale} name="dish-cheese-sticks"><Tray/>
    {[-1, 0, 1].map(n => <mesh key={n} geometry={g.stick} position={[n * .29, -.15, -.04]} rotation={[0, n * -.12 + .18, 0]} castShadow receiveShadow>{baked()}</mesh>)}
    <mesh geometry={g.stick} position={[-.25, .04, .08]} rotation={[0, 1.2, .12]} scale={[1, 1, .54]} castShadow>{baked()}</mesh>
    <mesh geometry={g.stick} position={[.42, .41, .29]} rotation={[0, 1.2, .2]} scale={[1, 1, .44]} castShadow>{baked()}</mesh>
    <Details geometry={g.crumb} instances={crumbs} color="#ffffff"/>
    <mesh geometry={g.pull}>{material('#fff1c3')}</mesh>
    <mesh geometry={g.pull} position={[0, .018, -.035]} scale={[1, .95, .95]}>{material('#ffe8a2')}</mesh>
    <mesh position={[.31, .38, .25]} scale={[.05, .065, .08]}><sphereGeometry args={[1, 12, 8]}/>{material('#fff0c2')}</mesh>
  </group>;
}
