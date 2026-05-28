import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhotonProvider } from '../geocoding/geocoder.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const feature = (coords: number[], name: string) => ({
  features: [{ geometry: { coordinates: coords }, properties: { name, type: 'city' } }],
});

describe('PhotonProvider', () => {
  const provider = new PhotonProvider('https://photon.test');
  beforeEach(() => vi.clearAllMocks());

  it('performs forward geocoding', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(feature([78, 20], 'Mumbai')),
    });
    const results = await provider.forward('Mumbai');
    expect(results[0]!.displayName).toBe('Mumbai');
    expect(results[0]!.position).toEqual({ lat: 20, lng: 78 });
  });

  it('performs reverse geocoding', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(feature([77.2, 28.6], 'Delhi')),
    });
    const results = await provider.reverse({ lat: 28.6, lng: 77.2 });
    expect(results[0]!.displayName).toBe('Delhi');
  });
});
