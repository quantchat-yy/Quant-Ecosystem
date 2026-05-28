import { type TripPlan, type TripDay, type TripPreferences, type PlaceResult } from '../types.js';
import { type PlaceSearch } from '../search/place-search.js';
import { INDIA_CENTER } from '../types.js';

const MONSOON_MONTHS = [6, 7, 8, 9];
const SLOTS = ['09:00', '11:00', '14:00', '16:00', '19:00'];

export class TripPlanner {
  constructor(private search: PlaceSearch) {}

  async planTrip(
    destination: string,
    duration: number,
    preferences?: Partial<TripPreferences>,
  ): Promise<TripPlan> {
    const prefs: TripPreferences = {
      budget: 'mid',
      interests: ['sightseeing'],
      monsoonAware: false,
      ...preferences,
    };
    const places = await this.search.search(destination, INDIA_CENTER);
    const location = places[0]?.position ?? INDIA_CENTER;
    const days: TripDay[] = [];
    for (let d = 1; d <= duration; d++) {
      const dayPlaces = await this.getDayPlaces(location, prefs, d);
      const notes = this.getDayNotes(d, prefs);
      days.push({
        dayNumber: d,
        places: dayPlaces.map((p, i) => ({
          place: p,
          arrivalTime: SLOTS[i] ?? '10:00',
          departureTime: SLOTS[i + 1] ?? '20:00',
          notes: prefs.monsoonAware ? 'Indoor activity preferred' : undefined,
        })),
        notes,
      });
    }
    return { destination, days, preferences: prefs };
  }

  private async getDayPlaces(
    location: { lat: number; lng: number },
    prefs: TripPreferences,
    _day: number,
  ): Promise<PlaceResult[]> {
    const idx = (_day - 1) % prefs.interests.length;
    const query = prefs.interests[idx] ?? 'attractions';
    const results = await this.search.search(query, location);
    const offset = ((_day - 1) * 3) % Math.max(results.length, 1);
    return results.slice(offset, offset + 3);
  }

  private getDayNotes(day: number, prefs: TripPreferences): string | undefined {
    const month = new Date().getMonth();
    if (prefs.monsoonAware && MONSOON_MONTHS.includes(month))
      return `Day ${day}: Monsoon season - carry umbrella, prefer indoor venues`;
    if (day === 1) return 'Arrival day - light schedule recommended';
    return undefined;
  }
}
