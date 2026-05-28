export interface SpatialDevice {
  id: string;
  name: string;
  type: 'visionpro' | 'quest3' | 'generic';
  capabilities: string[];
}
export interface XRSessionConfig {
  mode: 'immersive-ar' | 'immersive-vr' | 'inline';
  features: string[];
}
export interface SpatialPanel {
  id: string;
  position: { x: number; y: number; z: number };
  size: { w: number; h: number };
  anchor: 'room' | 'head' | 'hand';
}
export interface HandGesture {
  type: 'pinch' | 'grab' | 'point' | 'swipe';
  confidence: number;
  hand: 'left' | 'right';
}
