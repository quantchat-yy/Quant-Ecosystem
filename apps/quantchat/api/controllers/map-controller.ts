// ============================================================================
// QuantChat API - Map Controller
// Snap map, friend locations, heat maps, places, geofilters
// ============================================================================

import type { Request, Response } from '../middleware';
import type { FriendLocation, GeoLocation, HeatMapData, Place, GeoFilter, MapEvent, LocationUpdateRequest } from '../../src/types';

// ============================================================================
// Map Store
// ============================================================================

class MapStore {
  private locations: Map<string, FriendLocation> = new Map();
  private places: Map<string, Place> = new Map();
  private geofilters: Map<string, GeoFilter> = new Map();
  private events: Map<string, MapEvent> = new Map();
  private heatMapData: HeatMapData[] = [];

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample places
    const samplePlaces: Partial<Place>[] = [
      { name: 'Central Park', category: 'park', rating: 4.7, location: { latitude: 40.7829, longitude: -73.9654 } },
      { name: 'Times Square', category: 'landmark', rating: 4.5, location: { latitude: 40.758, longitude: -73.9855 } },
      { name: 'Brooklyn Bridge', category: 'landmark', rating: 4.8, location: { latitude: 40.7061, longitude: -73.9969 } },
      { name: 'Grand Central', category: 'transit', rating: 4.6, location: { latitude: 40.7527, longitude: -73.9772 } },
    ];

    for (const p of samplePlaces) {
      const placeId = `place_${p.name!.toLowerCase().replace(/\s+/g, '_')}`;
      this.places.set(placeId, {
        id: placeId,
        name: p.name!,
        description: `Popular ${p.category} destination`,
        location: p.location!,
        category: p.category!,
        rating: p.rating!,
        reviewCount: Math.floor(Math.random() * 10000),
        photoUrl: `https://maps.quant.chat/places/${placeId}/photo.jpg`,
        isOpen: true,
        openHours: '6:00 AM - 11:00 PM',
        priceLevel: Math.floor(Math.random() * 4) + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Sample heat map data
    for (let i = 0; i < 20; i++) {
      this.heatMapData.push({
        location: {
          latitude: 40.7 + Math.random() * 0.1,
          longitude: -74.0 + Math.random() * 0.1,
        },
        intensity: Math.random(),
        eventType: (['snap', 'story', 'checkin', 'event'] as const)[Math.floor(Math.random() * 4)],
        count: Math.floor(Math.random() * 1000),
      });
    }
  }

  async updateLocation(userId: string, request: LocationUpdateRequest): Promise<FriendLocation> {
    const location: FriendLocation = {
      userId,
      username: `user_${userId}`,
      location: request.location,
      lastUpdated: new Date(),
      isGhostMode: false,
      battery: request.battery,
      speed: request.speed,
    };

    this.locations.set(userId, location);
    return location;
  }

  async getLocation(userId: string): Promise<FriendLocation | null> {
    return this.locations.get(userId) || null;
  }

  async getFriendLocations(userId: string, friendIds: string[]): Promise<FriendLocation[]> {
    const locations: FriendLocation[] = [];
    for (const friendId of friendIds) {
      const loc = this.locations.get(friendId);
      if (loc && !loc.isGhostMode) {
        locations.push(loc);
      }
    }
    return locations;
  }

  async setGhostMode(userId: string, enabled: boolean): Promise<void> {
    const location = this.locations.get(userId);
    if (location) {
      location.isGhostMode = enabled;
    }
  }

  async getNearbyPlaces(location: GeoLocation, radius: number = 1000, category?: string): Promise<Place[]> {
    let places = Array.from(this.places.values());

    if (category) {
      places = places.filter(p => p.category === category);
    }

    // Filter by approximate radius (simplified distance calculation)
    places = places.filter(p => {
      const dist = this.calculateDistance(location, p.location);
      return dist <= radius;
    });

    return places.sort((a, b) => b.rating - a.rating);
  }

  async getPlace(placeId: string): Promise<Place | null> {
    return this.places.get(placeId) || null;
  }

  async getHeatMap(bounds: { north: number; south: number; east: number; west: number }): Promise<HeatMapData[]> {
    return this.heatMapData.filter(d =>
      d.location.latitude >= bounds.south &&
      d.location.latitude <= bounds.north &&
      d.location.longitude >= bounds.west &&
      d.location.longitude <= bounds.east
    );
  }

  async getGeofilters(location: GeoLocation): Promise<GeoFilter[]> {
    const filters: GeoFilter[] = [];
    for (const filter of this.geofilters.values()) {
      if (!filter.isActive) continue;
      const dist = this.calculateDistance(location, filter.location);
      if (dist <= filter.radius) {
        filters.push(filter);
      }
    }
    return filters;
  }

  async createGeofilter(userId: string, filter: Partial<GeoFilter>): Promise<GeoFilter> {
    const filterId = `geofilter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const geofilter: GeoFilter = {
      id: filterId,
      name: filter.name || 'Custom Geofilter',
      location: filter.location!,
      radius: filter.radius || 500,
      overlayUrl: filter.overlayUrl || `https://maps.quant.chat/geofilters/${filterId}/overlay.png`,
      startDate: filter.startDate || new Date(),
      endDate: filter.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      usageCount: 0,
      creatorId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.geofilters.set(filterId, geofilter);
    return geofilter;
  }

  async getNearbyEvents(location: GeoLocation, radius: number = 5000): Promise<MapEvent[]> {
    const events: MapEvent[] = [];
    for (const event of this.events.values()) {
      const dist = this.calculateDistance(location, event.location);
      if (dist <= radius) {
        events.push(event);
      }
    }
    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    // Haversine formula approximation (returns meters)
    const R = 6371000;
    const lat1 = loc1.latitude * Math.PI / 180;
    const lat2 = loc2.latitude * Math.PI / 180;
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

const mapStore = new MapStore();

// ============================================================================
// Map Controller
// ============================================================================

export class MapController {
  async updateLocation(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as LocationUpdateRequest;

    if (!body.location || !body.location.latitude || !body.location.longitude) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Location with latitude and longitude is required', statusCode: 400 } });
      return;
    }

    const location = await mapStore.updateLocation(userId, body);
    res.status(200).json({ success: true, data: location });
  }

  async getMyLocation(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const location = await mapStore.getLocation(userId);

    if (!location) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Location not set', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: location });
  }

  async getFriendLocations(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { friendIds: string[] };
    const friendIds = body.friendIds || [];

    const locations = await mapStore.getFriendLocations(userId, friendIds);
    res.status(200).json({ success: true, data: locations });
  }

  async setGhostMode(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { enabled: boolean };

    await mapStore.setGhostMode(userId, body.enabled ?? true);
    res.status(200).json({ success: true, data: { ghostMode: body.enabled ?? true } });
  }

  async getNearbyPlaces(req: Request, res: Response): Promise<void> {
    const lat = parseFloat(req.query['lat'] as string);
    const lng = parseFloat(req.query['lng'] as string);
    const radius = parseInt(req.query['radius'] as string) || 1000;
    const category = req.query['category'] as string | undefined;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Latitude and longitude are required', statusCode: 400 } });
      return;
    }

    const places = await mapStore.getNearbyPlaces({ latitude: lat, longitude: lng }, radius, category);
    res.status(200).json({ success: true, data: places });
  }

  async getPlace(req: Request, res: Response): Promise<void> {
    const placeId = req.params['placeId'];
    const place = await mapStore.getPlace(placeId);

    if (!place) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Place not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: place });
  }

