import { describe, it, expect } from 'vitest';
import { OfflineRouteCache } from '../navigation/offline-cache.js';
import { type Route } from '../types.js';

function makeRoute(): Route {
  return {
    polyline: [
      { lat: 20.0, lng: 78.0 },
      { lat: 20.1, lng: 78.1 },
    ],
    distance: 15000,
    duration: 600,
    steps: [
      {
        instruction: 'Go straight',
        distance: 15000,
        duration: 600,
        position: { lat: 20.0, lng: 78.0 },
      },
    ],
    mode: 'driving',
  };
}

describe('OfflineRouteCache', () => {
  it('stores and retrieves a route', () => {
    const cache = new OfflineRouteCache();
    const route = makeRoute();
    cache.store('route-1', route);
    const result = cache.get('route-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('route-1');
    expect(result!.route).toEqual(route);
  });

  it('has() returns true for stored and false for missing', () => {
    const cache = new OfflineRouteCache();
    cache.store('r1', makeRoute());
    expect(cache.has('r1')).toBe(true);
    expect(cache.has('r2')).toBe(false);
  });

  it('evicts oldest entry when maxSize exceeded (LRU)', () => {
    const cache = new OfflineRouteCache(20);
    for (let i = 0; i < 21; i++) {
      cache.store(`route-${i}`, makeRoute());
    }
    expect(cache.size).toBe(20);
    expect(cache.has('route-0')).toBe(false);
    expect(cache.has('route-1')).toBe(true);
    expect(cache.has('route-20')).toBe(true);
  });

  it('LRU access refreshes entry so it is not evicted', () => {
    const cache = new OfflineRouteCache(3);
    cache.store('a', makeRoute());
    cache.store('b', makeRoute());
    cache.store('c', makeRoute());
    // Access 'a' to refresh its timestamp
    cache.get('a');
    // Insert a new entry, which should evict 'b' (oldest untouched)
    cache.store('d', makeRoute());
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('removes an entry', () => {
    const cache = new OfflineRouteCache();
    cache.store('r1', makeRoute());
    cache.remove('r1');
    expect(cache.has('r1')).toBe(false);
    expect(cache.size).toBe(0);
  });

  it('clears all entries', () => {
    const cache = new OfflineRouteCache();
    cache.store('r1', makeRoute());
    cache.store('r2', makeRoute());
    cache.clear();
    expect(cache.size).toBe(0);
  });
});
