import type { ActionResult, OrchestratorConfig, QueuedAction } from './types.js';

export class PhoneFreeManager {
  private active = false;
  private queue: QueuedAction[] = [];
  private lastActivityAt = 0;
  private readonly maxQueueSize: number;
  private readonly sessionTimeoutMs: number;

  constructor(config?: OrchestratorConfig) {
    this.maxQueueSize = config?.maxQueueSize ?? 50;
    this.sessionTimeoutMs = config?.sessionTimeoutMs ?? 30 * 60 * 1000;
  }

  enter(): void {
    this.active = true;
    this.lastActivityAt = Date.now();
  }

  exit(): void {
    this.active = false;
  }

  isActive(): boolean {
    if (this.active && this.isTimedOut()) {
      this.active = false;
    }
    return this.active;
  }

  enqueue(action: QueuedAction): boolean {
    if (this.queue.length >= this.maxQueueSize) {
      return false;
    }
    this.queue.push(action);
    this.lastActivityAt = Date.now();
    return true;
  }

  dequeue(): QueuedAction | undefined {
    return this.queue.shift();
  }

  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  async processQueue(
    handler: (action: QueuedAction) => Promise<ActionResult>,
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    while (this.queue.length > 0) {
      const action = this.queue.shift();
      if (action) {
        const result = await handler(action);
        results.push(result);
      }
    }
    return results;
  }

  private isTimedOut(): boolean {
    if (this.lastActivityAt === 0) return false;
    return Date.now() - this.lastActivityAt > this.sessionTimeoutMs;
  }
}
