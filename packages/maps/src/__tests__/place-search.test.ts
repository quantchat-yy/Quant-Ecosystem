import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaceSearch } from '../search/place-search.js';
import { type GeocodingProvider } from '../geocoding/geocoder.js';

describe('PlaceSearch', () => {
  const mockGeocoder: GeocodingProvider = {
    forward: vi
      .fn()
      .mockResolvedValue([
        {
          position: { lat: 19.07, lng: 72.87 },
          displayName: 'Chai Corner',
          type: 'cafe',
          confidence: 0.8,
        },
      ]),
    reverse: vi.fn().mockResolvedValue([]),
  };
  let search: PlaceSearch;
  beforeEach(() => {
    vi.clearAllMocks();
    search = new PlaceSearch(mockGeocoder);
  });

  it('searches places by category and Hindi queries', async () => {
    const r1 = await search.search('chai stall', { lat: 19.07, lng: 72.87 });
    expect(r1[0]!.category).toBe('chai stall');
    const r2 = await search.search('\u091A\u093E\u092F', { lat: 19.07, lng: 72.87 });
    expect(r2[0]!.category).toBe('chai stall');
  });

  it('lists categories and calculates distance', async () => {
    expect(search.getCategories()).toContain('chai stall');
    expect(search.getCategories()).toContain('petrol pump');
    const results = await search.search('petrol pump', { lat: 20.0, lng: 78.0 });
    expect(results[0]!.distance).toBeGreaterThan(0);
  });
});
