import * as Y from 'yjs';
import type { PersistenceAdapter } from './collab-persistence';
import type { StorageAdapter } from './collab-storage';
import type { AwarenessService, AwarenessState } from './awareness.service';
import type { ParagraphPermissionsService } from './paragraph-permissions.service';
import type { VersionHistoryService } from './version-history.service';
import type { DocBranchingService } from './doc-branching.service';

export interface YjsServerOptions {
  persistence?: PersistenceAdapter;
  storage?: StorageAdapter;
  awareness?: AwarenessService;
  permissions?: ParagraphPermissionsService;
  versionHistory?: VersionHistoryService;
  branching?: DocBranchingService;
  flushIntervalMs?: number;
}

export class YjsServer {
  private readonly docs: Map<string, Y.Doc> = new Map();
  private readonly connections: Map<string, Set<string>> = new Map();
  private readonly lastActivity: Map<string, number> = new Map();
  private readonly evictionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly flushTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  private readonly persistence?: PersistenceAdapter;
  private readonly storage?: StorageAdapter;
  private readonly awareness?: AwarenessService;
  private readonly permissions?: ParagraphPermissionsService;
  private readonly versionHistory?: VersionHistoryService;
  private readonly branching?: DocBranchingService;
  private readonly flushIntervalMs: number;

  constructor(options?: YjsServerOptions) {
    this.persistence = options?.persistence;
    this.storage = options?.storage;
    this.awareness = options?.awareness;
    this.permissions = options?.permissions;
    this.versionHistory = options?.versionHistory;
    this.branching = options?.branching;
    this.flushIntervalMs = options?.flushIntervalMs ?? 30000;
  }

  getOrCreateDoc(docId: string): Y.Doc {
    let doc = this.docs.get(docId);
    if (!doc) {
      doc = new Y.Doc();
      this.docs.set(docId, doc);
    }
    this.lastActivity.set(docId, Date.now());
    return doc;
  }

  applyUpdate(docId: string, update: Uint8Array): void {
    const doc = this.getOrCreateDoc(docId);
    Y.applyUpdate(doc, update);
    this.lastActivity.set(docId, Date.now());
  }

  /**
   * Apply an update with per-paragraph permission checking.
   * Returns false if the update is denied by permissions.
   */
  applyUpdateWithPermissions(
    docId: string,
    update: Uint8Array,
    userId: string,
    paragraphId: string,
  ): boolean {
    if (this.permissions) {
      const allowed = this.permissions.checkPermission(docId, paragraphId, userId, 'write');
      if (!allowed) {
        return false;
      }
    }

    this.applyUpdate(docId, update);
    return true;
  }

  getStateVector(docId: string): Uint8Array {
    const doc = this.getOrCreateDoc(docId);
    return Y.encodeStateVector(doc);
  }

  encodeState(docId: string): Uint8Array {
    const doc = this.getOrCreateDoc(docId);
    return Y.encodeStateAsUpdate(doc);
  }

  handleConnection(docId: string, clientId: string): void {
    let clients = this.connections.get(docId);
    if (!clients) {
      clients = new Set();
      this.connections.set(docId, clients);
    }
    clients.add(clientId);
    this.lastActivity.set(docId, Date.now());

    // Cancel any pending eviction since a client connected
    const timer = this.evictionTimers.get(docId);
    if (timer) {
      clearTimeout(timer);
      this.evictionTimers.delete(docId);
    }

    // Start flush interval if persistence is configured and not already running
    if (this.persistence && !this.flushTimers.has(docId)) {
      this.startFlushInterval(docId);
    }
  }

