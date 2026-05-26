import { describe, it, expect } from 'vitest';
import { Tier1ApiController } from '../../device/tier1-api.js';

describe('Tier1ApiController', () => {
  it('registers and retrieves APIs', () => {
    const controller = new Tier1ApiController();
    controller.registerApi({
      endpoint: '/users',
      method: 'GET',
      description: 'List users',
    });
    const apis = controller.getAvailableApis();
    expect(apis).toHaveLength(1);
    expect(apis[0]!.endpoint).toBe('/users');
  });

  it('initializes with pre-defined APIs', () => {
    const controller = new Tier1ApiController([
      { endpoint: '/tasks', method: 'POST', description: 'Create task' },
      { endpoint: '/users', method: 'GET', description: 'List users' },
    ]);
    expect(controller.getAvailableApis()).toHaveLength(2);
  });

  it('calls a registered API successfully', async () => {
    const controller = new Tier1ApiController([
      { endpoint: '/data', method: 'GET', description: 'Get data' },
    ]);
    const result = await controller.callApi('/data', { limit: 10 });
    expect(result.success).toBe(true);
    expect(result.endpoint).toBe('/data');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns failure for unknown endpoint', async () => {
    const controller = new Tier1ApiController();
    const result = await controller.callApi('/unknown');
    expect(result.success).toBe(false);
    expect(result.data).toEqual({ error: 'API endpoint not found: /unknown' });
  });

  it('checks API existence', () => {
    const controller = new Tier1ApiController([
      { endpoint: '/health', method: 'GET', description: 'Health check' },
    ]);
    expect(controller.hasApi('/health')).toBe(true);
    expect(controller.hasApi('/missing')).toBe(false);
  });

  it('removes APIs', () => {
    const controller = new Tier1ApiController([
      { endpoint: '/tmp', method: 'DELETE', description: 'Delete temp' },
    ]);
    expect(controller.removeApi('/tmp')).toBe(true);
    expect(controller.hasApi('/tmp')).toBe(false);
    expect(controller.removeApi('/tmp')).toBe(false);
  });

  it('validates API definition schema', () => {
    const controller = new Tier1ApiController();
    expect(() => {
      controller.registerApi({
        endpoint: '/valid',
        method: 'POST',
        description: 'Valid endpoint',
      });
    }).not.toThrow();
  });
});
