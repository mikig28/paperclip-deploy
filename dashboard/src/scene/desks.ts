import * as THREE from 'three';
import { DESK_COLOR, DESK_TOP_COLOR, MONITOR_FRAME_COLOR, CHAIR_COLOR } from '../utils/colors';

export function createDesk(statusColor: number = 0x4ade80): THREE.Group {
  const group = new THREE.Group();

  // Desk top
  const topGeo = new THREE.BoxGeometry(2.2, 0.08, 1.1);
  const topMat = new THREE.MeshStandardMaterial({ color: DESK_TOP_COLOR, roughness: 0.6, metalness: 0.2 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.75;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75);
  const legMat = new THREE.MeshStandardMaterial({ color: DESK_COLOR, roughness: 0.5, metalness: 0.4 });
  const legPositions = [
    [-0.95, 0.375, -0.4],
    [0.95, 0.375, -0.4],
    [-0.95, 0.375, 0.4],
    [0.95, 0.375, 0.4],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    group.add(leg);
  }

  // Monitor
  const monitorGeo = new THREE.BoxGeometry(0.9, 0.55, 0.04);
  const monitorMat = new THREE.MeshStandardMaterial({ color: MONITOR_FRAME_COLOR, roughness: 0.3, metalness: 0.5 });
  const monitor = new THREE.Mesh(monitorGeo, monitorMat);
  monitor.position.set(0, 1.3, -0.3);
  group.add(monitor);

  // Monitor screen (emissive - shows status color)
  const screenGeo = new THREE.PlaneGeometry(0.8, 0.45);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: statusColor,
    emissiveIntensity: 0.5,
    roughness: 0.1,
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 1.3, -0.278);
  screen.name = 'monitor-screen';
  group.add(screen);

  // Monitor stand
  const standGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.25);
  const stand = new THREE.Mesh(standGeo, legMat);
  stand.position.set(0, 0.92, -0.3);
  group.add(stand);

  // Chair
  const chairGroup = createChair();
  chairGroup.position.set(0, 0, 0.7);
  group.add(chairGroup);

  return group;
}

function createChair(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: CHAIR_COLOR, roughness: 0.7, metalness: 0.2 });

  // Seat
  const seatGeo = new THREE.BoxGeometry(0.5, 0.06, 0.5);
  const seat = new THREE.Mesh(seatGeo, mat);
  seat.position.y = 0.45;
  group.add(seat);

  // Backrest
  const backGeo = new THREE.BoxGeometry(0.5, 0.5, 0.06);
  const back = new THREE.Mesh(backGeo, mat);
  back.position.set(0, 0.73, -0.22);
  group.add(back);

  // Chair base (cylinder)
  const baseGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.6 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.225;
  group.add(base);

  // Chair wheel base
  const wheelBaseGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.03);
  const wheelBase = new THREE.Mesh(wheelBaseGeo, baseMat);
  wheelBase.position.y = 0.015;
  group.add(wheelBase);

  return group;
}
