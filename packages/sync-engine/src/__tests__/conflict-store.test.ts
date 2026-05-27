import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConflictStore } from '../conflict-store.js';

describe('ConflictStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should record a conflict and return it with generated id', () => {
    const store = new ConflictStore();

    const record = store.record({
      documentId: 'doc-1',
      localValue: { text: 'local' },
      remoteValue: { text: 'remote' },
      localTimestamp: 1000,
      remoteTimestamp: 1001,
      strategy: 'last-write-wins',
    });

    expect(record.id).toBeDefined();
    expect(record.documentId).toBe('doc-1');
    expect(record.localValue).toEqual({ text: 'local' });
    expect(record.remoteValue).toEqual({ text: 'remote' });
    expect(record.resolvedValue).toBeNull();
    expect(record.resolvedAt).toBeNull();
    expect(record.resolvedBy).toBeNull();
  });

  it('should resolve a conflict', () => {
    const store = new ConflictStore();

    const recorded = store.record({
      documentId: 'doc-1',
      localValue: 'local',
      remoteValue: 'remote',
      localTimestamp: 1000,
      remoteTimestamp: 1001,
      strategy: 'last-write-wins',
    });

    const resolved = store.resolve(recorded.id, 'merged-value', 'user');
    expect(resolved).not.toBeNull();
    expect(resolved!.resolvedValue).toBe('merged-value');
    expect(resolved!.resolvedBy).toBe('user');
    expect(resolved!.resolvedAt).toBeTypeOf('number');
  });

  it('should return null when resolving nonexistent conflict', () => {
    const store = new ConflictStore();
    const result = store.resolve('nonexistent', 'value', 'auto');
    expect(result).toBeNull();
  });

  it('should return pending (unresolved) conflicts', () => {
    const store = new ConflictStore();

    store.record({
      documentId: 'doc-1',
      localValue: 'a',
      remoteValue: 'b',
      localTimestamp: 1000,
      remoteTimestamp: 1001,
      strategy: 'last-write-wins',
    });

    const second = store.record({
      documentId: 'doc-2',
      localValue: 'c',
      remoteValue: 'd',
      localTimestamp: 2000,
      remoteTimestamp: 2001,
      strategy: 'local-wins',
    });

    store.resolve(second.id, 'd', 'auto');

    const pending = store.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.documentId).toBe('doc-1');
  });

  it('should get conflicts by document id', () => {
    const store = new ConflictStore();

    store.record({
      documentId: 'doc-1',
      localValue: 'a',
      remoteValue: 'b',
      localTimestamp: 1000,
      remoteTimestamp: 1001,
      strategy: 'last-write-wins',
    });

    store.record({
      documentId: 'doc-1',
      localValue: 'c',
      remoteValue: 'd',
      localTimestamp: 2000,
      remoteTimestamp: 2001,
      strategy: 'local-wins',
    });

    store.record({
      documentId: 'doc-2',
      localValue: 'e',
      remoteValue: 'f',
      localTimestamp: 3000,
      remoteTimestamp: 3001,
      strategy: 'remote-wins',
    });

    const doc1Conflicts = store.getByDocument('doc-1');
    expect(doc1Conflicts).toHaveLength(2);

    const doc2Conflicts = store.getByDocument('doc-2');
    expect(doc2Conflicts).toHaveLength(1);
  });

  it('should get resolved conflict history sorted by most recent', () => {
    const store = new ConflictStore();

    const first = store.record({
      documentId: 'doc-1',
      localValue: 'a',
      remoteValue: 'b',
      localTimestamp: 1000,
      remoteTimestamp: 1001,
      strategy: 'last-write-wins',
    });

    const second = store.record({
      documentId: 'doc-2',
      localValue: 'c',
      remoteValue: 'd',
      localTimestamp: 2000,
      remoteTimestamp: 2001,
      strategy: 'local-wins',
    });

    vi.setSystemTime(new Date(5000));
    store.resolve(first.id, 'resolved-1', 'auto');
    vi.setSystemTime(new Date(6000));
    store.resolve(second.id, 'resolved-2', 'user');

    const history = store.getHistory();
    expect(history).toHaveLength(2);
    // Most recent first
    expect(history[0]!.resolvedValue).toBe('resolved-2');
    expect(history[1]!.resolvedValue).toBe('resolved-1');
  });

  it('should respect limit in getHistory', () => {
    const store = new ConflictStore();

    for (let i = 0; i < 5; i++) {
      const record = store.record({
        documentId: `doc-${i}`,
        localValue: `local-${i}`,
        remoteValue: `remote-${i}`,
        localTimestamp: i * 1000,
        remoteTimestamp: i * 1000 + 1,
        strategy: 'last-write-wins',
      });
      store.resolve(record.id, `resolved-${i}`, 'auto');
    }

    const history = store.getHistory(2);
    expect(history).toHaveLength(2);
  });

  it('should clear all conflicts', () => {
    const store = new ConflictStore();

    store.record({
      documentId: 'doc-1',
      localValue: 'a',
      remoteValue: 'b',
      localTimestamp: 1000,
      remoteTimestamp: 1001,
      strategy: 'last-write-wins',
    });

    store.clear();
    expect(store.getPending()).toHaveLength(0);
    expect(store.getHistory()).toHaveLength(0);
  });
});
