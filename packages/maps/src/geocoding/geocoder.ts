import { type LatLng, type GeocoderResult, INDIA_CENTER } from '../types.js';

export interface GeocodingProvider {
  forward(query: string, near?: LatLng): Promise<GeocoderResult[]>;
  reverse(position: LatLng): Promise<GeocoderResult[]>;
}

export class PhotonProvider implements GeocodingProvider {
  constructor(private baseUrl = 'https://photon.komoot.io') {}

  async forward(query: string, near: LatLng = INDIA_CENTER): Promise<GeocoderResult[]> {
    const url = `${this.baseUrl}/api?q=${encodeURIComponent(query)}&lat=${near.lat}&lon=${near.lng}&lang=en`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features: Array<{
        geometry: { coordinates: number[] };
        properties: { name?: string; type?: string };
      }>;
    };
    return data.features.map((f) => ({
      position: { lat: f.geometry.coordinates[1]!, lng: f.geometry.coordinates[0]! },
      displayName: f.properties.name ?? '',
      type: f.properties.type ?? 'place',
      confidence: 0.8,
    }));
  }

  async reverse(position: LatLng): Promise<GeocoderResult[]> {
    const url = `${this.baseUrl}/reverse?lat=${position.lat}&lon=${position.lng}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features: Array<{
        geometry: { coordinates: number[] };
        properties: { name?: string; type?: string };
      }>;
    };
    return data.features.map((f) => ({
      position: { lat: f.geometry.coordinates[1]!, lng: f.geometry.coordinates[0]! },
      displayName: f.properties.name ?? '',
      type: f.properties.type ?? 'place',
      confidence: 0.7,
    }));
  }
}
