// Mobile Maps Service — wires @quant/maps into the Capacitor shell.
//
// As with local-first, the mobile shell has no Fastify backend / Next proxy, so
// the engine is consumed through a client-side service (the seam the architecture
// supports). This file is the real, non-test importer that closes DoD-1 for
// `@quant/maps`.
//
// `@quant/maps` is browser/WebView-friendly: geocoding (PhotonProvider) and
// routing (OSRMProvider) use `fetch`, the `LocationService` uses the standard
// `navigator.geolocation` Web API (available in the Capacitor WebView), and the
// `PlaceSearch`/`TripPlanner` layers are pure compute. Providers are injectable
// so the service is testable without network or device access; the defaults are
// the real WebView-capable implementations.

import {
  PhotonProvider,
  OSRMProvider,
  PlaceSearch,
  TripPlanner,
  LocationService,
  type GeocodingProvider,
  type RoutingProvider,
  type GeocoderResult,
  type PlaceResult,
  type Route,
  type RouteMode,
  type TripPlan,
  type TripPreferences,
  type LatLng,
  type LocationCallback,
  INDIA_CENTER,
} from '@quant/maps';

export interface MobileMapsServiceOptions {
  /** Geocoding provider; defaults to the Photon (fetch-based) provider. */
  geocoder?: GeocodingProvider;
  /** Routing provider; defaults to the OSRM (fetch-based) provider. */
  router?: RoutingProvider;
  /** Location service; defaults to a navigator.geolocation-backed service. */
  location?: LocationService;
}

/**
 * Client-side facade the mega-shell uses for maps/navigation features:
 * geocoding, place search, routing, trip planning and live-location watching.
 */
export class MobileMapsService {
  private readonly geocoder: GeocodingProvider;
  private readonly router: RoutingProvider;
  private readonly placeSearch: PlaceSearch;
  private readonly tripPlanner: TripPlanner;
  private readonly location: LocationService;

  constructor(options: MobileMapsServiceOptions = {}) {
    this.geocoder = options.geocoder ?? new PhotonProvider();
    this.router = options.router ?? new OSRMProvider();
    this.placeSearch = new PlaceSearch(this.geocoder);
    this.tripPlanner = new TripPlanner(this.placeSearch);
    this.location = options.location ?? new LocationService();
  }

  /** Forward-geocode a free-text query near a point (defaults to India center). */
  async geocode(query: string, near: LatLng = INDIA_CENTER): Promise<GeocoderResult[]> {
    return this.geocoder.forward(query, near);
  }

  /** Reverse-geocode a coordinate to nearby named places. */
  async reverseGeocode(position: LatLng): Promise<GeocoderResult[]> {
    return this.geocoder.reverse(position);
  }

  /** Category-aware place search near a location. */
  async searchPlaces(query: string, near: LatLng = INDIA_CENTER): Promise<PlaceResult[]> {
    return this.placeSearch.search(query, near);
  }

  /** Compute a route between two points for the given travel mode. */
  async route(from: LatLng, to: LatLng, mode: RouteMode = 'driving'): Promise<Route> {
    return this.router.route(from, to, mode);
  }

  /** Plan a multi-day trip to a destination. */
  async planTrip(
    destination: string,
    days: number,
    preferences?: Partial<TripPreferences>,
  ): Promise<TripPlan> {
    return this.tripPlanner.planTrip(destination, days, preferences);
  }

  /** Begin watching the device location (navigator.geolocation in the WebView). */
  startLocationWatch(onError?: (error: GeolocationPositionError) => void): void {
    this.location.startWatching(onError);
  }

  stopLocationWatch(): void {
    this.location.stopWatching();
  }

  onLocationUpdate(cb: LocationCallback): () => void {
    return this.location.onUpdate(cb);
  }

  get isWatchingLocation(): boolean {
    return this.location.isWatching;
  }

  dispose(): void {
    this.location.dispose();
  }
}
