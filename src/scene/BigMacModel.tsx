import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { random } from './world';
import { toonRamp } from './materials';

// A closed stack, with the distinctive club bun separating the two beef patties.
const palette = {
  crust: '#d58b3d', crumb: '#f4d298', sesame: '#fff0c7',
  beef: '#66402b', lettuce: '#88b747', cheese: '#f7bd2b', sauce: '#db9b67',
};

type Instance = { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; color?: string };

function Details({ geometry, instances, color, doubleSide = false }: {
  geometry: THREE.BufferGeometry; instances: Instance[]; color: string; doubleSide?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D();
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.rotation.set(...instance.rotation);
      object.scale.set(...instance.scale);
      object.updateMatrix();
      mesh.current!.setMatrixAt(index, object.matrix);
      if (instance.color) mesh.current!.setColorAt(index, new THREE.Color(instance.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [instances]);
  return <instancedMesh ref={mesh} args={[geometry, undefined, instances.length]} castShadow receiveShadow>
    <meshToonMaterial color={color} gradientMap={toonRamp} side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}/>
  </instancedMesh>;
}

function bunGeometry(profile: [number, number][], seed: number) {
  const geometry = new THREE.LatheGeometry(profile.map(([radius, height]) => new THREE.Vector2(radius, height)), 64);
  const positions = geometry.attributes.position;
  const colors: number[] = [];
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const angle = Math.atan2(z, x), radius = Math.hypot(x, z);
    const uneven = 1 + Math.sin(angle * 7 + seed) * .007 + Math.cos(angle * 11) * .004;
    positions.setXYZ(i, x * uneven, y, z * uneven);
    const grain = .95 + random(i * 7 + seed) * .09;
    // The cut face stays pale; the outside has a warm baked rim.
    color.set(radius < .57 && y < .035 ? palette.crumb : palette.crust);
    if (y > .08) color.lerp(new THREE.Color('#ebb364'), Math.min(1, y * 2));
    color.multiplyScalar(grain).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function pattyGeometry() {
  const geometry = new THREE.CylinderGeometry(.604, .615, .128, 64, 3);
  const positions = geometry.attributes.position, colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const angle = Math.atan2(z, x);
    const edge = 1 + Math.sin(angle * 17) * .018 + Math.cos(angle * 29) * .014;
    positions.setXYZ(i, x * edge, y + Math.sin(angle * 19 + x * 25) * .006, z * edge);
    new THREE.Color(palette.beef).multiplyScalar(.68 + random(i + 240) * .53).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function lettuceGeometry() {
  const geometry = new THREE.PlaneGeometry(.27, .07, 8, 3);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    positions.setY(i, Math.sin(x * 55 + z * 28) * .017 + Math.cos(x * 30) * .012);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function cheeseGeometry() {
  const geometry = new THREE.PlaneGeometry(1.08, 1.02, 20, 20);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const overhang = Math.max(0, Math.hypot(x, z) - .46);
    positions.setY(i, -.003 - overhang * .68 + Math.sin(x * 9 + z * 7) * .006);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function BigMacModel({ scale = 1 }: { scale?: number }) {
  const resources = useMemo(() => {
    const dome: [number, number][] = Array.from({ length: 25 }, (_, i) => {
      const angle = i / 24 * Math.PI / 2;
      return [Math.cos(angle) * .65, .055 + Math.sin(angle) * .29];
    });
    const top = bunGeometry([[0, 0], [.54, 0], [.615, .015], ...dome], 71);
    const heel = bunGeometry([[0, 0], [.46, 0], [.57, .025], [.615, .075], [.62, .13], [.58, .16], [0, .16]], 86);
    const club = bunGeometry([[0, 0], [.56, 0], [.62, .025], [.63, .085], [.595, .14], [0, .14]], 98);
    const patty = pattyGeometry(), lettuce = lettuceGeometry(), cheese = cheeseGeometry();
    const seed = new THREE.SphereGeometry(1, 7, 5);
    const onion = new THREE.BoxGeometry(1, 1, 1);
    return { top, heel, club, patty, lettuce, cheese, seed, onion };
  }, []);
  useEffect(() => () => Object.values(resources).forEach(geometry => geometry.dispose()), [resources]);

  const details = useMemo(() => {
    const sesame: Instance[] = Array.from({ length: 86 }, (_, i) => {
      const angle = i * 2.39996, radius = Math.sqrt((i + .5) / 86) * .58;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const height = .055 + .29 * Math.sqrt(Math.max(0, 1 - radius * radius / (.65 * .65)));
      return { position: [x, .31 + height + .004, z], rotation: [z * 1.1, random(i + 71) * Math.PI, -x * 1.1], scale: [.012, .007, .027 + random(i + 125) * .008] };
    });
    const lettuce: Instance[] = Array.from({ length: 114 }, (_, i) => {
      const layer = i < 57 ? -.305 : .085, index = i % 57;
      const angle = index * 2.39996 + (i < 57 ? 0 : .9);
      const radius = index < 38 ? .51 + random(i + 18) * .11 : Math.sqrt(random(i + 31)) * .48;
      return {
        position: [Math.cos(angle) * radius, layer + random(i + 14) * .045, Math.sin(angle) * radius],
        rotation: [(random(i + 46) - .5) * .7, -angle + random(i + 62) * 1.4, (random(i + 22) - .5) * .3],
        scale: [.65 + random(i + 42) * .6, 1, .65 + random(i + 54) * .6],
        color: i % 4 === 0 ? '#b7cd67' : i % 3 ? '#8ab849' : '#5f9736',
      };
    });
    const onion: Instance[] = Array.from({ length: 38 }, (_, i) => {
      const angle = i * 2.39996, radius = .3 + random(i + 520) * .32;
      return { position: [Math.cos(angle) * radius, (i < 19 ? -.28 : .13) + random(i + 80) * .035, Math.sin(angle) * radius], rotation: [.2, angle, .15], scale: [.025 + random(i + 910) * .018, .017, .026] };
    });
    return { sesame, lettuce, onion };
  }, []);

  return <group scale={scale} name="big-mac-burger">
    <mesh geometry={resources.heel} position={[0, -.49, 0]} castShadow receiveShadow><meshToonMaterial vertexColors gradientMap={toonRamp}/></mesh>
    <mesh position={[0, -.32, 0]} scale={[1, .4, 1]}><cylinderGeometry args={[.588, .59, .045, 48]}/><meshToonMaterial color={palette.sauce} gradientMap={toonRamp}/></mesh>
    <mesh geometry={resources.cheese} position={[0, -.263, 0]} rotation={[0, .32, 0]} castShadow receiveShadow><meshToonMaterial color={palette.cheese} gradientMap={toonRamp} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={resources.patty} position={[.012, -.19, -.005]} castShadow receiveShadow><meshToonMaterial vertexColors gradientMap={toonRamp}/></mesh>
    <mesh geometry={resources.club} position={[0, -.105, 0]} castShadow receiveShadow><meshToonMaterial vertexColors gradientMap={toonRamp}/></mesh>
    <mesh position={[0, .052, 0]}><cylinderGeometry args={[.59, .58, .033, 48]}/><meshToonMaterial color={palette.sauce} gradientMap={toonRamp}/></mesh>
    <mesh geometry={resources.patty} position={[-.012, .207, .006]} rotation={[0, 1.1, 0]} castShadow receiveShadow><meshToonMaterial vertexColors gradientMap={toonRamp}/></mesh>
    {[-1, 0, 1].map((n) => <group key={n} position={[n * .255, .287, .15 + (n === 0 ? -.25 : 0)]} rotation={[0, n * .6, n * .025]}>
      <mesh castShadow><cylinderGeometry args={[.15, .15, .032, 24]}/><meshToonMaterial color="#648d35" gradientMap={toonRamp}/></mesh>
      <mesh position={[0, .017, 0]}><cylinderGeometry args={[.123, .123, .006, 24]}/><meshToonMaterial color="#a7ba59" gradientMap={toonRamp}/></mesh>
    </group>)}
    <mesh geometry={resources.top} position={[0, .31, 0]} castShadow receiveShadow><meshToonMaterial vertexColors gradientMap={toonRamp}/></mesh>
    <Details geometry={resources.seed} instances={details.sesame} color={palette.sesame}/>
    <Details geometry={resources.lettuce} instances={details.lettuce} color="#ffffff" doubleSide/>
    <Details geometry={resources.onion} instances={details.onion} color="#f4e9c6"/>
  </group>;
}
