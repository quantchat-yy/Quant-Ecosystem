// ============================================================================
// Conflict Store - Records and resolves conflicts for UI display
// ============================================================================

import type { ConflictStrategy } from './conflict-resolution.js';

export interface ConflictRecord {
  id: string;
  documentId: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
  strategy: ConflictStrategy;
  resolvedValue: unknown | null;
  resolvedAt: number | null;
  resolvedBy: 'auto' | 'user' | null;
}

export class ConflictStore {
  private readonly conflicts: Map<string, ConflictRecord> = new Map();
  private nextId = 1;

  record(
    conflict: Omit<ConflictRecord, 'id' | 'resolvedValue' | 'resolvedAt' | 'resolvedBy'>,
  ): ConflictRecord {
    const id = `conflict-${this.nextId++}`;
    const record: ConflictRecord = {
      ...conflict,
      id,
      resolvedValue: null,
      resolvedAt: null,
      resolvedBy: null,
    };
    this.conflicts.set(id, record);
    return record;
  }

  resolve(id: string, resolvedValue: unknown, resolvedBy: 'auto' | 'user'): ConflictRecord | null {
    const record = this.conflicts.get(id);
    if (!record) {
      return null;
    }
    const updated: ConflictRecord = {
      ...record,
      resolvedValue,
      resolvedAt: Date.now(),
      resolvedBy,
    };
    this.conflicts.set(id, updated);
    return updated;
  }

  getPending(): ConflictRecord[] {
    const results: ConflictRecord[] = [];
    for (const record of this.conflicts.values()) {
      if (record.resolvedAt === null) {
        results.push(record);
      }
    }
    return results;
  }

  getByDocument(documentId: string): ConflictRecord[] {
    const results: ConflictRecord[] = [];
    for (const record of this.conflicts.values()) {
      if (record.documentId === documentId) {
        results.push(record);
      }
    }
    return results;
  }

  getHistory(limit?: number): ConflictRecord[] {
    const resolved: ConflictRecord[] = [];
    for (const record of this.conflicts.values()) {
      if (record.resolvedAt !== null) {
        resolved.push(record);
      }
    }
    resolved.sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));
    if (limit !== undefined) {
      return resolved.slice(0, limit);
    }
    return resolved;
  }

  clear(): void {
    this.conflicts.clear();
    this.nextId = 1;
  }
}
