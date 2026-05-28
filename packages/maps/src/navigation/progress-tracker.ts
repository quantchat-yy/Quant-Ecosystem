import { type LatLng, type Route, type RouteMode, type ProgressInfo } from '../types.js';

export function pointToSegmentDistance(point: LatLng, segStart: LatLng, segEnd: LatLng): number {
  const cosLat = Math.cos((point.lat * Math.PI) / 180);
  const dx = (segEnd.lng - segStart.lng) * cosLat * 111000;
  const dy = (segEnd.lat - segStart.lat) * 111000;
  const px = (point.lng - segStart.lng) * cosLat * 111000;
  const py = (point.lat - segStart.lat) * 111000;

  const segLenSq = dx * dx + dy * dy;
  if (segLenSq === 0) return Math.sqrt(px * px + py * py);

  let t = (px * dx + py * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = t * dx;
  const projY = t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export function pointToPolylineDistance(point: LatLng, polyline: LatLng[]): number {
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentDistance(point, polyline[i]!, polyline[i + 1]!);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function isOffRoute(distanceFromRoute: number, mode: RouteMode): boolean {
  const threshold = mode === 'walking' || mode === 'cycling' ? 30 : 50;
  return distanceFromRoute > threshold;
}

export class ProgressTracker {
  calculate(route: Route, currentPosition: LatLng): ProgressInfo {
    const totalDistance = route.distance;

    let closestSegIdx = 0;
    let closestSegDist = Infinity;
    let closestSegT = 0;
    const cosLat = Math.cos((currentPosition.lat * Math.PI) / 180);
    for (let i = 0; i < route.polyline.length - 1; i++) {
      const a = route.polyline[i]!;
      const b = route.polyline[i + 1]!;
      const dx = (b.lng - a.lng) * cosLat * 111000;
      const dy = (b.lat - a.lat) * 111000;
      const px = (currentPosition.lng - a.lng) * cosLat * 111000;
      const py = (currentPosition.lat - a.lat) * 111000;
      const segLenSq = dx * dx + dy * dy;
      let t = segLenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
      const projX = t * dx;
      const projY = t * dy;
      const d = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
      if (d < closestSegDist) {
        closestSegDist = d;
        closestSegIdx = i;
        closestSegT = t;
      }
    }

    let distanceCovered = 0;
    for (let i = 0; i < closestSegIdx; i++) {
      const a = route.polyline[i]!;
      const b = route.polyline[i + 1]!;
      distanceCovered += Math.sqrt(
        ((b.lat - a.lat) * 111000) ** 2 + ((b.lng - a.lng) * cosLat * 111000) ** 2,
      );
    }
    // Add partial distance along the closest segment
    const segA = route.polyline[closestSegIdx]!;
    const segB = route.polyline[closestSegIdx + 1]!;
    const segLen = Math.sqrt(
      ((segB.lat - segA.lat) * 111000) ** 2 + ((segB.lng - segA.lng) * cosLat * 111000) ** 2,
    );
    distanceCovered += closestSegT * segLen;

    const distanceRemaining = Math.max(0, totalDistance - distanceCovered);
    const percentComplete =
      totalDistance > 0 ? Math.min(100, (distanceCovered / totalDistance) * 100) : 0;

    let currentStepIndex = 0;
    let accum = 0;
    for (let i = 0; i < route.steps.length; i++) {
      accum += route.steps[i]!.distance;
      if (accum >= distanceCovered) {
        currentStepIndex = i;
        break;
      }
      if (i === route.steps.length - 1) {
        currentStepIndex = i;
      }
    }

    const nextManeuverPosition =
      currentStepIndex < route.steps.length - 1
        ? route.steps[currentStepIndex + 1]!.position
        : route.polyline[route.polyline.length - 1]!;
    const distanceToNextManeuver = Math.sqrt(
      ((currentPosition.lat - nextManeuverPosition.lat) * 111000) ** 2 +
        ((currentPosition.lng - nextManeuverPosition.lng) * cosLat * 111000) ** 2,
    );

    const avgSpeed = totalDistance / (route.duration || 1);
    const timeRemaining = avgSpeed > 0 ? distanceRemaining / avgSpeed : 0;

    return {
      distanceRemaining,
      timeRemaining,
      currentStepIndex,
      distanceToNextManeuver,
      percentComplete,
    };
  }
}
