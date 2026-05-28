import { type LatLng, type Route, type RouteStep, type RouteMode } from '../types.js';

export interface RoutingProvider {
  route(from: LatLng, to: LatLng, mode: RouteMode): Promise<Route>;
}

export class OSRMProvider implements RoutingProvider {
  constructor(private baseUrl = 'https://router.project-osrm.org') {}

  async route(from: LatLng, to: LatLng, mode: RouteMode): Promise<Route> {
    const profile = mode === 'two-wheeler' ? 'driving' : mode;
    const url = `${this.baseUrl}/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&steps=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM request failed: ${res.status}`);
    const data = (await res.json()) as {
      routes: Array<{
        distance: number;
        duration: number;
        geometry: { coordinates: number[][] };
        legs: Array<{
          steps: Array<{
            maneuver: { location: number[] };
            name: string;
            distance: number;
            duration: number;
          }>;
        }>;
      }>;
    };
    if (!data.routes.length) return { polyline: [], distance: 0, duration: 0, steps: [], mode };
    const r = data.routes[0]!;
    return {
      polyline: r.geometry.coordinates.map((c) => ({ lat: c[1]!, lng: c[0]! })),
      distance: r.distance,
      duration: r.duration,
      mode,
      steps: r.legs[0]!.steps.map((s) => ({
        instruction: s.name,
        distance: s.distance,
        duration: s.duration,
        position: { lat: s.maneuver.location[1]!, lng: s.maneuver.location[0]! },
      })),
    };
  }
}

export class MockRoutingProvider implements RoutingProvider {
  async route(from: LatLng, to: LatLng, mode: RouteMode): Promise<Route> {
    const dist = Math.sqrt((to.lat - from.lat) ** 2 + (to.lng - from.lng) ** 2) * 111000;
    const speed = mode === 'walking' ? 5 : mode === 'cycling' ? 15 : 40;
    const duration = dist / ((speed * 1000) / 3600);
    const step: RouteStep = {
      instruction: 'Head towards destination',
      distance: dist,
      duration,
      position: from,
    };
    return { polyline: [from, to], distance: dist, duration, steps: [step], mode };
  }
}
