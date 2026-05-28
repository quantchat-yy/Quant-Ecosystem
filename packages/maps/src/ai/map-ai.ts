import {
  type MapQuery,
  type MapQueryResult,
  type AvoidanceZone,
  type PlaceResult,
} from '../types.js';
import { type PlaceSearch } from '../search/place-search.js';

const PLACE_KEYWORDS = ['coffee', 'chai', 'wifi', 'quiet', 'food', 'restaurant'];
const AVOID_KEYWORDS = ['avoid', 'waterlogged', 'flooded', 'blocked', 'construction'];
const SUGGEST_KEYWORDS = ['nearby', 'what', 'suggest', 'recommend'];

export class MapAI {
  constructor(private search: PlaceSearch) {}

  async processQuery(query: MapQuery): Promise<MapQueryResult> {
    const text = query.text.toLowerCase();
    if (AVOID_KEYWORDS.some((k) => text.includes(k))) return this.buildAvoidance(text, query);
    if (PLACE_KEYWORDS.some((k) => text.includes(k))) return this.buildPlaces(query);
    if (SUGGEST_KEYWORDS.some((k) => text.includes(k))) return this.buildSuggestions(query);
    return this.fallbackSearch(query);
  }

  private buildAvoidance(text: string, query: MapQuery): MapQueryResult {
    const hazards = ['waterlogged', 'flooded', 'blocked', 'construction'];
    const reason = hazards.find((k) => text.includes(k)) ?? 'avoid';
    const zone: AvoidanceZone = { center: query.userLocation, radius: 500, reason };
    return { type: 'route', avoidanceZones: [zone] };
  }

  private async buildSuggestions(query: MapQuery): Promise<MapQueryResult> {
    const category =
      query.timeOfDay === 'morning'
        ? 'chai'
        : query.timeOfDay === 'evening'
          ? 'restaurant'
          : 'cafe';
    const places = await this.search.search(category, query.userLocation);
    return { type: 'suggestions', places, suggestions: places.map((p: PlaceResult) => p.name) };
  }

  private async buildPlaces(query: MapQuery): Promise<MapQueryResult> {
    const places = await this.search.search(query.text, query.userLocation);
    return { type: 'places', places };
  }

  private async fallbackSearch(query: MapQuery): Promise<MapQueryResult> {
    const places = await this.search.search(query.text, query.userLocation);
    return { type: 'places', places };
  }
}
