import { PaperclipClient } from './client';
import type { AgentStatus } from '../types';

export type PollCallback = (agents: AgentStatus[], healthy: boolean) => void;

export class Poller {
  private client: PaperclipClient;
  private interval: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private callback: PollCallback;

  constructor(client: PaperclipClient, callback: PollCallback, intervalMs: number = 5000) {
    this.client = client;
    this.callback = callback;
    this.interval = intervalMs;
  }

  start() {
    this.poll();
    this.timer = setInterval(() => this.poll(), this.interval);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setInterval(ms: number) {
    this.interval = ms;
    if (this.timer) {
      this.stop();
      this.start();
    }
  }

  private async poll() {
    const [healthy, agents] = await Promise.all([
      this.client.checkHealth(),
      this.client.fetchAgents(),
    ]);
    this.callback(agents, healthy);
  }
}
