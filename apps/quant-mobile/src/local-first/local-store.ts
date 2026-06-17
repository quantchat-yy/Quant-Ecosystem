// Mobile Local-First Store — wires @quant/local-first into the Capacitor shell.
//
// quant-mobile is a pure Vite + React + Capacitor client shell: there is no
// Fastify backend and no Next.js `app/api` proxy layer, so the standard 5-layer
// backend seam (route + proxy + api-client hook) does not apply here. The seam
// that the mobile architecture *does* support is a client-side service that
// consumes the engine directly — exactly the shape of the existing
// `MobileOfflineSync` (which wraps `@quant/sync-engine`). This file is the real,
// non-test importer of `@quant/local-first` that closes DoD-1 for the engine.
//
// `@quant/local-first` is pure client logic (an in-memory CRDT `OfflineStore` and
// a `SyncManager` replication log) with no native-hardware or backend
// dependency, so it runs unchanged in the WebView. It is the natural offline
// substrate for the mega-shell, complementing `MobileOfflineSync`'s mutation
// queue with conflict-aware local persistence.

import {
  OfflineStore,
  SyncManager,
  createOfflineStore,
  createSyncManager,
  type LocalFirstConfig,
  type SyncState,
  type ConflictResolution,
  type ConflictRecord,
} from '@quant/local-first';

export interface MobileLocalStoreOptions {
  /** Local-first store configuration (db name, conflict strategy, queue size, …). */
  config?: Partial<LocalFirstConfig>;
  /** Merge strategy for the replication-log sync manager. */
  mergeStrategy?: 'three-way' | 'operational-transform' | 'crdt';
}

/**
 * Client-side facade the mega-shell uses for offline-first, conflict-aware local
 * storage. Wraps a `@quant/local-first` `OfflineStore` (CRDT collections) and a
 * `SyncManager` (replication log) and keeps their online/offline state aligned
 * with the device's network state.
 */
export class MobileLocalStore {
  private readonly store: OfflineStore;
  private readonly sync: SyncManager;

  constructor(options: MobileLocalStoreOptions = {}) {
    this.store = createOfflineStore(options.config);
    this.sync = createSyncManager({
      localConfig: this.store.getConfig(),
      mergeStrategy: options.mergeStrategy ?? 'crdt',
    });
  }

  /** Begin processing the replication log. */
  start(): void {
    this.sync.start();
  }

  /** Stop the sync manager and clear any interval. */
  stop(): void {
    this.sync.stop();
  }

  isRunning(): boolean {
    return this.sync.isRunning();
  }

  /** Persist a value locally and record the change for replication. */
  async put(collection: string, key: string, value: unknown): Promise<void> {
    await this.store.put(collection, key, value);
    this.sync.recordChange('create', collection, key);
  }

  async get<T = unknown>(collection: string, key: string): Promise<T | null> {
    return (await this.store.get(collection, key)) as T | null;
  }

  async delete(collection: string, key: string): Promise<boolean> {
    const existed = await this.store.delete(collection, key);
    if (existed) this.sync.recordChange('delete', collection, key);
    return existed;
  }

  async getAll(collection: string): Promise<Map<string, unknown>> {
    return this.store.getAll(collection);
  }

  /** Propagate the device's network state to both the store and the sync manager. */
  setOnline(online: boolean): void {
    this.store.setOnline(online);
    this.sync.setOnline(online);
  }

  /** Flush queued local changes when connectivity allows. */
  async flush(): Promise<{ sent: number; received: number }> {
    await this.store.processQueue();
    return this.sync.sync();
  }

  getSyncState(): SyncState {
    return this.store.getSyncState();
  }

  /** Unresolved CRDT conflicts surfaced for the UI to reconcile. */
  getConflicts(): ConflictRecord[] {
    return this.store.getSyncState().conflicts.filter((c) => !c.resolved);
  }

  resolveConflict(conflictId: string, resolution: ConflictResolution): boolean {
    return this.store.resolveConflict(conflictId, resolution);
  }

  /** @internal exposed for advanced callers/tests that need the raw engines. */
  get _store(): OfflineStore {
    return this.store;
  }
  /** @internal */
  get _sync(): SyncManager {
    return this.sync;
  }
}
