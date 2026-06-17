// Seam test for the @quant/local-first client wiring in the Capacitor shell.
// Traverses MobileLocalStore -> @quant/local-first OfflineStore/SyncManager
// (the client-side seam the mobile architecture supports in lieu of a backend
// route + proxy). No native APIs or network required.

import { describe, it, expect } from 'vitest';
import { MobileLocalStore } from '../local-first/local-store.js';

describe('MobileLocalStore (@quant/local-first wiring)', () => {
  it('persists and reads values through the local-first OfflineStore', async () => {
    const store = new MobileLocalStore({ config: { dbName: 'test-db' } });
    await store.put('notes', 'n1', { title: 'hello' });
    expect(await store.get('notes', 'n1')).toEqual({ title: 'hello' });

    const all = await store.getAll('notes');
    expect(all.size).toBe(1);
  });

  it('records changes and reports pending sync state while offline', async () => {
    const store = new MobileLocalStore();
    store.start();
    expect(store.isRunning()).toBe(true);

    store.setOnline(false);
    await store.put('docs', 'd1', { v: 1 });

    const state = store.getSyncState();
    expect(state.pendingChanges).toBeGreaterThan(0);
    expect(state.isOnline).toBe(false);

    store.stop();
    expect(store.isRunning()).toBe(false);
  });

  it('flushes queued changes once back online', async () => {
    const store = new MobileLocalStore();
    store.start();
    store.setOnline(true);
    await store.put('docs', 'd1', { v: 1 });

    const result = await store.flush();
    expect(result.sent).toBeGreaterThanOrEqual(0);
    expect(store.getSyncState().pendingChanges).toBe(0);
  });

  it('deletes a value and records the deletion', async () => {
    const store = new MobileLocalStore();
    await store.put('notes', 'n1', { title: 'x' });
    expect(await store.delete('notes', 'n1')).toBe(true);
    expect(await store.get('notes', 'n1')).toBeNull();
    expect(await store.delete('notes', 'missing')).toBe(false);
  });

  it('exposes the underlying engines (real importer, not a stub)', () => {
    const store = new MobileLocalStore();
    expect(store._store.getNodeId()).toMatch(/^node-/);
    expect(store._sync.getMergeStrategy()).toBe('crdt');
  });
});