  removeConnection(docId: string, clientId: string): void {
    const clients = this.connections.get(docId);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.connections.delete(docId);

        // Flush on last client disconnect if persistence is configured
        if (this.persistence) {
          this.flushDoc(docId).catch(() => {
            // Persistence errors are non-fatal
          });
          this.stopFlushInterval(docId);
        }

        this.scheduleEviction(docId);
      }
    }

    // Remove from awareness if configured
    if (this.awareness) {
      this.awareness.removeClient(docId, clientId);
    }
  }

  getConnectedClients(docId: string): string[] {
    const clients = this.connections.get(docId);
    return clients ? Array.from(clients) : [];
  }

  /**
   * Flush document state to persistence.
   */
  async flushDoc(docId: string): Promise<void> {
    if (!this.persistence) return;

    const doc = this.docs.get(docId);
    if (!doc) return;

    const state = Y.encodeStateAsUpdate(doc);
    await this.persistence.saveDoc(docId, state);
  }

  /**
   * Load document state from persistence.
   */
  async loadFromPersistence(docId: string): Promise<Y.Doc> {
    const doc = this.getOrCreateDoc(docId);

    if (this.persistence) {
      const state = await this.persistence.loadDoc(docId);
      if (state) {
        Y.applyUpdate(doc, state);
      }
    }

    return doc;
  }

  /**
   * Create an S3 snapshot of the current document state.
   */
  async createSnapshot(docId: string, label?: string): Promise<void> {
    if (!this.storage) return;

    const doc = this.docs.get(docId);
    if (!doc) return;

    const state = Y.encodeStateAsUpdate(doc);
    await this.storage.uploadSnapshot(docId, state, { label });
  }

  /**
   * Update awareness state for a client.
   */
  updateAwareness(
    docId: string,
    clientId: string,
    state: Omit<AwarenessState, 'clientId' | 'lastUpdated'>,
  ): void {
    if (this.awareness) {
      this.awareness.updateAwareness(docId, clientId, state);
    }
  }

  /**
   * Get all awareness states for a document.
   */
  getAwareness(docId: string): AwarenessState[] {
    if (this.awareness) {
      return this.awareness.getAwareness(docId);
    }
    return [];
  }

  /**
   * Create a named checkpoint for version history.
   */
  createCheckpoint(docId: string, name: string, userId: string): void {
    if (!this.versionHistory) return;

    const doc = this.docs.get(docId);
    if (!doc) return;

    const state = Y.encodeStateAsUpdate(doc);
    this.versionHistory.createCheckpoint(docId, name, userId, state);
  }

  /**
   * Create a branch from the current document state.
   */
  createBranch(docId: string, branchName: string, userId: string): string | null {
    if (!this.branching) return null;

    const doc = this.docs.get(docId);
    if (!doc) return null;

    const state = Y.encodeStateAsUpdate(doc);
    const branch = this.branching.createBranch(docId, branchName, userId, state);
    return branch.id;
  }

  /**
   * Evict documents that have been idle (no connected clients) for longer than maxIdleMs.
   * Returns the list of evicted document IDs.
   */
  evictIdleDocs(maxIdleMs: number): string[] {
    const now = Date.now();
    const evicted: string[] = [];

    for (const [docId, lastTime] of this.lastActivity.entries()) {
      const clients = this.connections.get(docId);
      const hasClients = clients && clients.size > 0;

      if (!hasClients && now - lastTime >= maxIdleMs) {
        this.docs.get(docId)?.destroy();
        this.docs.delete(docId);
        this.lastActivity.delete(docId);
        const timer = this.evictionTimers.get(docId);
        if (timer) {
          clearTimeout(timer);
          this.evictionTimers.delete(docId);
        }
        evicted.push(docId);
      }
    }

    return evicted;
  }

  /**
   * Shut down the server by clearing all pending eviction timers.
   * This allows the Node.js process to exit gracefully.
   */
  shutdown(): void {
    for (const timer of this.evictionTimers.values()) {
      clearTimeout(timer);
    }
    this.evictionTimers.clear();

    for (const timer of this.flushTimers.values()) {
      clearInterval(timer);
    }
    this.flushTimers.clear();
  }

  private scheduleEviction(docId: string, delayMs = 300000): void {
    const timer = setTimeout(() => {
      this.evictionTimers.delete(docId);
      const clients = this.connections.get(docId);
      if (!clients || clients.size === 0) {
        this.docs.get(docId)?.destroy();
        this.docs.delete(docId);
        this.lastActivity.delete(docId);
      }
    }, delayMs);
    timer.unref();
    this.evictionTimers.set(docId, timer);
  }

  private startFlushInterval(docId: string): void {
    const timer = setInterval(() => {
      this.flushDoc(docId).catch(() => {
        // Persistence errors are non-fatal during interval flush
      });
    }, this.flushIntervalMs);
    timer.unref();
    this.flushTimers.set(docId, timer);
  }

  private stopFlushInterval(docId: string): void {
    const timer = this.flushTimers.get(docId);
    if (timer) {
      clearInterval(timer);
      this.flushTimers.delete(docId);
    }
  }
}
