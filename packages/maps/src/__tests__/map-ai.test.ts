import { describe, it, expect, vi } from 'vitest';
import { MapAI } from '../ai/map-ai.js';
import { type PlaceSearch } from '../search/place-search.js';

describe('MapAI', () => {
  const mockSearch = {
    search: vi
      .fn()
      .mockResolvedValue([
        { name: 'Cafe Blue', category: 'cafe', position: { lat: 19.0, lng: 72.8 }, distance: 100 },
      ]),
    getCategories: vi.fn(),
  } as unknown as PlaceSearch;
  const ai = new MapAI(mockSearch);
  const loc = { lat: 19.07, lng: 72.87 };

  it('coffee query returns places', async () => {
    const result = await ai.processQuery({ text: 'find me coffee nearby', userLocation: loc });
    expect(result.type).toBe('places');
    expect(result.places!.length).toBeGreaterThan(0);
  });

  it('avoid waterlogged returns avoidanceZones', async () => {
    const result = await ai.processQuery({ text: 'avoid waterlogged area', userLocation: loc });
    expect(result.type).toBe('route');
    expect(result.avoidanceZones!.length).toBeGreaterThan(0);
    expect(result.avoidanceZones![0]!.reason).toBe('waterlogged');
  });

  it('what is nearby returns suggestions', async () => {
    const result = await ai.processQuery({
      text: 'what is nearby',
      userLocation: loc,
      timeOfDay: 'morning',
    });
    expect(result.type).toBe('suggestions');
    expect(result.suggestions).toBeDefined();
  });

  it('fallback to search for unrecognized queries', async () => {
    const result = await ai.processQuery({ text: 'random xyz place', userLocation: loc });
    expect(result.type).toBe('places');
  });
});