  async getHeatMap(req: Request, res: Response): Promise<void> {
    const north = parseFloat(req.query['north'] as string);
    const south = parseFloat(req.query['south'] as string);
    const east = parseFloat(req.query['east'] as string);
    const west = parseFloat(req.query['west'] as string);

    if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Map bounds (north, south, east, west) are required', statusCode: 400 } });
      return;
    }

    const data = await mapStore.getHeatMap({ north, south, east, west });
    res.status(200).json({ success: true, data });
  }

  async getGeofilters(req: Request, res: Response): Promise<void> {
    const lat = parseFloat(req.query['lat'] as string);
    const lng = parseFloat(req.query['lng'] as string);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Latitude and longitude are required', statusCode: 400 } });
      return;
    }

    const filters = await mapStore.getGeofilters({ latitude: lat, longitude: lng });
    res.status(200).json({ success: true, data: filters });
  }

  async createGeofilter(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as Partial<GeoFilter>;

    if (!body.location || !body.name) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Name and location are required', statusCode: 400 } });
      return;
    }

    const geofilter = await mapStore.createGeofilter(userId, body);
    res.status(201).json({ success: true, data: geofilter });
  }

  async getNearbyEvents(req: Request, res: Response): Promise<void> {
    const lat = parseFloat(req.query['lat'] as string);
    const lng = parseFloat(req.query['lng'] as string);
    const radius = parseInt(req.query['radius'] as string) || 5000;

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Latitude and longitude are required', statusCode: 400 } });
      return;
    }

    const events = await mapStore.getNearbyEvents({ latitude: lat, longitude: lng }, radius);
    res.status(200).json({ success: true, data: events });
  }
}

export const mapController = new MapController();
