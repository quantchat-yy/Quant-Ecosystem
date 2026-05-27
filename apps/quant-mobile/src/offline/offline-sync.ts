// Mobile Offline Sync - Integrates with @quant/sync-engine OfflineOperationQueue

import { OfflineOperationQueue } from '@quant/sync-engine';
import type { OfflineOperation } from '@quant/sync-engine';

export type NetworkState = 'online' | 'offline' | 'metered';

export interface SyncQueueStatus {
  pendingCount: number;
  oldestItem: number | null;
  newestItem: number | null;
  totalSize: number;
}

export interface QueuedMutation {
  id: string;
  key: string;
  payload: unknown;
  priority?: number;
}

export type NetworkChangeHandler = (state: NetworkState) => void;

/**
 * Executor callback that performs the actual mutation for a queued operation.
 * Returns true if the operation was successfully applied, false otherwise.
 */
export type MutationExecutor = (op: OfflineOperation) => Promise<boolean>;

export class MobileOfflineSync {
  private readonly queue: OfflineOperationQueue;
  private readonly executor: MutationExecutor;
  private networkState: NetworkState = 'online';
  private networkHandlers: NetworkChangeHandler[] = [];
  private mutationCount = 0;

  constructor(config?: { maxRetries?: number; executor?: MutationExecutor }) {
    this.queue = new OfflineOperationQueue({ maxRetries: config?.maxRetries ?? 5 });
    this.executor = config?.executor ?? (async () => true);
  }

  queueMutation(operation: QueuedMutation): void {
    this.queue.enqueue({
      id: operation.id,
      key: operation.key,
      payload: operation.payload,
      priority: operation.priority ?? 0,
    });
    this.mutationCount++;
  }

  async replayOnReconnect(): Promise<{ successful: number; failed: number }> {
    if (this.networkState === 'offline') {
      return { successful: 0, failed: 0 };
    }

    const result = await this.queue.replayAll(this.executor);

    return { successful: result.successful, failed: result.failed + result.deadLettered };
  }

  getQueueStatus(): SyncQueueStatus {
    const operations = this.queue.peek();
    let oldestItem: number | null = null;
    let newestItem: number | null = null;

    for (const op of operations) {
      if (oldestItem === null || op.createdAt < oldestItem) {
        oldestItem = op.createdAt;
      }
      if (newestItem === null || op.createdAt > newestItem) {
        newestItem = op.createdAt;
      }
    }

    return {
      pendingCount: this.queue.size(),
      oldestItem,
      newestItem,
      totalSize: this.mutationCount,
    };
  }

  clearQueue(): void {
    this.queue.clear();
  }

  onNetworkChange(handler: NetworkChangeHandler): () => void {
    this.networkHandlers.push(handler);
    return () => {
      this.networkHandlers = this.networkHandlers.filter((h) => h !== handler);
    };
  }

  getCurrentNetworkState(): NetworkState {
    return this.networkState;
  }

  /** @internal - for testing */
  _setNetworkState(state: NetworkState): void {
    const oldState = this.networkState;
    this.networkState = state;
    if (oldState !== state) {
      for (const handler of this.networkHandlers) {
        handler(state);
      }
    }
  }
}
