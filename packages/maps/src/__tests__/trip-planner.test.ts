import { describe, it, expect, vi } from 'vitest';
import { TripPlanner } from '../ai/trip-planner.js';
import { type PlaceSearch } from '../search/place-search.js';

describe('TripPlanner', () => {
  const mockSearch = {
    search: vi.fn().mockResolvedValue([
      {
        name: 'Gateway of India',
        category: 'landmark',
        position: { lat: 18.92, lng: 72.83 },
        distance: 500,
      },
      {
        name: 'Marine Drive',
        category: 'scenic',
        position: { lat: 18.94, lng: 72.82 },
        distance: 800,
      },
      {
        name: 'Elephanta Caves',
        category: 'heritage',
        position: { lat: 18.96, lng: 72.93 },
        distance: 1200,
      },
    ]),
    getCategories: vi.fn(),
  } as unknown as PlaceSearch;
  const planner = new TripPlanner(mockSearch);

  it('planTrip generates correct number of days', async () => {
    const plan = await planner.planTrip('Mumbai', 3);
    expect(plan.days).toHaveLength(3);
    expect(plan.days[0]!.dayNumber).toBe(1);
    expect(plan.days[2]!.dayNumber).toBe(3);
    expect(plan.destination).toBe('Mumbai');
  });

  it('monsoon awareness adds weather notes', async () => {
    const plan = await planner.planTrip('Mumbai', 2, { monsoonAware: true });
    const hasIndoorNote = plan.days.some((d) => d.places.some((p) => p.notes?.includes('Indoor')));
    expect(hasIndoorNote).toBe(true);
  });

  it('preferences influence plan structure', async () => {
    const plan = await planner.planTrip('Mumbai', 2, { budget: 'luxury', interests: ['heritage'] });
    expect(plan.preferences!.budget).toBe('luxury');
    expect(plan.preferences!.interests).toContain('heritage');
    expect(plan.days[0]!.places.length).toBeGreaterThan(0);
  });
});
