export interface DashboardConfig {
  apiUrl: string;
  pollInterval: number;
  autoRotate: boolean;
}

const STORAGE_KEY = 'paperclip-dashboard-config';

export function loadConfig(): DashboardConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultConfig(), ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return defaultConfig();
}

export function saveConfig(config: DashboardConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function defaultConfig(): DashboardConfig {
  return {
    apiUrl: window.location.origin,
    pollInterval: 5000,
    autoRotate: false,
  };
}

export function initConfigPanel(
  config: DashboardConfig,
  onChange: (config: DashboardConfig) => void,
): void {
  const panel = document.getElementById('config-panel')!;
  const toggle = document.getElementById('config-toggle')!;

  panel.innerHTML = `
    <h3>Settings</h3>
    <label for="cfg-url">Paperclip API URL</label>
    <input type="text" id="cfg-url" value="${config.apiUrl}" placeholder="http://localhost:10000" />
    <label for="cfg-interval">Poll Interval (seconds)</label>
    <input type="number" id="cfg-interval" value="${config.pollInterval / 1000}" min="2" max="60" step="1" />
    <div class="toggle-row">
      <label>Auto-rotate camera</label>
      <input type="checkbox" id="cfg-rotate" ${config.autoRotate ? 'checked' : ''} />
    </div>
    <button id="cfg-save">Apply</button>
  `;

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  panel.querySelector('#cfg-save')!.addEventListener('click', () => {
    const url = (panel.querySelector('#cfg-url') as HTMLInputElement).value;
    const interval = parseFloat((panel.querySelector('#cfg-interval') as HTMLInputElement).value) * 1000;
    const autoRotate = (panel.querySelector('#cfg-rotate') as HTMLInputElement).checked;

    const newConfig: DashboardConfig = {
      apiUrl: url || config.apiUrl,
      pollInterval: Math.max(2000, Math.min(60000, interval || 5000)),
      autoRotate,
    };
    saveConfig(newConfig);
    onChange(newConfig);
    panel.classList.remove('open');
  });
}
