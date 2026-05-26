export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

export interface ReplayResult {
  successful: number;
  failed: number;
  remaining: number;
}

export interface IServiceWorkerAPI {
  register(scriptUrl: string): Promise<void>;
  unregister(): Promise<void>;
}

export class ServiceWorkerManager {
  private registered = false;
  private scriptUrl: string | null = null;
  private readonly queue: QueuedRequest[] = [];
  private readonly swApi: IServiceWorkerAPI | null;
  private readonly maxQueueSize: number;

  constructor(swApi?: IServiceWorkerAPI, maxQueueSize = 1000) {
    this.swApi = swApi ?? null;
    this.maxQueueSize = maxQueueSize;
  }

  async register(scriptUrl: string): Promise<void> {
    if (this.swApi) {
      await this.swApi.register(scriptUrl);
    }
    this.scriptUrl = scriptUrl;
    this.registered = true;
  }

  async unregister(): Promise<void> {
    if (this.swApi && this.registered) {
      await this.swApi.unregister();
    }
    this.registered = false;
    this.scriptUrl = null;
  }

  isRegistered(): boolean {
    return this.registered;
  }

  getScriptUrl(): string | null {
    return this.scriptUrl;
  }

  queueRequest(request: QueuedRequest): void {
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }
    this.queue.push(request);
  }

  getQueuedRequests(): QueuedRequest[] {
    return [...this.queue];
  }

  async replayQueue(sender: (req: QueuedRequest) => Promise<boolean>): Promise<ReplayResult> {
    let successful = 0;
    let failed = 0;
    const toRetry: QueuedRequest[] = [];

    for (const request of this.queue) {
      try {
        const success = await sender(request);
        if (success) {
          successful++;
        } else {
          failed++;
          toRetry.push(request);
        }
      } catch {
        failed++;
        toRetry.push(request);
      }
    }

    this.queue.length = 0;
    for (const req of toRetry) {
      this.queue.push(req);
    }

    return {
      successful,
      failed,
      remaining: this.queue.length,
    };
  }

  clearQueue(): void {
    this.queue.length = 0;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}
