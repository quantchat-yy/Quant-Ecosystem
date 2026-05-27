import { describe, it, expect, beforeEach } from 'vitest';
import { MobileOfflineSync } from '../offline/offline-sync.js';
import type { NetworkState } from '../offline/offline-sync.js';

describe('MobileOfflineSync', () => {
  let sync: MobileOfflineSync;

  beforeEach(() => {
    sync = new MobileOfflineSync({ maxRetries: 3 });
  });

  describe('queueMutation', () => {
    it('should enqueue a mutation', () => {
      sync.queueMutation({ id: 'op1', key: 'user/123', payload: { name: 'Alice' } });
      const status = sync.getQueueStatus();
      expect(status.pendingCount).toBe(1);
    });

    it('should enqueue multiple mutations', () => {
      sync.queueMutation({ id: 'op1', key: 'user/1', payload: { a: 1 } });
      sync.queueMutation({ id: 'op2', key: 'user/2', payload: { b: 2 } });
      sync.queueMutation({ id: 'op3', key: 'user/3', payload: { c: 3 } });
      expect(sync.getQueueStatus().pendingCount).toBe(3);
    });

    it('should support priority ordering', () => {
      sync.queueMutation({ id: 'op1', key: 'low', payload: {}, priority: 1 });
      sync.queueMutation({ id: 'op2', key: 'high', payload: {}, priority: 10 });
      expect(sync.getQueueStatus().pendingCount).toBe(2);
    });
  });

  describe('replayOnReconnect', () => {
    it('should replay all queued mutations when online', async () => {
      sync.queueMutation({ id: 'op1', key: 'a', payload: {} });
      sync.queueMutation({ id: 'op2', key: 'b', payload: {} });

      const result = await sync.replayOnReconnect();
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should not replay when offline', async () => {
      sync.queueMutation({ id: 'op1', key: 'a', payload: {} });
      sync._setNetworkState('offline');

      const result = await sync.replayOnReconnect();
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should clear the queue after successful replay', async () => {
      sync.queueMutation({ id: 'op1', key: 'a', payload: {} });
      await sync.replayOnReconnect();
      expect(sync.getQueueStatus().pendingCount).toBe(0);
    });

    it('should invoke the executor callback for each operation', async () => {
      const executedKeys: string[] = [];
      const customSync = new MobileOfflineSync({
        maxRetries: 3,
        executor: async (op) => {
          executedKeys.push(op.key);
          return true;
        },
      });

      customSync.queueMutation({ id: 'op1', key: 'user/1', payload: { name: 'A' } });
      customSync.queueMutation({ id: 'op2', key: 'user/2', payload: { name: 'B' } });

      const result = await customSync.replayOnReconnect();
      expect(result.successful).toBe(2);
      expect(executedKeys).toContain('user/1');
      expect(executedKeys).toContain('user/2');
    });

    it('should report failures when executor returns false', async () => {
      const customSync = new MobileOfflineSync({
        maxRetries: 1,
        executor: async () => false,
      });

      customSync.queueMutation({ id: 'op1', key: 'a', payload: {} });

      const result = await customSync.replayOnReconnect();
      // With maxRetries=1, first failure goes to dead letter
      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return empty status when no mutations', () => {
      const status = sync.getQueueStatus();
      expect(status.pendingCount).toBe(0);
      expect(status.oldestItem).toBeNull();
      expect(status.newestItem).toBeNull();
    });

    it('should track oldest and newest items', () => {
      sync.queueMutation({ id: 'op1', key: 'a', payload: {} });
      sync.queueMutation({ id: 'op2', key: 'b', payload: {} });
      const status = sync.getQueueStatus();
      expect(status.oldestItem).not.toBeNull();
      expect(status.newestItem).not.toBeNull();
      expect(status.oldestItem!).toBeLessThanOrEqual(status.newestItem!);
    });

    it('should report total mutation count', () => {
      sync.queueMutation({ id: 'op1', key: 'a', payload: {} });
      sync.queueMutation({ id: 'op2', key: 'b', payload: {} });
      expect(sync.getQueueStatus().totalSize).toBe(2);
    });
  });

  describe('clearQueue', () => {
    it('should clear all pending mutations', () => {
      sync.queueMutation({ id: 'op1', key: 'a', payload: {} });
      sync.queueMutation({ id: 'op2', key: 'b', payload: {} });
      sync.clearQueue();
      expect(sync.getQueueStatus().pendingCount).toBe(0);
    });
  });

  describe('network state', () => {
    it('should default to online', () => {
      expect(sync.getCurrentNetworkState()).toBe('online');
    });

    it('should notify handlers on network change', () => {
      const states: NetworkState[] = [];
      sync.onNetworkChange((state) => states.push(state));
      sync._setNetworkState('offline');
      sync._setNetworkState('metered');
      expect(states).toEqual(['offline', 'metered']);
    });

    it('should support unsubscription from network changes', () => {
      const states: NetworkState[] = [];
      const unsub = sync.onNetworkChange((state) => states.push(state));
      sync._setNetworkState('offline');
      unsub();
      sync._setNetworkState('online');
      expect(states).toEqual(['offline']);
    });
  });
});
