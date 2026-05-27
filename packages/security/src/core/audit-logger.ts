// ============================================================================
// Security Package - Audit Logger
// ============================================================================

import type { AuditLogEntry, AuditActor } from '../types';

/** Audit logger configuration */
interface AuditLogConfig {
  maxEntries: number;
  enableTamperDetection: boolean;
  retentionDays: number;
  enableIndexing: boolean;
}

/** Default configuration */
const DEFAULT_CONFIG: AuditLogConfig = {
  maxEntries: 100000,
  enableTamperDetection: true,
  retentionDays: 90,
  enableIndexing: true,
};

/**
 * AuditLogger - Tamper-evident structured audit logging with who/what/when/where
 * tracking, hash chain integrity, searchable indexes, and retention policies.
 */
export class AuditLogger {
  private config: AuditLogConfig;
  private entries: AuditLogEntry[];
  private lastHash: string;
  private actorIndex: Map<string, number[]>;
  private actionIndex: Map<string, number[]>;
  private resourceIndex: Map<string, number[]>;
  private timeIndex: Map<string, number[]>;
  private entryCount: number;

  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.entries = [];
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    this.actorIndex = new Map();
    this.actionIndex = new Map();
    this.resourceIndex = new Map();
    this.timeIndex = new Map();
    this.entryCount = 0;
  }

  /** Log an audit event */
  async log(params: {
    actor: AuditActor;
    action: string;
    resource: string;
    resourceId: string;
    outcome: 'success' | 'failure' | 'error';
    details?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<AuditLogEntry> {
    const now = Date.now();
    const id = this.generateId();

    // Compute hash chain (tamper detection)
    const entryData = `${id}:${params.actor.id}:${params.action}:${params.resource}:${now}:${this.lastHash}`;
    const hash = this.computeHash(entryData);

    const entry: AuditLogEntry = {
      id,
      timestamp: now,
      actor: params.actor,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      outcome: params.outcome,
      details: params.details || {},
      ip: params.ip || '',
      userAgent: params.userAgent || '',
      hash,
      previousHash: this.lastHash,
    };

    this.entries.push(entry);
    this.lastHash = hash;
    this.entryCount++;

    // Update indexes
    if (this.config.enableIndexing) {
      this.updateIndexes(entry, this.entries.length - 1);
    }

    // Enforce max entries
    if (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
      this.rebuildIndexes();
    }

    return entry;
  }

  /** Verify integrity of the audit log chain */
  verifyIntegrity(): { valid: boolean; brokenAt?: number; details: string } {
    if (this.entries.length === 0) {
      return { valid: true, details: 'Empty log' };
    }

    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]!;

      // Verify previous hash link
      if (entry.previousHash !== previousHash) {
        return {
          valid: false,
          brokenAt: i,
          details: `Hash chain broken at entry ${i}: expected previousHash ${previousHash}, got ${entry.previousHash}`,
        };
      }

      // Recompute and verify entry hash
      const entryData = `${entry.id}:${entry.actor.id}:${entry.action}:${entry.resource}:${entry.timestamp}:${previousHash}`;
      const expectedHash = this.computeHash(entryData);

      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: i,
          details: `Entry ${i} hash mismatch: content may have been tampered`,
        };
      }

      previousHash = entry.hash;
    }

    return { valid: true, details: `${this.entries.length} entries verified` };
  }

  /** Search audit log by actor */
  searchByActor(actorId: string, limit: number = 50): AuditLogEntry[] {
    if (this.config.enableIndexing) {
      const indices = this.actorIndex.get(actorId) || [];
      return indices
        .slice(-limit)
        .map((i) => this.entries[i])
        .filter((e): e is AuditLogEntry => e !== undefined);
    }
    return this.entries.filter((e) => e.actor.id === actorId).slice(-limit);
  }

  /** Search audit log by action */
  searchByAction(action: string, limit: number = 50): AuditLogEntry[] {
    if (this.config.enableIndexing) {
      const indices = this.actionIndex.get(action) || [];
      return indices
        .slice(-limit)
        .map((i) => this.entries[i])
        .filter((e): e is AuditLogEntry => e !== undefined);
    }
    return this.entries.filter((e) => e.action === action).slice(-limit);
  }

  /** Search audit log by resource */
  searchByResource(resource: string, resourceId?: string, limit: number = 50): AuditLogEntry[] {
    if (this.config.enableIndexing) {
      const key = resourceId ? `${resource}:${resourceId}` : resource;
      const indices = this.resourceIndex.get(key) || this.resourceIndex.get(resource) || [];
      return indices
        .slice(-limit)
        .map((i) => this.entries[i])
        .filter((e): e is AuditLogEntry => e !== undefined);
    }
    return this.entries
      .filter((e) => e.resource === resource && (!resourceId || e.resourceId === resourceId))
      .slice(-limit);
  }

  /** Search by time range */
  searchByTimeRange(start: number, end: number, limit: number = 100): AuditLogEntry[] {
    return this.entries.filter((e) => e.timestamp >= start && e.timestamp <= end).slice(-limit);
  }

  /** Search by outcome */
  searchByOutcome(outcome: 'success' | 'failure' | 'error', limit: number = 50): AuditLogEntry[] {
    return this.entries.filter((e) => e.outcome === outcome).slice(-limit);
  }

  /** Get recent entries */
  getRecent(count: number = 20): AuditLogEntry[] {
    return this.entries.slice(-count);
  }

  /** Get entry by ID */
  getEntry(id: string): AuditLogEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /** Apply retention policy - remove entries older than retention period */
  async applyRetention(): Promise<number> {
    const cutoff = Date.now() - this.config.retentionDays * 86400000;
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.timestamp > cutoff);
    const removed = before - this.entries.length;

    if (removed > 0) {
      this.rebuildIndexes();
    }

    return removed;
  }

  /** Export audit log for compliance */
  async export(
    start?: number,
    end?: number,
  ): Promise<{ entries: AuditLogEntry[]; integrityValid: boolean; exportedAt: number }> {
    const filtered =
      start && end
        ? this.entries.filter((e) => e.timestamp >= start && e.timestamp <= end)
        : [...this.entries];

    const integrity = this.verifyIntegrity();

    return {
      entries: filtered,
      integrityValid: integrity.valid,
      exportedAt: Date.now(),
    };
  }

  /** Update search indexes */
  private updateIndexes(entry: AuditLogEntry, index: number): void {
    // Actor index
    const actorIndices = this.actorIndex.get(entry.actor.id) || [];
    actorIndices.push(index);
    this.actorIndex.set(entry.actor.id, actorIndices);

    // Action index
    const actionIndices = this.actionIndex.get(entry.action) || [];
    actionIndices.push(index);
    this.actionIndex.set(entry.action, actionIndices);

    // Resource index
    const resourceKey = `${entry.resource}:${entry.resourceId}`;
    const resourceIndices = this.resourceIndex.get(resourceKey) || [];
    resourceIndices.push(index);
    this.resourceIndex.set(resourceKey, resourceIndices);

    // Also index by resource type alone
    const typeIndices = this.resourceIndex.get(entry.resource) || [];
    typeIndices.push(index);
    this.resourceIndex.set(entry.resource, typeIndices);

    // Time index (by hour)
    const hourKey = new Date(entry.timestamp).toISOString().substring(0, 13);
    const timeIndices = this.timeIndex.get(hourKey) || [];
    timeIndices.push(index);
    this.timeIndex.set(hourKey, timeIndices);
  }

  /** Rebuild all indexes from scratch */
  private rebuildIndexes(): void {
    this.actorIndex.clear();
    this.actionIndex.clear();
    this.resourceIndex.clear();
    this.timeIndex.clear();

    for (let i = 0; i < this.entries.length; i++) {
      this.updateIndexes(this.entries[i]!, i);
    }
  }

  /** Compute hash for tamper detection */
  private computeHash(input: string): string {
    let h0 = 0x6a09e667,
      h1 = 0xbb67ae85,
      h2 = 0x3c6ef372,
      h3 = 0xa54ff53a;
    let h4 = 0x510e527f,
      h5 = 0x9b05688c,
      h6 = 0x1f83d9ab,
      h7 = 0x5be0cd19;

    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        h0 = Math.imul(h0 ^ c, 0x01000193) >>> 0;
        h1 = Math.imul(h1 ^ (c + round), 0x5bd1e995) >>> 0;
        h2 = Math.imul(h2 ^ (c * (i + 1)), 0x1b873593) >>> 0;
        h3 = Math.imul(h3 ^ (c ^ round), 0xcc9e2d51) >>> 0;
        h4 = Math.imul(h4 ^ (c + i), 0x85ebca6b) >>> 0;
        h5 = Math.imul(h5 ^ (c * round + 1), 0xc2b2ae35) >>> 0;
        h6 = Math.imul(h6 ^ (c + 7 + i), 0x27d4eb2f) >>> 0;
        h7 = Math.imul(h7 ^ (c ^ i ^ round), 0x165667b1) >>> 0;
      }
      h0 ^= h4 >>> 13;
      h1 ^= h5 >>> 7;
      h2 ^= h6 >>> 17;
      h3 ^= h7 >>> 11;
    }

    return [h0, h1, h2, h3, h4, h5, h6, h7]
      .map((h) => (h >>> 0).toString(16).padStart(8, '0'))
      .join('');
  }

  /** Generate unique ID */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /** Get statistics */
  getStats(): { totalEntries: number; integrityValid: boolean; indexSize: number } {
    return {
      totalEntries: this.entries.length,
      integrityValid: this.verifyIntegrity().valid,
      indexSize: this.actorIndex.size + this.actionIndex.size + this.resourceIndex.size,
    };
  }
}
