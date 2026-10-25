import { createPortal, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { INGREDIENTS } from '../game/data';
import { publishFoodThumbnail } from '../ui/foodThumbnails';
import { FoodModel } from './FoodModels';

const SIZE = 192;

/** Bake once with the game's renderer; every inventory icon then uses a cached image. */
export function IngredientThumbnails() {
  const [done, setDone] = useState(false);
  const index = useRef(0);
  const models = useRef<Array<THREE.Group | null>>([]);
  const studio = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 20);
    const target = new THREE.WebGLRenderTarget(SIZE, SIZE, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, samples: 4 });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    return { scene, camera, target, canvas, pixels: new Uint8Array(SIZE * SIZE * 4), box: new THREE.Box3(), center: new THREE.Vector3(), size: new THREE.Vector3() };
  }, []);
  useEffect(() => () => studio.target.dispose(), [studio]);

  useFrame(({ gl }) => {
    if (done) return;
    const model = models.current[index.current];
    if (!model) return;
    const { scene, camera, target, canvas, pixels, box, center, size } = studio;
    models.current.forEach(group => { if (group) group.visible = group === model; });
    scene.updateMatrixWorld(true);
    box.setFromObject(model).getCenter(center);
    box.getSize(size);
    const radius = Math.max(size.x, size.y, size.z) * .72;
    camera.left = camera.bottom = -radius;
    camera.right = camera.top = radius;
    camera.position.copy(center).add(new THREE.Vector3(1.5, 2.1, 3));
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    const previousTarget = gl.getRenderTarget();
    const clearColor = gl.getClearColor(new THREE.Color()), clearAlpha = gl.getClearAlpha();
    const previousAutoClear = gl.autoClear;
    try {
      gl.autoClear = true;
      gl.setClearColor(0x000000, 0);
      gl.setRenderTarget(target);
      gl.render(scene, camera);
      gl.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
      const context = canvas.getContext('2d')!;
      const image = context.createImageData(SIZE, SIZE);
      // WebGL's origin is at the bottom left; image data starts at the top left.
      for (let y = 0; y < SIZE; y++) image.data.set(pixels.subarray((SIZE - y - 1) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
      context.putImageData(image, 0, 0);
      publishFoodThumbnail(INGREDIENTS[index.current].id, canvas.toDataURL('image/png'));
      index.current++;
      if (index.current === INGREDIENTS.length) { target.dispose(); setDone(true); }
    } catch {
      // The vector illustrations remain usable if image readback is unavailable.
      target.dispose();
      setDone(true);
    } finally {
      gl.setRenderTarget(previousTarget);
      gl.setClearColor(clearColor, clearAlpha);
      gl.autoClear = previousAutoClear;
    }
  });

  if (done) return null;
  return createPortal(<>
    <ambientLight intensity={1.5}/><directionalLight position={[-3, 5, 5]} intensity={3}/><directionalLight position={[3, 1, -2]} intensity={.8}/>
    {INGREDIENTS.map((ingredient, i) => <group key={ingredient.id} ref={node => { models.current[i] = node; }}><FoodModel id={ingredient.id}/></group>)}
  </>, studio.scene);
}
