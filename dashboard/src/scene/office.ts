import * as THREE from 'three';
import { FLOOR_COLOR, FLOOR_GRID_COLOR, WALL_COLOR } from '../utils/colors';

export function createFloor(scene: THREE.Scene, width: number, depth: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshStandardMaterial({
    color: FLOOR_COLOR,
    roughness: 0.8,
    metalness: 0.1,
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Grid overlay
  const gridHelper = new THREE.GridHelper(Math.max(width, depth), Math.max(width, depth) * 2, FLOOR_GRID_COLOR, FLOOR_GRID_COLOR);
  (gridHelper.material as THREE.Material).opacity = 0.15;
  (gridHelper.material as THREE.Material).transparent = true;
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  return floor;
}

export function createWalls(scene: THREE.Scene, width: number, depth: number): THREE.Group {
  const group = new THREE.Group();
  const wallHeight = 4;
  const wallThickness = 0.1;
  const mat = new THREE.MeshStandardMaterial({
    color: WALL_COLOR,
    roughness: 0.9,
    transparent: true,
    opacity: 0.3,
  });

  // Back wall
  const backGeo = new THREE.BoxGeometry(width, wallHeight, wallThickness);
  const back = new THREE.Mesh(backGeo, mat);
  back.position.set(0, wallHeight / 2, -depth / 2);
  group.add(back);

  // Left wall
  const sideGeo = new THREE.BoxGeometry(wallThickness, wallHeight, depth);
  const left = new THREE.Mesh(sideGeo, mat);
  left.position.set(-width / 2, wallHeight / 2, 0);
  group.add(left);

  // Right wall
  const right = new THREE.Mesh(sideGeo, mat);
  right.position.set(width / 2, wallHeight / 2, 0);
  group.add(right);

  scene.add(group);
  return group;
}

export function createOfficeProps(scene: THREE.Scene): void {
  // Subtle fog for depth
  scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

  // Background color
  scene.background = new THREE.Color(0x0a0a1a);
}
