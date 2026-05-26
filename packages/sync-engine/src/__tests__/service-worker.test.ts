import { describe, it, expect, vi } from 'vitest';
import { ServiceWorkerManager } from '../service-worker.js';
import type { IServiceWorkerAPI, QueuedRequest } from '../service-worker.js';

function createRequest(id: string): QueuedRequest {
  return {
    id,
    url: `https://example.com/api/${id}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
    timestamp: Date.now(),
  };
}

describe('ServiceWorkerManager', () => {
  it('should register and report registered', async () => {
    const mockApi: IServiceWorkerAPI = {
      register: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(undefined),
    };

    const manager = new ServiceWorkerManager(mockApi);
    expect(manager.isRegistered()).toBe(false);

    await manager.register('/sw.js');
    expect(manager.isRegistered()).toBe(true);
    expect(mockApi.register).toHaveBeenCalledWith('/sw.js');
  });

  it('should unregister', async () => {
    const mockApi: IServiceWorkerAPI = {
      register: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(undefined),
    };

    const manager = new ServiceWorkerManager(mockApi);
    await manager.register('/sw.js');
    await manager.unregister();

    expect(manager.isRegistered()).toBe(false);
    expect(mockApi.unregister).toHaveBeenCalled();
  });

  it('should queue requests', () => {
    const manager = new ServiceWorkerManager();
    const req1 = createRequest('req-1');
    const req2 = createRequest('req-2');

    manager.queueRequest(req1);
    manager.queueRequest(req2);

    expect(manager.getQueueSize()).toBe(2);
    expect(manager.getQueuedRequests()).toHaveLength(2);
    expect(manager.getQueuedRequests()[0]!.id).toBe('req-1');
  });

  it('should replay queue and process all requests', async () => {
    const manager = new ServiceWorkerManager();
    manager.queueRequest(createRequest('r1'));
    manager.queueRequest(createRequest('r2'));
    manager.queueRequest(createRequest('r3'));

    const sender = vi.fn().mockResolvedValue(true);
    const result = await manager.replayQueue(sender);

    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.remaining).toBe(0);
    expect(manager.getQueueSize()).toBe(0);
  });

  it('should track partial replay failures', async () => {
    const manager = new ServiceWorkerManager();
    manager.queueRequest(createRequest('r1'));
    manager.queueRequest(createRequest('r2'));
    manager.queueRequest(createRequest('r3'));

    // Second request fails
    const sender = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await manager.replayQueue(sender);

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
    expect(manager.getQueueSize()).toBe(1);
  });

  it('should handle sender throwing errors', async () => {
    const manager = new ServiceWorkerManager();
    manager.queueRequest(createRequest('r1'));
    manager.queueRequest(createRequest('r2'));

    const sender = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('network error'));

    const result = await manager.replayQueue(sender);

    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
  });

  it('should clear queue', () => {
    const manager = new ServiceWorkerManager();
    manager.queueRequest(createRequest('r1'));
    manager.queueRequest(createRequest('r2'));

    manager.clearQueue();
    expect(manager.getQueueSize()).toBe(0);
    expect(manager.getQueuedRequests()).toHaveLength(0);
  });

  it('should work without a service worker API (no-op register)', async () => {
    const manager = new ServiceWorkerManager();
    await manager.register('/sw.js');
    expect(manager.isRegistered()).toBe(true);
    expect(manager.getScriptUrl()).toBe('/sw.js');
  });
});
