// ============================================================================
// Sync Status Indicator - UI-friendly status data
// ============================================================================

import type { SyncStatus } from './sync-status.js';
import type { SyncStatusManager } from './sync-status.js';

export interface SyncStatusIndicatorData {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingChangesCount: number;
  isOnline: boolean;
  conflictsCount: number;
  currentOperation: string | null;
}

type IndicatorSubscriber = (indicator: SyncStatusIndicatorData) => void;

export class SyncStatusIndicator {
  private readonly manager: SyncStatusManager;
  private readonly subscribers: Set<IndicatorSubscriber> = new Set();
  private pendingChangesCount = 0;
  private isOnline = true;
  private conflictsCount = 0;
  private currentOperation: string | null = null;
  private readonly unsubscribeManager: () => void;

  constructor(manager: SyncStatusManager) {
    this.manager = manager;
    this.unsubscribeManager = this.manager.subscribe(() => {
      this.notify();
    });
  }

  getIndicator(): SyncStatusIndicatorData {
    return {
      status: this.manager.getStatus(),
      lastSyncedAt: this.manager.getLastSyncTime(),
      pendingChangesCount: this.pendingChangesCount,
      isOnline: this.isOnline,
      conflictsCount: this.conflictsCount,
      currentOperation: this.currentOperation,
    };
  }

  setPendingCount(count: number): void {
    this.pendingChangesCount = count;
    this.notify();
  }

  setOnline(online: boolean): void {
    this.isOnline = online;
    this.notify();
  }

  setConflictsCount(count: number): void {
    this.conflictsCount = count;
    this.notify();
  }

  setCurrentOperation(op: string | null): void {
    this.currentOperation = op;
    this.notify();
  }

  subscribe(callback: IndicatorSubscriber): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  destroy(): void {
    this.unsubscribeManager();
    this.subscribers.clear();
  }

  private notify(): void {
    const indicator = this.getIndicator();
    for (const subscriber of this.subscribers) {
      subscriber(indicator);
    }
  }
}
