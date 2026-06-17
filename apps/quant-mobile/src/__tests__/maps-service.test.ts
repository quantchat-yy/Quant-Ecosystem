// Seam test for the @quant/maps client wiring in the Capacitor shell.
// Traverses MobileMapsService -> @quant/maps (PlaceSearch/TripPlanner/Router via
// injected providers). Providers are mocked so no network or device access is
// needed; the default providers are the real WebView-capable Photon/OSRM ones.

import { describe, it, expect } from 'vitest';
import { MobileMapsService } from '../maps/maps-service.js';
import type { GeocodingProvider, RoutingProvider, GeocoderResult, Route } from '@quant/maps';

const mockGeocoder: GeocodingProvider = {
  async forward(query: string): Promise<GeocoderResult[]> {
    return [
      {
        position: { lat: 19.07, lng: 72.87 },
        displayName: `${query} result`,
        type: 'city',
        confidence: 0.9,
      },
    ];
  },
  async reverse(): Promise<GeocoderResult[]> {
    return [
      {
        position: { lat: 19.07, lng: 72.87 },
        displayName: 'Mumbai',
        type: 'city',
        confidence: 0.8,
      },
    ];
  },
};

const mockRouter: RoutingProvider = {
  async route(from, to, mode): Promise<Route> {
    return { polyline: [from, to], distance: 1000, duration: 120, steps: [], mode };
  },
};

function makeService(): MobileMapsService {
  return new MobileMapsService({ geocoder: mockGeocoder, router: mockRouter });
}

describe('MobileMapsService (@quant/maps wiring)', () => {
  it('forward-geocodes through the engine geocoder', async () => {
    const results = await makeService().geocode('Mumbai');
    expect(results).toHaveLength(1);
    expect(results[0]?.displayName).toContain('Mumbai');
  });

  it('searches places via the engine PlaceSearch', async () => {
    const places = await makeService().searchPlaces('chai stall', { lat: 19.07, lng: 72.87 });
    expect(places.length).toBeGreaterThan(0);
    expect(places[0]).toHaveProperty('position');
  });

  it('routes between two points via the engine router', async () => {
    const route = await makeService().route(
      { lat: 19, lng: 72 },
      { lat: 19.1, lng: 72.1 },
      'driving',
    );
    expect(route.mode).toBe('driving');
    expect(route.distance).toBe(1000);
  });

  it('plans a multi-day trip via the engine TripPlanner', async () => {
    const plan = await makeService().planTrip('Goa', 3, { interests: ['beaches'] });
    expect(plan.destination).toBe('Goa');
    expect(plan.days).toHaveLength(3);
  });

  it('constructs the live LocationService without watching by default', () => {
    expect(makeService().isWatchingLocation).toBe(false);
  });
});
