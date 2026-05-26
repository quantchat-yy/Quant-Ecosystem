import { describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { ConflictResolver } from '../conflict-resolution.js';
import type { TimestampedValue } from '../conflict-resolution.js';

describe('ConflictResolver', () => {
  it('should merge multiple Yjs updates correctly', () => {
    const resolver = new ConflictResolver();

    // Create two docs with different changes
    const doc1 = new Y.Doc();
    const text1 = doc1.getText('content');
    text1.insert(0, 'Hello');

    const doc2 = new Y.Doc();
    const text2 = doc2.getText('content');
    text2.insert(0, 'World');

    const update1 = Y.encodeStateAsUpdate(doc1);
    const update2 = Y.encodeStateAsUpdate(doc2);

    const merged = resolver.mergeUpdates([update1, update2]);
    expect(merged).toBeInstanceOf(Uint8Array);
    expect(merged.length).toBeGreaterThan(0);

    // Apply merged update to a fresh doc
    const doc3 = new Y.Doc();
    Y.applyUpdate(doc3, merged);

    const content = doc3.getText('content').toString();
    expect(content).toContain('Hello');
    expect(content).toContain('World');
  });

  it('should handle empty updates array', () => {
    const resolver = new ConflictResolver();
    const result = resolver.mergeUpdates([]);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });

  it('should handle single update', () => {
    const resolver = new ConflictResolver();
    const doc = new Y.Doc();
    doc.getText('t').insert(0, 'test');
    const update = Y.encodeStateAsUpdate(doc);

    const result = resolver.mergeUpdates([update]);
    expect(result).toBe(update);
  });

  it('should resolve with last-write-wins strategy (newer timestamp wins)', () => {
    const resolver = new ConflictResolver();

    const local: TimestampedValue<string> = { value: 'local-data', timestamp: 1000 };
    const remote: TimestampedValue<string> = { value: 'remote-data', timestamp: 2000 };

    const result = resolver.resolveConflict(local, remote, 'last-write-wins');
    expect(result).toBe('remote-data');
  });

  it('should resolve with LWW strategy (local wins when newer)', () => {
    const resolver = new ConflictResolver();

    const local: TimestampedValue<string> = { value: 'local-data', timestamp: 3000 };
    const remote: TimestampedValue<string> = { value: 'remote-data', timestamp: 2000 };

    const result = resolver.resolveConflict(local, remote, 'last-write-wins');
    expect(result).toBe('local-data');
  });

  it('should resolve with local-wins strategy', () => {
    const resolver = new ConflictResolver();

    const local: TimestampedValue<number> = { value: 42, timestamp: 1000 };
    const remote: TimestampedValue<number> = { value: 99, timestamp: 2000 };

    const result = resolver.resolveConflict(local, remote, 'local-wins');
    expect(result).toBe(42);
  });

  it('should resolve with remote-wins strategy', () => {
    const resolver = new ConflictResolver();

    const local: TimestampedValue<number> = { value: 42, timestamp: 2000 };
    const remote: TimestampedValue<number> = { value: 99, timestamp: 1000 };

    const result = resolver.resolveConflict(local, remote, 'remote-wins');
    expect(result).toBe(99);
  });

  it('should call custom resolver correctly', () => {
    const resolver = new ConflictResolver();

    const customFn = vi.fn((local: TimestampedValue<number>, remote: TimestampedValue<number>) => {
      return local.value + remote.value;
    });

    resolver.registerCustomResolver('sum', customFn);

    const local: TimestampedValue<number> = { value: 10, timestamp: 1000 };
    const remote: TimestampedValue<number> = { value: 20, timestamp: 2000 };

    const result = resolver.resolveConflict(local, remote, 'custom', 'sum');
    expect(result).toBe(30);
    expect(customFn).toHaveBeenCalledWith(local, remote);
  });

  it('should throw when custom strategy is used without name', () => {
    const resolver = new ConflictResolver();
    const local: TimestampedValue<string> = { value: 'a', timestamp: 1 };
    const remote: TimestampedValue<string> = { value: 'b', timestamp: 2 };

    expect(() => resolver.resolveConflict(local, remote, 'custom')).toThrow(
      'Custom resolver name is required',
    );
  });

  it('should throw when custom resolver not found', () => {
    const resolver = new ConflictResolver();
    const local: TimestampedValue<string> = { value: 'a', timestamp: 1 };
    const remote: TimestampedValue<string> = { value: 'b', timestamp: 2 };

    expect(() => resolver.resolveConflict(local, remote, 'custom', 'nonexistent')).toThrow(
      "Custom resolver 'nonexistent' not found",
    );
  });
});
