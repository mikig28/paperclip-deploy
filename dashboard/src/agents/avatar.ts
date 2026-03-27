import * as THREE from 'three';
import { getAvatarColor } from '../utils/colors';

export function createAvatar(agentIndex: number): THREE.Group {
  const group = new THREE.Group();
  const color = getAvatarColor(agentIndex);
  const skinColor = 0xddb89a;

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.7 });

  // Head
  const headGeo = new THREE.SphereGeometry(0.18, 16, 12);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.55;
  head.castShadow = true;
  group.add(head);

  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.3 });
  const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.065, 1.57, -0.15);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.065, 1.57, -0.15);
  group.add(rightEye);

  // Body (torso)
  const bodyGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.5, 12);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.15;
  body.castShadow = true;
  body.name = 'torso';
  group.add(body);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.4, 8);

  // Left arm - angled forward toward desk
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.22, 1.0, -0.1);
  leftArm.rotation.x = -0.6;
  leftArm.rotation.z = 0.15;
  leftArm.name = 'left-arm';
  group.add(leftArm);

  // Right arm
  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.22, 1.0, -0.1);
  rightArm.rotation.x = -0.6;
  rightArm.rotation.z = -0.15;
  rightArm.name = 'right-arm';
  group.add(rightArm);

  // Hands (small spheres)
  const handGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.set(-0.28, 0.82, -0.3);
  leftHand.name = 'left-hand';
  group.add(leftHand);

  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.set(0.28, 0.82, -0.3);
  rightHand.name = 'right-hand';
  group.add(rightHand);

  // Lower body (seated legs implied by a cylinder)
  const lowerGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.35, 12);
  const lower = new THREE.Mesh(lowerGeo, bodyMat);
  lower.position.y = 0.72;
  group.add(lower);

  return group;
}
