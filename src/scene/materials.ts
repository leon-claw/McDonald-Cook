import * as THREE from 'three';

// A narrow, deliberately stepped light ramp gives skin, cloth and metal a painted finish.
const ramp = new THREE.DataTexture(new Uint8Array([92, 153, 211, 255]), 4, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;
export const toonRamp = ramp;
export function toon(color: THREE.ColorRepresentation) {
  return new THREE.MeshToonMaterial({ color, gradientMap: ramp });
}
export function between(a: THREE.Vector3, b: THREE.Vector3, radius: number, top = radius) {
  const geometry = new THREE.CylinderGeometry(top, radius, a.distanceTo(b), 7);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  geometry.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
  return geometry;
}
