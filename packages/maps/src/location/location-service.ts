import { type LocationUpdate } from '../types.js';

export type LocationCallback = (update: LocationUpdate) => void;

export class LocationService {
  private watchId: number | null = null;
  private listeners = new Set<LocationCallback>();
  private lastUpdate: LocationUpdate | null = null;

  get isWatching(): boolean {
    return this.watchId !== null;
  }
  get lastKnownLocation(): LocationUpdate | null {
    return this.lastUpdate;
  }

  startWatching(onError?: (error: GeolocationPositionError) => void): void {
    if (this.watchId !== null) return;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const update: LocationUpdate = {
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
        };
        this.lastUpdate = update;
        this.listeners.forEach((cb) => cb(update));
      },
      onError,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  onUpdate(cb: LocationCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  dispose(): void {
    this.stopWatching();
    this.listeners.clear();
  }
}
