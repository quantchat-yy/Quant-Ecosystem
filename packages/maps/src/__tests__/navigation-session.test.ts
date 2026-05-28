import { describe, it, expect } from 'vitest';
import { NavigationSession } from '../navigation/navigation-session.js';
import { type Route } from '../types.js';

function makeRoute(points: Array<{ lat: number; lng: number }>): Route {
  const distance = points.reduce((sum, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1]!;
    return sum + Math.sqrt(((p.lat - prev.lat) * 111000) ** 2 + ((p.lng - prev.lng) * 111000) ** 2);
  }, 0);
  return {
    polyline: points,
    distance,
    duration: distance / 11,
    mode: 'driving',
    steps: points.slice(1).map((p, i) => ({
      instruction: `Step ${i + 1}`,
      distance: distance / (points.length - 1),
      duration: distance / (points.length - 1) / 11,
      position: p,
    })),
  };
}

describe('NavigationSession', () => {
  it('transitions idle -> navigating on startNavigation', () => {
    const session = new NavigationSession();
    expect(session.getState()).toBe('idle');
    const route = makeRoute([
      { lat: 20.0, lng: 78.0 },
      { lat: 20.01, lng: 78.01 },
    ]);
    session.startNavigation(route, 'driving');
    expect(session.getState()).toBe('navigating');
  });

  it('updatePosition returns progress info', () => {
    const session = new NavigationSession();
    const route = makeRoute([
      { lat: 20.0, lng: 78.0 },
      { lat: 20.01, lng: 78.01 },
    ]);
    session.startNavigation(route, 'driving');
    const progress = session.updatePosition({ lat: 20.005, lng: 78.005 });
    expect(progress).not.toBeNull();
    expect(progress!.percentComplete).toBeGreaterThan(0);
    expect(progress!.distanceRemaining).toBeGreaterThanOrEqual(0);
  });

  it('emits offRoute event when position is far from route', () => {
    const session = new NavigationSession();
    const route = makeRoute([
      { lat: 20.0, lng: 78.0 },
      { lat: 20.01, lng: 78.01 },
    ]);
    session.startNavigation(route, 'driving');
    let offRouteFired = false;
    session.events.on('offRoute', () => {
      offRouteFired = true;
    });
    // Position far from the route polyline (>50m)
    session.updatePosition({ lat: 20.005, lng: 78.01 });
    expect(offRouteFired).toBe(true);
    expect(session.getState()).toBe('rerouting');
  });

  it('emits arrived event when reaching the end', () => {
    const session = new NavigationSession();
    const route = makeRoute([
      { lat: 20.0, lng: 78.0 },
      { lat: 20.001, lng: 78.0 },
    ]);
    session.startNavigation(route, 'driving');
    let arrivedFired = false;
    session.events.on('arrived', () => {
      arrivedFired = true;
    });
    // Position at end of route
    session.updatePosition({ lat: 20.001, lng: 78.0 });
    expect(arrivedFired).toBe(true);
    expect(session.getState()).toBe('arrived');
  });

  it('cancel() transitions to cancelled', () => {
    const session = new NavigationSession();
    const route = makeRoute([
      { lat: 20.0, lng: 78.0 },
      { lat: 20.01, lng: 78.01 },
    ]);
    session.startNavigation(route, 'driving');
    session.cancel();
    expect(session.getState()).toBe('cancelled');
  });

  it('recovers from rerouting to navigating when position returns on-route', () => {
    const session = new NavigationSession({ offRouteThreshold: 50 });
    const route = makeRoute([
      { lat: 20.0, lng: 78.0 },
      { lat: 20.01, lng: 78.0 },
    ]);
    session.startNavigation(route, 'driving');
    // Move far off route to trigger rerouting
    session.updatePosition({ lat: 20.005, lng: 78.01 });
    expect(session.getState()).toBe('rerouting');
    // Return to on-route position
    session.updatePosition({ lat: 20.005, lng: 78.0 });
    expect(session.getState()).toBe('navigating');
  });
});
