import { describe, it, expect } from 'vitest';
import {
  TransitService,
  MockTransitFeedProvider,
  MUMBAI_METRO,
} from '../transit/transit-service.js';

describe('TransitService', () => {
  const provider = new MockTransitFeedProvider();
  const service = new TransitService(provider);

  it('planTransitRoute returns legs with walk+metro+walk', async () => {
    const route = await service.planTransitRoute(
      { lat: 19.12, lng: 72.84 },
      { lat: 19.08, lng: 72.91 },
    );
    expect(route.legs).toHaveLength(3);
    expect(route.legs[0]!.mode).toBe('walking');
    expect(route.legs[1]!.mode).toBe('metro');
    expect(route.legs[2]!.mode).toBe('walking');
    expect(route.totalDuration).toBeGreaterThan(0);
  });

  it('getArrivals falls back to static schedule', async () => {
    const arrivals = await service.getArrivals('s1');
    expect(arrivals.length).toBeGreaterThan(0);
    expect(arrivals[0]!.route).toBe(MUMBAI_METRO);
  });

  it('getNearbyStops filters by distance', async () => {
    const near = await service.getNearbyStops({ lat: 19.119, lng: 72.846 }, 5000);
    expect(near.length).toBeGreaterThan(0);
    const far = await service.getNearbyStops({ lat: 28.0, lng: 77.0 }, 1000);
    expect(far.length).toBe(0);
  });
});
