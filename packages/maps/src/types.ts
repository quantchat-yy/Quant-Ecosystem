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

// Transit types
export type TransitMode = 'metro' | 'bus' | 'auto';
export interface TransitStop {
  id: string;
  name: string;
  position: LatLng;
  routes: string[];
}
export interface TransitLeg {
  from: TransitStop;
  to: TransitStop;
  mode: TransitMode | 'walking';
  routeName: string;
  duration: number;
  departureTime: number;
  arrivalTime: number;
}
export interface TransitRoute {
  legs: TransitLeg[];
  totalDuration: number;
  totalDistance: number;
  walkingDistance: number;
}

// Sharing types
export interface ShareSession {
  id: string;
  userId: string;
  sharedWith: string[];
  position: LatLng;
  accuracy: number;
  expiresAt: number;
  eta?: number;
}
export interface ShareConfig {
  duration: number;
  accuracy: 'high' | 'low';
  shareEta: boolean;
}

// AI types
export interface MapQuery {
  text: string;
  userLocation: LatLng;
  timeOfDay?: string;
  preferences?: string[];
}
export interface MapQueryResult {
  type: 'places' | 'route' | 'suggestions';
  places?: PlaceResult[];
  avoidanceZones?: AvoidanceZone[];
  suggestions?: string[];
}
export interface AvoidanceZone {
  center: LatLng;
  radius: number;
  reason: string;
}
export interface TripPlan {
  destination: string;
  days: TripDay[];
  preferences?: TripPreferences;
}
export interface TripDay {
  dayNumber: number;
  places: TripDayStop[];
  notes?: string;
}
export interface TripDayStop {
  place: PlaceResult;
  arrivalTime: string;
  departureTime: string;
  notes?: string;
}
export interface TripPreferences {
  budget: 'budget' | 'mid' | 'luxury';
  interests: string[];
  monsoonAware: boolean;
}
