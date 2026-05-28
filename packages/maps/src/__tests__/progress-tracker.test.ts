import { describe, it, expect } from 'vitest';
import {
  ProgressTracker,
  pointToPolylineDistance,
  isOffRoute,
} from '../navigation/progress-tracker.js';
import { type Route } from '../types.js';

describe('ProgressTracker', () => {
  const tracker = new ProgressTracker();

  it('calculates correct percentComplete for midpoint', () => {
    const route: Route = {
      polyline: [
        { lat: 20.0, lng: 78.0 },
        { lat: 20.01, lng: 78.0 },
        { lat: 20.02, lng: 78.0 },
      ],
      distance: 0.02 * 111000,
      duration: 200,
      mode: 'driving',
      steps: [
        {
          instruction: 'Go north',
          distance: 0.01 * 111000,
          duration: 100,
          position: { lat: 20.0, lng: 78.0 },
        },
        {
          instruction: 'Continue',
          distance: 0.01 * 111000,
          duration: 100,
          position: { lat: 20.01, lng: 78.0 },
        },
      ],
    };
    const progress = tracker.calculate(route, { lat: 20.01, lng: 78.0 });
    expect(progress.percentComplete).toBeCloseTo(50, 0);
  });

  it('advances currentStepIndex based on position', () => {
    const route: Route = {
      polyline: [
        { lat: 20.0, lng: 78.0 },
        { lat: 20.01, lng: 78.0 },
        { lat: 20.02, lng: 78.0 },
      ],
      distance: 0.02 * 111000,
      duration: 200,
      mode: 'driving',
      steps: [
        {
          instruction: 'Step 1',
          distance: 0.01 * 111000,
          duration: 100,
          position: { lat: 20.0, lng: 78.0 },
        },
        {
          instruction: 'Step 2',
          distance: 0.01 * 111000,
          duration: 100,
          position: { lat: 20.01, lng: 78.0 },
        },
      ],
    };
    const nearStart = tracker.calculate(route, { lat: 20.002, lng: 78.0 });
    expect(nearStart.currentStepIndex).toBe(0);
    const nearEnd = tracker.calculate(route, { lat: 20.015, lng: 78.0 });
    expect(nearEnd.currentStepIndex).toBe(1);
  });
});

describe('pointToPolylineDistance', () => {
  it('returns small distance for a point near a segment', () => {
    const polyline = [
      { lat: 20.0, lng: 78.0 },
      { lat: 20.01, lng: 78.0 },
    ];
    // Point directly on the line
    const dist = pointToPolylineDistance({ lat: 20.005, lng: 78.0 }, polyline);
    expect(dist).toBeLessThan(1);
  });

  it('returns larger distance for a point offset from segment', () => {
    const polyline = [
      { lat: 20.0, lng: 78.0 },
      { lat: 20.01, lng: 78.0 },
    ];
    // Point offset ~111m east
    const dist = pointToPolylineDistance({ lat: 20.005, lng: 78.001 }, polyline);
    expect(dist).toBeGreaterThan(50);
  });
});

describe('isOffRoute', () => {
  it('returns true at 51m for driving', () => {
    expect(isOffRoute(51, 'driving')).toBe(true);
  });

  it('returns false at 49m for driving', () => {
    expect(isOffRoute(49, 'driving')).toBe(false);
  });

  it('returns true at 31m for walking', () => {
    expect(isOffRoute(31, 'walking')).toBe(true);
  });

  it('returns false at 29m for walking', () => {
    expect(isOffRoute(29, 'walking')).toBe(false);
  });

  it('returns true at 31m for cycling', () => {
    expect(isOffRoute(31, 'cycling')).toBe(true);
  });

  it('returns true at 51m for two-wheeler', () => {
    expect(isOffRoute(51, 'two-wheeler')).toBe(true);
  });
});
