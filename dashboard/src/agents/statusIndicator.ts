import * as THREE from 'three';
import type { AgentState } from '../types';
import { STATUS_COLORS } from '../types';

export function createStatusIndicator(): THREE.Group {
  const group = new THREE.Group();

  // Glowing ring
  const ringGeo = new THREE.TorusGeometry(0.15, 0.025, 12, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: STATUS_COLORS.idle,
    emissive: STATUS_COLORS.idle,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.5,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.name = 'status-ring';
  group.add(ring);

  // Center dot
  const dotGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const dotMat = new THREE.MeshStandardMaterial({
    color: STATUS_COLORS.idle,
    emissive: STATUS_COLORS.idle,
    emissiveIntensity: 1.0,
    roughness: 0.1,
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.name = 'status-dot';
  group.add(dot);

  group.position.y = 1.9;
  return group;
}

export function updateStatusIndicator(indicator: THREE.Group, state: AgentState): void {
  const color = new THREE.Color(STATUS_COLORS[state]);

  const ring = indicator.getObjectByName('status-ring') as THREE.Mesh;
  const dot = indicator.getObjectByName('status-dot') as THREE.Mesh;

  if (ring) {
    const mat = ring.material as THREE.MeshStandardMaterial;
    mat.color.copy(color);
    mat.emissive.copy(color);
  }
  if (dot) {
    const mat = dot.material as THREE.MeshStandardMaterial;
    mat.color.copy(color);
    mat.emissive.copy(color);
  }
}
