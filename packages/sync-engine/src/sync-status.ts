export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'conflict';

type StatusSubscriber = (status: SyncStatus) => void;

const VALID_TRANSITIONS: Record<SyncStatus, Set<SyncStatus>> = {
  synced: new Set(['syncing', 'offline']),
  syncing: new Set(['synced', 'offline', 'conflict']),
  offline: new Set(['syncing']),
  conflict: new Set(['syncing']),
};

export class SyncStatusManager {
  private status: SyncStatus = 'synced';
  private lastSyncTime: number | null = null;
  private conflictCount = 0;
  private readonly subscribers: Set<StatusSubscriber> = new Set();

  getStatus(): SyncStatus {
    return this.status;
  }

  transition(newStatus: SyncStatus): boolean {
    const allowed = VALID_TRANSITIONS[this.status];
    if (!allowed.has(newStatus)) {
      return false;
    }

    this.status = newStatus;

    if (newStatus === 'synced') {
      this.lastSyncTime = Date.now();
    }

    if (newStatus === 'conflict') {
      this.conflictCount++;
    }

    for (const subscriber of this.subscribers) {
      subscriber(newStatus);
    }

    return true;
  }

  subscribe(callback: StatusSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  getConflictCount(): number {
    return this.conflictCount;
  }
}
