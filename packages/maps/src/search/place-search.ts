import { type LatLng, type PlaceResult, INDIA_CENTER } from '../types.js';
import { type GeocodingProvider } from '../geocoding/geocoder.js';

const INDIA_CATEGORIES: Record<string, string[]> = {
  'chai stall': ['chai', 'tea stall', '\u091A\u093E\u092F'],
  'medical store': ['pharmacy', 'medical', '\u0926\u0935\u093E\u0908'],
  'auto stand': ['auto rickshaw', '\u0911\u091F\u094B \u0938\u094D\u091F\u0948\u0902\u0921'],
  'petrol pump': [
    'fuel station',
    'petrol',
    '\u092A\u0947\u091F\u094D\u0930\u094B\u0932 \u092A\u0902\u092A',
  ],
};

export class PlaceSearch {
  constructor(private geocoder: GeocodingProvider) {}

  private findCategory(query: string): string | null {
    const lower = query.toLowerCase();
    for (const [category, synonyms] of Object.entries(INDIA_CATEGORIES)) {
      if (lower.includes(category) || synonyms.some((s) => lower.includes(s))) return category;
    }
    return null;
  }

  getCategories(): string[] {
    return Object.keys(INDIA_CATEGORIES);
  }

  async search(query: string, near: LatLng = INDIA_CENTER): Promise<PlaceResult[]> {
    const cat = this.findCategory(query);
    const expanded = cat ? INDIA_CATEGORIES[cat]![0]! : query;
    const results = await this.geocoder.forward(expanded, near);
    return results.map((r) => ({
      name: r.displayName,
      category: cat ?? r.type,
      position: r.position,
      distance: this.haversine(near, r.position),
    }));
  }

  private haversine(a: LatLng, b: LatLng): number {
    const R = 6371000,
      dLat = ((b.lat - a.lat) * Math.PI) / 180,
      dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
}
