import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function createNameLabel(name: string, task: string | null): CSS2DObject {
  const div = document.createElement('div');
  div.className = 'agent-label';
  div.innerHTML = `
    <div class="name">${escapeHtml(name)}</div>
    <div class="task">${task ? escapeHtml(truncate(task, 30)) : 'Idle'}</div>
  `;

  const label = new CSS2DObject(div);
  label.position.set(0, 2.2, 0);
  return label;
}

export function updateNameLabel(label: CSS2DObject, name: string, task: string | null): void {
  const div = label.element;
  const nameEl = div.querySelector('.name');
  const taskEl = div.querySelector('.task');
  if (nameEl) nameEl.textContent = name;
  if (taskEl) taskEl.textContent = task ? truncate(task, 30) : 'Idle';
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
