import type { AgentStatus, AgentState } from '../types';

export class PaperclipClient {
  private baseUrl: string;
  private companyId: string | null = null;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
    this.companyId = null; // reset on URL change
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Accept': 'application/json' };
    if (this.authToken) h['Authorization'] = `Bearer ${this.authToken}`;
    return h;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Auto-discover the first company ID from the dashboard or companies endpoint */
  private async discoverCompanyId(): Promise<string | null> {
    if (this.companyId) return this.companyId;
    try {
      // Try listing companies
      const res = await fetch(`${this.baseUrl}/api/companies`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const companies = Array.isArray(data) ? data : data?.companies ?? data?.data ?? [];
        if (companies.length > 0) {
          this.companyId = String(companies[0].id);
          return this.companyId;
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  async fetchAgents(): Promise<AgentStatus[]> {
    const companyId = await this.discoverCompanyId();

    // Try company-scoped endpoint first (the real Paperclip API)
    if (companyId) {
      try {
        const res = await fetch(`${this.baseUrl}/api/companies/${companyId}/agents`, {
          headers: this.headers(),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return this.normalizeAgents(data);
        }
      } catch { /* fall through */ }
    }

    // Fallback: try generic /api/agents
    try {
      const res = await fetch(`${this.baseUrl}/api/agents`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return this.normalizeAgents(data);
    } catch {
      return [];
    }
  }

  /** Get the WebSocket URL for real-time events */
  getWebSocketUrl(): string | null {
    if (!this.companyId) return null;
    const wsBase = this.baseUrl.replace(/^http/, 'ws');
    return `${wsBase}/api/companies/${this.companyId}/events/ws`;
  }

  private normalizeAgents(data: unknown): AgentStatus[] {
    const items: unknown[] = Array.isArray(data)
      ? data
      : (data as Record<string, unknown>)?.agents as unknown[]
        ?? (data as Record<string, unknown>)?.data as unknown[]
        ?? [];

    return items.map((raw: unknown) => {
      const item = raw as Record<string, unknown>;
      return {
        id: String(item.id ?? item.agentId ?? Math.random().toString(36).slice(2)),
        name: String(item.name ?? item.displayName ?? 'Agent'),
        state: this.mapState(item),
        currentTask: this.extractCurrentTask(item),
        type: String(item.adapterType ?? item.type ?? item.adapter ?? 'unknown'),
        lastHeartbeat: (item.lastHeartbeatAt ?? item.lastHeartbeat ?? item.updatedAt ?? null) as string | null,
      };
    });
  }

  private extractCurrentTask(item: Record<string, unknown>): string | null {
    // Paperclip agents have title, role, and capabilities
    if (item.title) return String(item.title);
    if (item.currentTask) return String(item.currentTask);
    if (item.capabilities) return String(item.capabilities).slice(0, 60);
    return null;
  }

  private mapState(item: Record<string, unknown>): AgentState {
    const status = String(item.status ?? item.state ?? '').toLowerCase();
    if (['running', 'active'].includes(status)) return 'working';
    if (['idle', 'ready', 'paused'].includes(status)) return 'idle';
    if (['error', 'failed', 'pending_approval'].includes(status)) return 'error';
    if (['terminated'].includes(status)) return 'offline';
    return 'offline';
  }
}
