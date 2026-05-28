import { type LatLng, type TransitStop, type TransitRoute, type TransitLeg } from '../types.js';
import { haversine } from '../utils/geo.js';

export interface TransitFeedProvider {
  getStops(): Promise<TransitStop[]>;
  getRoutes(fromStop: string, toStop: string): Promise<string[]>;
  getArrivals(stopId: string): Promise<{ route: string; eta: number }[]>;
}

export const MUMBAI_METRO = 'Mumbai Metro Line 1';
export const DELHI_METRO = 'Delhi Metro Blue Line';
export const BANGALORE_METRO = 'Namma Metro Green Line';

export class MockTransitFeedProvider implements TransitFeedProvider {
  private stops: TransitStop[] = [
    { id: 's1', name: 'Andheri', position: { lat: 19.119, lng: 72.846 }, routes: [MUMBAI_METRO] },
    { id: 's2', name: 'Ghatkopar', position: { lat: 19.086, lng: 72.908 }, routes: [MUMBAI_METRO] },
    { id: 's3', name: 'Versova', position: { lat: 19.13, lng: 72.82 }, routes: [MUMBAI_METRO] },
  ];
  async getStops() {
    return this.stops;
  }
  async getRoutes() {
    return [MUMBAI_METRO];
  }
  async getArrivals(_stopId: string) {
    return [];
  }
}

export class TransitService {
  constructor(private provider: TransitFeedProvider) {}

  async planTransitRoute(from: LatLng, to: LatLng): Promise<TransitRoute> {
    const stops = await this.provider.getStops();
    const fromStop = this.nearest(from, stops);
    const toStop = this.nearest(to, stops);
    const routes = await this.provider.getRoutes(fromStop.id, toStop.id);
    const now = Date.now();
    const walkToStation = this.walkLeg(from, fromStop, now);
    const duration = haversine(fromStop.position, toStop.position) / 15;
    const transitLeg: TransitLeg = {
      from: fromStop,
      to: toStop,
      mode: 'metro',
      routeName: routes[0] ?? MUMBAI_METRO,
      duration,
      departureTime: walkToStation.arrivalTime,
      arrivalTime: walkToStation.arrivalTime + duration * 1000,
    };
    const walkFromStation = this.walkLeg2(toStop, to, transitLeg.arrivalTime);
    const legs = [walkToStation, transitLeg, walkFromStation];
    const totalDuration = legs.reduce((s, l) => s + l.duration, 0);
    const totalDistance = haversine(from, to);
    const walkingDistance = haversine(from, fromStop.position) + haversine(toStop.position, to);
    return { legs, totalDuration, totalDistance, walkingDistance };
  }

  async getArrivals(stopId: string): Promise<{ route: string; eta: number }[]> {
    const arrivals = await this.provider.getArrivals(stopId);
    if (arrivals.length > 0) return arrivals;
    return [{ route: MUMBAI_METRO, eta: Date.now() + 300000 }];
  }

  async getNearbyStops(position: LatLng, radius: number): Promise<TransitStop[]> {
    const stops = await this.provider.getStops();
    return stops.filter((s) => haversine(position, s.position) <= radius);
  }

  private nearest(pos: LatLng, stops: TransitStop[]): TransitStop {
    return stops.reduce((best, s) =>
      haversine(pos, s.position) < haversine(pos, best.position) ? s : best,
    );
  }

  private walkLeg(from: LatLng, stop: TransitStop, now: number): TransitLeg {
    const dur = haversine(from, stop.position) / 1.4;
    return {
      from: { id: 'walk', name: 'Start', position: from, routes: [] },
      to: stop,
      mode: 'walking',
      routeName: 'Walk',
      duration: dur,
      departureTime: now,
      arrivalTime: now + dur * 1000,
    };
  }

  private walkLeg2(stop: TransitStop, to: LatLng, start: number): TransitLeg {
    const dur = haversine(stop.position, to) / 1.4;
    return {
      from: stop,
      to: { id: 'end', name: 'Destination', position: to, routes: [] },
      mode: 'walking',
      routeName: 'Walk',
      duration: dur,
      departureTime: start,
      arrivalTime: start + dur * 1000,
    };
  }
}
