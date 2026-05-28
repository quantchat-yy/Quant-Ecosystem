import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationService } from '../location/location-service.js';

const mockWatchPosition = vi.fn();
const mockClearWatch = vi.fn();
vi.stubGlobal('navigator', {
  geolocation: { watchPosition: mockWatchPosition, clearWatch: mockClearWatch },
});

const fakePos = (ts: number) =>
  ({
    coords: {
      latitude: 20,
      longitude: 78,
      accuracy: 10,
      heading: null,
      speed: null,
      altitude: null,
      altitudeAccuracy: null,
    },
    timestamp: ts,
  }) as GeolocationPosition;

describe('LocationService', () => {
  let service: LocationService;
  beforeEach(() => {
    vi.clearAllMocks();
    mockWatchPosition.mockReturnValue(42);
    service = new LocationService();
  });

  it('starts/stops watching and clears watch id', () => {
    service.startWatching();
    expect(service.isWatching).toBe(true);
    service.stopWatching();
    expect(service.isWatching).toBe(false);
    expect(mockClearWatch).toHaveBeenCalledWith(42);
  });

  it('notifies listeners, stores location, and supports unsubscribe', () => {
    const cb = vi.fn();
    const unsub = service.onUpdate(cb);
    service.startWatching();
    const fire = mockWatchPosition.mock.calls[0]![0] as (p: GeolocationPosition) => void;
    fire(fakePos(1000));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ position: { lat: 20, lng: 78 } }));
    expect(service.lastKnownLocation).toBeTruthy();
    unsub();
    cb.mockClear();
    fire(fakePos(2000));
    expect(cb).not.toHaveBeenCalled();
  });
});
