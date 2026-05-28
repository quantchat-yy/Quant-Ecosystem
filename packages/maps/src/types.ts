export interface LatLng {
  lat: number;
  lng: number;
}
export interface TileSource {
  url: string;
  type: 'pmtiles' | 'raster' | 'vector';
  attribution?: string;
}
export interface GeocoderResult {
  position: LatLng;
  displayName: string;
  type: string;
  confidence: number;
}
export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  position: LatLng;
}
export interface Route {
  polyline: LatLng[];
  distance: number;
  duration: number;
  steps: RouteStep[];
  mode: RouteMode;
}
export type RouteMode = 'driving' | 'walking' | 'cycling' | 'two-wheeler';
export interface PlaceResult {
  name: string;
  category: string;
  position: LatLng;
  distance?: number;
}
export interface LocationUpdate {
  position: LatLng;
  accuracy: number;
  timestamp: number;
  heading?: number;
  speed?: number;
}
export const INDIA_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 };

export type NavigationState =
  | 'idle'
  | 'planning'
  | 'navigating'
  | 'rerouting'
  | 'arrived'
  | 'cancelled';

export interface VoiceInstruction {
  text: string;
  language: string;
  distanceTrigger: number;
}

export interface OfflineRoute {
  id: string;
  route: Route;
  cachedAt: number;
}

export interface ProgressInfo {
  distanceRemaining: number;
  timeRemaining: number;
  currentStepIndex: number;
  distanceToNextManeuver: number;
  percentComplete: number;
}

export type NavigationEventType =
  | 'stepAdvanced'
  | 'offRoute'
  | 'rerouting'
  | 'arrived'
  | 'speedAlert'
  | 'etaUpdated';

export interface NavigationEvent {
  type: NavigationEventType;
  payload?: unknown;
}
