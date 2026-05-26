import { describe, it, expect } from 'vitest';
import { LocalStore, InMemoryStorageBackend } from '../local-store.js';
import type { OfflineAction } from '../local-store.js';

describe('LocalStore', () => {
  function createStore(): LocalStore {
    return new LocalStore(new InMemoryStorageBackend());
  }

  it('should save and load Uint8Array roundtrip', async () => {
    const store = createStore();
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    await store.save('binary-key', data);
    const loaded = await store.load('binary-key');
    expect(loaded).toBeInstanceOf(Uint8Array);
    expect(loaded).toEqual(data);
  });

  it('should save and load object roundtrip', async () => {
    const store = createStore();
    const data = { name: 'test', count: 42 };
    await store.save('object-key', data);
    const loaded = await store.load('object-key');
    expect(loaded).toEqual(data);
  });

  it('should return null for nonexistent key', async () => {
    const store = createStore();
    const result = await store.load('missing');
    expect(result).toBeNull();
  });

  it('should delete an entry', async () => {
    const store = createStore();
    await store.save('to-delete', { value: true });
    await store.delete('to-delete');
    const result = await store.load('to-delete');
    expect(result).toBeNull();
  });

  it('should list keys', async () => {
    const store = createStore();
    await store.save('alpha', { a: 1 });
    await store.save('beta', { b: 2 });
    await store.save('gamma', { g: 3 });

    const keys = await store.listKeys();
    expect(keys.sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('should list keys with prefix filtering', async () => {
    const store = createStore();
    await store.save('doc:1', { id: 1 });
    await store.save('doc:2', { id: 2 });
    await store.save('user:1', { id: 1 });

    const docKeys = await store.listKeys('doc:');
    expect(docKeys.sort()).toEqual(['doc:1', 'doc:2']);
  });

  it('should clear all entries', async () => {
    const store = createStore();
    await store.save('a', { x: 1 });
    await store.save('b', { x: 2 });

    await store.clear();
    const keys = await store.listKeys();
    expect(keys).toHaveLength(0);
  });

  it('should queue and retrieve offline actions', async () => {
    const store = createStore();
    const action: OfflineAction = {
      id: 'action-1',
      type: 'create',
      payload: { text: 'hello' },
      timestamp: Date.now(),
    };

    await store.queueAction(action);
    const queued = await store.getQueuedActions();
    expect(queued).toHaveLength(1);
    expect(queued[0]).toEqual(action);
  });

  it('should clear the queue', async () => {
    const store = createStore();
    await store.queueAction({
      id: 'a-1',
      type: 'update',
      payload: null,
      timestamp: 100,
    });

    await store.clearQueue();
    const queued = await store.getQueuedActions();
    expect(queued).toHaveLength(0);
  });

  it('should store and retrieve 100 queued actions correctly', async () => {
    const store = createStore();

    for (let i = 0; i < 100; i++) {
      await store.queueAction({
        id: `action-${i}`,
        type: 'batch',
        payload: { index: i },
        timestamp: 1000 + i,
      });
    }

    const queued = await store.getQueuedActions();
    expect(queued).toHaveLength(100);

    for (let i = 0; i < 100; i++) {
      expect(queued[i]!.id).toBe(`action-${i}`);
      expect(queued[i]!.timestamp).toBe(1000 + i);
    }
  });
});
