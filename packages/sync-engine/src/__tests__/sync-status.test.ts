import { describe, it, expect, vi } from 'vitest';
import { SyncStatusManager } from '../sync-status.js';

describe('SyncStatusManager', () => {
  it('should have initial status of synced', () => {
    const manager = new SyncStatusManager();
    expect(manager.getStatus()).toBe('synced');
  });

  it('should allow valid transition: synced -> syncing', () => {
    const manager = new SyncStatusManager();
    const result = manager.transition('syncing');
    expect(result).toBe(true);
    expect(manager.getStatus()).toBe('syncing');
  });

  it('should allow valid transition: synced -> offline', () => {
    const manager = new SyncStatusManager();
    const result = manager.transition('offline');
    expect(result).toBe(true);
    expect(manager.getStatus()).toBe('offline');
  });

  it('should allow valid transition: syncing -> synced', () => {
    const manager = new SyncStatusManager();
    manager.transition('syncing');
    const result = manager.transition('synced');
    expect(result).toBe(true);
    expect(manager.getStatus()).toBe('synced');
  });

  it('should allow valid transition: syncing -> conflict', () => {
    const manager = new SyncStatusManager();
    manager.transition('syncing');
    const result = manager.transition('conflict');
    expect(result).toBe(true);
    expect(manager.getStatus()).toBe('conflict');
  });

  it('should allow valid transition: offline -> syncing', () => {
    const manager = new SyncStatusManager();
    manager.transition('offline');
    const result = manager.transition('syncing');
    expect(result).toBe(true);
    expect(manager.getStatus()).toBe('syncing');
  });

  it('should allow valid transition: conflict -> syncing', () => {
    const manager = new SyncStatusManager();
    manager.transition('syncing');
    manager.transition('conflict');
    const result = manager.transition('syncing');
    expect(result).toBe(true);
    expect(manager.getStatus()).toBe('syncing');
  });

  it('should reject invalid transition: synced -> conflict', () => {
    const manager = new SyncStatusManager();
    const result = manager.transition('conflict');
    expect(result).toBe(false);
    expect(manager.getStatus()).toBe('synced');
  });

  it('should reject invalid transition: offline -> synced', () => {
    const manager = new SyncStatusManager();
    manager.transition('offline');
    const result = manager.transition('synced');
    expect(result).toBe(false);
    expect(manager.getStatus()).toBe('offline');
  });

  it('should reject invalid transition: offline -> conflict', () => {
    const manager = new SyncStatusManager();
    manager.transition('offline');
    const result = manager.transition('conflict');
    expect(result).toBe(false);
    expect(manager.getStatus()).toBe('offline');
  });

  it('should notify subscribers on transition', () => {
    const manager = new SyncStatusManager();
    const callback = vi.fn();
    manager.subscribe(callback);

    manager.transition('syncing');
    expect(callback).toHaveBeenCalledWith('syncing');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe correctly', () => {
    const manager = new SyncStatusManager();
    const callback = vi.fn();
    const unsub = manager.subscribe(callback);

    manager.transition('syncing');
    expect(callback).toHaveBeenCalledTimes(1);

    unsub();
    manager.transition('synced');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not notify on invalid transition', () => {
    const manager = new SyncStatusManager();
    const callback = vi.fn();
    manager.subscribe(callback);

    manager.transition('conflict'); // invalid from synced
    expect(callback).not.toHaveBeenCalled();
  });

  it('should track last sync time', () => {
    const manager = new SyncStatusManager();
    expect(manager.getLastSyncTime()).toBeNull();

    manager.transition('syncing');
    manager.transition('synced');
    expect(manager.getLastSyncTime()).toBeTypeOf('number');
    expect(manager.getLastSyncTime()!).toBeGreaterThan(0);
  });

  it('should track conflict count', () => {
    const manager = new SyncStatusManager();
    expect(manager.getConflictCount()).toBe(0);

    manager.transition('syncing');
    manager.transition('conflict');
    expect(manager.getConflictCount()).toBe(1);

    manager.transition('syncing');
    manager.transition('conflict');
    expect(manager.getConflictCount()).toBe(2);
  });

  it('should handle full lifecycle: online -> offline -> syncing -> synced', () => {
    const manager = new SyncStatusManager();
    const transitions: string[] = [];
    manager.subscribe((status) => transitions.push(status));

    expect(manager.transition('offline')).toBe(true);
    expect(manager.transition('syncing')).toBe(true);
    expect(manager.transition('synced')).toBe(true);

    expect(transitions).toEqual(['offline', 'syncing', 'synced']);
    expect(manager.getStatus()).toBe('synced');
  });
});
