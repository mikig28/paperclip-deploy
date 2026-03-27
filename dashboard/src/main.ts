import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import type { AgentStatus, AgentState } from './types';
import { STATUS_COLORS } from './types';
import { PaperclipClient } from './api/client';
import { Poller } from './api/poller';
import { createCamera, createControls } from './scene/camera';
import { createLighting } from './scene/lighting';
import { createFloor, createWalls, createOfficeProps } from './scene/office';
import { createDesk } from './scene/desks';
import { createAvatar } from './agents/avatar';
import { createStatusIndicator, updateStatusIndicator } from './agents/statusIndicator';
import { createNameLabel, updateNameLabel } from './agents/nameLabel';
import { computeDeskPositions, getOfficeFloorSize } from './utils/layout';
import { pulse, bob, breathe } from './utils/animate';
import { loadConfig, initConfigPanel, type DashboardConfig } from './ui/configPanel';
import { updateHUD } from './ui/overlay';

// --- Scene node for each agent ---
interface AgentSceneNode {
  id: string;
  desk: THREE.Group;
  avatar: THREE.Group;
  statusIndicator: THREE.Group;
  label: THREE.Object3D;
  state: AgentState;
  index: number;
}

// --- Global state ---
const agentNodes = new Map<string, AgentSceneNode>();
let currentAgents: AgentStatus[] = [];
let healthy = false;
let floor: THREE.Mesh | null = null;
let walls: THREE.Group | null = null;

// --- Init Three.js ---
const app = document.getElementById('app')!;
const scene = new THREE.Scene();
const config = loadConfig();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
app.appendChild(labelRenderer.domElement);

const camera = createCamera(window.innerWidth / window.innerHeight);
const controls = createControls(camera, renderer.domElement);
controls.autoRotate = config.autoRotate;
controls.autoRotateSpeed = 0.5;

createOfficeProps(scene);
createLighting(scene);

// Initial office (will resize when agents arrive)
const initSize = getOfficeFloorSize(4);
floor = createFloor(scene, initSize.width, initSize.depth);
walls = createWalls(scene, initSize.width, initSize.depth);

// --- Demo agents (shown when API is not connected) ---
const DEMO_AGENTS: AgentStatus[] = [
  { id: 'demo-1', name: 'Research Agent', state: 'working', currentTask: 'Analyzing market data', type: 'claude_local', lastHeartbeat: null },
  { id: 'demo-2', name: 'Writer Agent', state: 'working', currentTask: 'Drafting blog post', type: 'claude_local', lastHeartbeat: null },
  { id: 'demo-3', name: 'Code Agent', state: 'idle', currentTask: null, type: 'claude_local', lastHeartbeat: null },
  { id: 'demo-4', name: 'QA Agent', state: 'working', currentTask: 'Running test suite', type: 'claude_local', lastHeartbeat: null },
  { id: 'demo-5', name: 'Deploy Agent', state: 'error', currentTask: 'Build failed', type: 'claude_local', lastHeartbeat: null },
  { id: 'demo-6', name: 'Monitor Agent', state: 'idle', currentTask: null, type: 'claude_local', lastHeartbeat: null },
];

// --- Reconcile scene with agent data ---
function reconcile(agents: AgentStatus[]) {
  const agentIds = new Set(agents.map(a => a.id));

  // Remove agents no longer present
  for (const [id, node] of agentNodes) {
    if (!agentIds.has(id)) {
      scene.remove(node.desk);
      agentNodes.delete(id);
    }
  }

  // Resize office if count changed
  if (agents.length !== currentAgents.length || agentNodes.size === 0) {
    const size = getOfficeFloorSize(Math.max(agents.length, 4));
    if (floor) scene.remove(floor);
    if (walls) scene.remove(walls);
    floor = createFloor(scene, size.width, size.depth);
    walls = createWalls(scene, size.width, size.depth);
  }

  const positions = computeDeskPositions(agents.length);

  agents.forEach((agent, i) => {
    let node = agentNodes.get(agent.id);

    if (!node) {
      // Create new desk + avatar
      const desk = createDesk(STATUS_COLORS[agent.state]);
      const avatar = createAvatar(i);
      const statusIndicator = createStatusIndicator();
      const label = createNameLabel(agent.name, agent.currentTask);

      // Position avatar at chair (seated)
      avatar.position.set(0, 0, 0.7);
      avatar.rotation.y = Math.PI; // face the desk

      desk.add(avatar);
      desk.add(statusIndicator);
      desk.add(label);
      scene.add(desk);

      node = { id: agent.id, desk, avatar, statusIndicator, label, state: agent.state, index: i };
      agentNodes.set(agent.id, node);
    }

    // Update position
    const pos = positions[i];
    if (pos) {
      node.desk.position.set(pos.x, 0, pos.z);
    }

    // Update status
    if (node.state !== agent.state) {
      node.state = agent.state;
      updateStatusIndicator(node.statusIndicator, agent.state);

      // Update monitor screen color
      const screen = node.desk.getObjectByName('monitor-screen') as THREE.Mesh | undefined;
      if (screen) {
        const mat = screen.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(STATUS_COLORS[agent.state]);
      }
    }

    // Update label
    updateNameLabel(node.label as import('three/addons/renderers/CSS2DRenderer.js').CSS2DObject, agent.name, agent.currentTask);
  });

  currentAgents = agents;
}

