import { describe, it, expect, vi } from 'vitest';
import { OptimisticUpdateManager } from '../optimistic-updates.js';

describe('OptimisticUpdateManager', () => {
  it('should apply a mutation and track it as pending', () => {
    const manager = new OptimisticUpdateManager();
    manager.apply('mut-1', { name: 'updated' });

    expect(manager.getPendingCount()).toBe(1);
    expect(manager.hasPending('mut-1')).toBe(true);
  });

  it('should return pending mutations with metadata', () => {
    const manager = new OptimisticUpdateManager();
    manager.apply('mut-1', { name: 'first' });
    manager.apply('mut-2', { name: 'second' });

    const pending = manager.getPending();
    expect(pending).toHaveLength(2);
    expect(pending[0]!.mutationId).toBe('mut-1');
    expect(pending[0]!.optimisticState).toEqual({ name: 'first' });
    expect(pending[0]!.appliedAt).toBeTypeOf('number');
    expect(pending[1]!.mutationId).toBe('mut-2');
  });

  it('should confirm a mutation and remove from pending', () => {
    const manager = new OptimisticUpdateManager();
    manager.apply('mut-1', { name: 'test' });

    const result = manager.confirm('mut-1');
    expect(result).toBe(true);
    expect(manager.hasPending('mut-1')).toBe(false);
    expect(manager.getPendingCount()).toBe(0);
  });

  it('should return false when confirming unknown mutation', () => {
    const manager = new OptimisticUpdateManager();
    const result = manager.confirm('nonexistent');
    expect(result).toBe(false);
  });

  it('should rollback a mutation and return the optimistic state', () => {
    const manager = new OptimisticUpdateManager();
    const state = { name: 'optimistic' };
    manager.apply('mut-1', state);

    const rolledBack = manager.rollback('mut-1');
    expect(rolledBack).toEqual(state);
    expect(manager.hasPending('mut-1')).toBe(false);
    expect(manager.getPendingCount()).toBe(0);
  });

  it('should return null when rolling back unknown mutation', () => {
    const manager = new OptimisticUpdateManager();
    const result = manager.rollback('nonexistent');
    expect(result).toBeNull();
  });

  it('should notify subscribers on apply', () => {
    const manager = new OptimisticUpdateManager();
    const callback = vi.fn();
    manager.subscribe(callback);

    manager.apply('mut-1', { name: 'test' });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([
      expect.objectContaining({ mutationId: 'mut-1', optimisticState: { name: 'test' } }),
    ]);
  });

  it('should notify subscribers on confirm', () => {
    const manager = new OptimisticUpdateManager();
    manager.apply('mut-1', { name: 'test' });

    const callback = vi.fn();
    manager.subscribe(callback);
    manager.confirm('mut-1');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([]);
  });

  it('should notify subscribers on rollback', () => {
    const manager = new OptimisticUpdateManager();
    manager.apply('mut-1', { name: 'test' });

    const callback = vi.fn();
    manager.subscribe(callback);
    manager.rollback('mut-1');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([]);
  });

  it('should unsubscribe correctly', () => {
    const manager = new OptimisticUpdateManager();
    const callback = vi.fn();
    const unsub = manager.subscribe(callback);

    manager.apply('mut-1', { name: 'test' });
    expect(callback).toHaveBeenCalledTimes(1);

    unsub();
    manager.apply('mut-2', { name: 'test2' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not notify subscribers when confirming unknown mutation', () => {
    const manager = new OptimisticUpdateManager();
    const callback = vi.fn();
    manager.subscribe(callback);

    manager.confirm('nonexistent');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle hasPending correctly', () => {
    const manager = new OptimisticUpdateManager();
    expect(manager.hasPending('mut-1')).toBe(false);

    manager.apply('mut-1', 'state');
    expect(manager.hasPending('mut-1')).toBe(true);

    manager.confirm('mut-1');
    expect(manager.hasPending('mut-1')).toBe(false);
  });
});
