import type { CapabilityProvider } from './types.js';

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface LocationCapability extends CapabilityProvider<'location'> {
  getCurrentPosition(): Promise<Position>;
  watchPosition(cb: (pos: Position) => void): () => void;
  geocode(address: string): Promise<Position>;
  reverseGeocode(pos: Position): Promise<string>;
}