// --- API setup ---
const client = new PaperclipClient(config.apiUrl);
if (config.authToken) client.setAuthToken(config.authToken);
let useDemoMode = true;

function onPollUpdate(agents: AgentStatus[], isHealthy: boolean) {
  healthy = isHealthy;
  if (isHealthy && agents.length > 0) {
    useDemoMode = false;
    reconcile(agents);
  } else if (useDemoMode) {
    reconcile(DEMO_AGENTS);
  }
  updateHUD(useDemoMode ? DEMO_AGENTS : agents, isHealthy);
}

const poller = new Poller(client, onPollUpdate, config.pollInterval);
poller.start();

// Start with demo agents immediately
reconcile(DEMO_AGENTS);
updateHUD(DEMO_AGENTS, false);

// --- Config panel ---
initConfigPanel(config, (newConfig: DashboardConfig) => {
  client.setBaseUrl(newConfig.apiUrl);
  client.setAuthToken(newConfig.authToken || null);
  poller.setInterval(newConfig.pollInterval);
  controls.autoRotate = newConfig.autoRotate;
});

// --- Animation loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Animate each agent based on their state
  for (const node of agentNodes.values()) {
    const avatar = node.avatar;
    const indicator = node.statusIndicator;

    if (node.state === 'working') {
      // Typing animation - hands bob up and down
      const leftHand = avatar.getObjectByName('left-hand');
      const rightHand = avatar.getObjectByName('right-hand');
      if (leftHand) leftHand.position.y = 0.82 + bob(t + node.index * 0.5, 8, 0.03);
      if (rightHand) rightHand.position.y = 0.82 + bob(t + node.index * 0.5 + 0.3, 8, 0.03);

      // Subtle head movement
      avatar.children[0].rotation.y = Math.sin(t * 0.5 + node.index) * 0.1;

      // Status ring steady glow
      const dot = indicator.getObjectByName('status-dot') as THREE.Mesh;
      if (dot) (dot.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;

    } else if (node.state === 'idle') {
      // Breathing animation
      const torso = avatar.getObjectByName('torso');
      if (torso) torso.scale.setScalar(1 + breathe(t + node.index, 1.5, 0.015));

      // Gentle sway
      avatar.rotation.y = Math.PI + Math.sin(t * 0.3 + node.index * 2) * 0.05;

      // Pulsing indicator
      const dot = indicator.getObjectByName('status-dot') as THREE.Mesh;
      if (dot) (dot.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse(t, 1.5, 0.3, 0.8);

    } else if (node.state === 'error') {
      // Urgent pulsing
      const ring = indicator.getObjectByName('status-ring') as THREE.Mesh;
      const dot = indicator.getObjectByName('status-dot') as THREE.Mesh;
      const p = pulse(t, 4, 0.2, 1.5);
      if (ring) (ring.material as THREE.MeshStandardMaterial).emissiveIntensity = p;
      if (dot) (dot.material as THREE.MeshStandardMaterial).emissiveIntensity = p;

      // Head down slightly
      avatar.children[0].rotation.x = 0.15;

    } else {
      // Offline - dim everything
      const dot = indicator.getObjectByName('status-dot') as THREE.Mesh;
      if (dot) (dot.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
    }
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

// --- Resize handler ---
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
});
