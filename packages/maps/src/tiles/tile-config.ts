import { type LatLng, type TileSource, INDIA_CENTER } from '../types.js';

export interface TileConfig {
  source: TileSource;
  center: LatLng;
  zoom: number;
  layers: LayerConfig[];
}
export interface LayerConfig {
  id: string;
  type: 'road' | 'building' | 'water' | 'land';
  visible: boolean;
  color: string;
}

export function buildTileUrl(baseUrl: string, z: number, x: number, y: number): string {
  return `${baseUrl}/${z}/${x}/${y}.pbf`;
}

export function createTileConfig(selfHostedUrl?: string): TileConfig {
  const url = selfHostedUrl ?? 'https://tiles.quantcdn.in/india';
  return {
    source: { url, type: 'pmtiles', attribution: 'OpenStreetMap contributors' },
    center: INDIA_CENTER,
    zoom: 5,
    layers: [
      { id: 'land', type: 'land', visible: true, color: '#f0e6d2' },
      { id: 'water', type: 'water', visible: true, color: '#aad3df' },
      { id: 'roads', type: 'road', visible: true, color: '#ffffff' },
      { id: 'buildings', type: 'building', visible: true, color: '#d9d0c9' },
    ],
  };
}
