import { describe, it, expect } from 'vitest';
import { MockRoutingProvider } from '../routing/router.js';

describe('MockRoutingProvider', () => {
  const provider = new MockRoutingProvider();
  const from = { lat: 20.0, lng: 78.0 },
    to = { lat: 20.1, lng: 78.1 };

  it('calculates a driving route with steps', async () => {
    const route = await provider.route(from, to, 'driving');
    expect(route.mode).toBe('driving');
    expect(route.distance).toBeGreaterThan(0);
    expect(route.polyline).toHaveLength(2);
    expect(route.steps[0]!.instruction).toBeTruthy();
  });

  it('walking is slower than driving', async () => {
    const walk = await provider.route(from, to, 'walking');
    const drive = await provider.route(from, to, 'driving');
    expect(walk.duration).toBeGreaterThan(drive.duration);
  });

  it('supports two-wheeler mode', async () => {
    const route = await provider.route(from, to, 'two-wheeler');
    expect(route.mode).toBe('two-wheeler');
  });
});
