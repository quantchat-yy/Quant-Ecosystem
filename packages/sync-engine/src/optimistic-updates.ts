// ============================================================================
// Optimistic Update Manager
// ============================================================================

export interface PendingMutation {
  mutationId: string;
  optimisticState: unknown;
  appliedAt: number;
}

type PendingSubscriber = (pending: PendingMutation[]) => void;

export class OptimisticUpdateManager {
  private readonly pendingMutations: Map<string, { optimisticState: unknown; appliedAt: number }> =
    new Map();
  private readonly subscribers: Set<PendingSubscriber> = new Set();

  apply(mutationId: string, optimisticState: unknown): void {
    this.pendingMutations.set(mutationId, {
      optimisticState,
      appliedAt: Date.now(),
    });
    this.notify();
  }

  confirm(mutationId: string): boolean {
    const existed = this.pendingMutations.delete(mutationId);
    if (existed) {
      this.notify();
    }
    return existed;
  }

  rollback(mutationId: string): unknown | null {
    const entry = this.pendingMutations.get(mutationId);
    if (!entry) {
      return null;
    }
    this.pendingMutations.delete(mutationId);
    this.notify();
    return entry.optimisticState;
  }

  getPending(): PendingMutation[] {
    const result: PendingMutation[] = [];
    for (const [mutationId, entry] of this.pendingMutations) {
      result.push({
        mutationId,
        optimisticState: entry.optimisticState,
        appliedAt: entry.appliedAt,
      });
    }
    return result;
  }

  getPendingCount(): number {
    return this.pendingMutations.size;
  }

  hasPending(mutationId: string): boolean {
    return this.pendingMutations.has(mutationId);
  }

  subscribe(callback: PendingSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    const pending = this.getPending();
    for (const subscriber of this.subscribers) {
      subscriber(pending);
    }
  }
}
