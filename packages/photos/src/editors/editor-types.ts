import type { EditResult } from '../types.js';

export interface MagicEraserEditor {
  erase(photoUri: string, maskUri: string): Promise<EditResult>;
}

export interface UnblurEditor {
  enhance(photoUri: string): Promise<EditResult>;
}

export interface CinematicEditor {
  applyBokeh(photoUri: string, depthMapUri?: string): Promise<EditResult>;
}

export interface BestTakeEditor {
  selectBest(burstUris: string[]): Promise<EditResult>;
}
