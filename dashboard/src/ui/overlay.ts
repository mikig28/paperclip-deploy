import type { AgentStatus } from '../types';

export function updateHUD(agents: AgentStatus[], healthy: boolean): void {
  const hud = document.getElementById('hud')!;

  const working = agents.filter(a => a.state === 'working').length;
  const idle = agents.filter(a => a.state === 'idle').length;
  const errored = agents.filter(a => a.state === 'error').length;

  hud.innerHTML = `
    <div class="badge">
      <span class="dot ${healthy ? 'green' : 'red'}"></span>
      ${healthy ? 'Connected' : 'Disconnected'}
    </div>
    <div class="badge">
      ${agents.length} Agent${agents.length !== 1 ? 's' : ''}
    </div>
    ${working > 0 ? `<div class="badge"><span class="dot green"></span>${working} Working</div>` : ''}
    ${idle > 0 ? `<div class="badge"><span class="dot amber"></span>${idle} Idle</div>` : ''}
    ${errored > 0 ? `<div class="badge"><span class="dot red"></span>${errored} Error</div>` : ''}
  `;
}
