import * as THREE from 'three';
import { AMBIENT_LIGHT, DIRECTIONAL_LIGHT, ACCENT_LIGHT } from '../utils/colors';

export function createLighting(scene: THREE.Scene): void {
  // Soft ambient fill
  const ambient = new THREE.AmbientLight(AMBIENT_LIGHT, 0.6);
  scene.add(ambient);

  // Main directional light (simulates overhead office lighting)
  const directional = new THREE.DirectionalLight(DIRECTIONAL_LIGHT, 0.8);
  directional.position.set(5, 12, 5);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 50;
  directional.shadow.camera.left = -20;
  directional.shadow.camera.right = 20;
  directional.shadow.camera.top = 20;
  directional.shadow.camera.bottom = -20;
  scene.add(directional);

  // Accent fill from the other side
  const fill = new THREE.DirectionalLight(ACCENT_LIGHT, 0.15);
  fill.position.set(-8, 6, -4);
  scene.add(fill);

  // Subtle hemisphere light for sky/ground color contrast
  const hemi = new THREE.HemisphereLight(0x404080, 0x101020, 0.3);
  scene.add(hemi);
}
