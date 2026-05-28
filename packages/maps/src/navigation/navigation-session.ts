import {
  type LatLng,
  type Route,
  type RouteMode,
  type NavigationState,
  type ProgressInfo,
} from '../types.js';
import { NavigationEventEmitter } from './navigation-events.js';
import { ProgressTracker, pointToPolylineDistance, isOffRoute } from './progress-tracker.js';

export interface NavigationSessionConfig {
  offRouteThreshold?: number;
}

export class NavigationSession {
  private state: NavigationState = 'idle';
  private route: Route | null = null;
  private mode: RouteMode = 'driving';
  private progress: ProgressInfo | null = null;
  private tracker = new ProgressTracker();
  readonly events = new NavigationEventEmitter();

  constructor(private config: NavigationSessionConfig = {}) {}

  startNavigation(route: Route, mode: RouteMode): void {
    this.state = 'planning';
    this.route = route;
    this.mode = mode;
    this.state = 'navigating';
  }

  updatePosition(position: LatLng): ProgressInfo | null {
    if (this.state !== 'navigating' && this.state !== 'rerouting') return null;
    if (!this.route) return null;

    const progress = this.tracker.calculate(this.route, position);
    const prevStepIndex = this.progress?.currentStepIndex ?? 0;
    this.progress = progress;

    const distFromRoute = pointToPolylineDistance(position, this.route.polyline);
    const threshold = this.config.offRouteThreshold;

    const offRoute =
      threshold !== undefined ? distFromRoute > threshold : isOffRoute(distFromRoute, this.mode);

    if (offRoute && this.state === 'navigating') {
      this.state = 'rerouting';
      this.events.emit('offRoute', { distance: distFromRoute });
      this.events.emit('rerouting');
      return progress;
    }

    if (!offRoute && this.state === 'rerouting') {
      this.state = 'navigating';
      this.events.emit('stepAdvanced', { stepIndex: progress.currentStepIndex });
    }

    if (progress.currentStepIndex !== prevStepIndex) {
      this.events.emit('stepAdvanced', { stepIndex: progress.currentStepIndex });
    }

    if (progress.percentComplete >= 100 || progress.distanceRemaining <= 0) {
      this.state = 'arrived';
      this.events.emit('arrived');
    }

    return progress;
  }

  cancel(): void {
    this.state = 'cancelled';
  }

  getState(): NavigationState {
    return this.state;
  }

  getProgress(): ProgressInfo | null {
    return this.progress;
  }
}
