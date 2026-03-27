export type AgentState = 'working' | 'idle' | 'error' | 'offline';

export interface AgentStatus {
  id: string;
  name: string;
  state: AgentState;
  currentTask: string | null;
  type: string;
  lastHeartbeat: string | null;
}

export interface DeskSlot {
  position: { x: number; z: number };
  occupied: boolean;
}

export const STATUS_COLORS: Record<AgentState, number> = {
  working: 0x4ade80,
  idle: 0xfbbf24,
  error: 0xf87171,
  offline: 0x64748b,
};

export const STATUS_LABELS: Record<AgentState, string> = {
  working: 'Working',
  idle: 'Idle',
  error: 'Error',
  offline: 'Offline',
};
