import type { AgentStatus, AgentState } from '../types';

export class PaperclipClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchAgents(): Promise<AgentStatus[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/agents`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const data = await res.json();
      return this.normalizeAgents(data);
    } catch {
      return [];
    }
  }

  private normalizeAgents(data: unknown): AgentStatus[] {
    // Handle various API response shapes
    const items: unknown[] = Array.isArray(data) ? data : (data as Record<string, unknown>)?.agents as unknown[] ?? (data as Record<string, unknown>)?.data as unknown[] ?? [];

    return items.map((raw: unknown) => {
      const item = raw as Record<string, unknown>;
      return {
        id: String(item.id ?? item.agentId ?? item.uuid ?? Math.random().toString(36).slice(2)),
        name: String(item.name ?? item.displayName ?? item.label ?? 'Agent'),
        state: this.mapState(item),
        currentTask: (item.currentTask ?? item.task ?? item.currentRun ?? item.description ?? null) as string | null,
        type: String(item.type ?? item.adapter ?? item.provider ?? 'unknown'),
        lastHeartbeat: (item.lastHeartbeat ?? item.lastSeen ?? item.updatedAt ?? null) as string | null,
      };
    });
  }

  private mapState(item: Record<string, unknown>): AgentState {
    const status = String(item.status ?? item.state ?? item.agentStatus ?? '').toLowerCase();
    if (['running', 'active', 'working', 'busy', 'executing'].includes(status)) return 'working';
    if (['idle', 'ready', 'available', 'waiting'].includes(status)) return 'idle';
    if (['error', 'failed', 'crashed', 'auth_required', 'claude_auth_required'].includes(status)) return 'error';
    return 'offline';
  }
}
