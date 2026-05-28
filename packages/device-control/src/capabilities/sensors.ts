import type { CapabilityProvider } from './types.js';

export interface SensorData {
  x?: number;
  y?: number;
  z?: number;
  value?: number;
  timestamp: number;
}

export interface SensorsCapability extends CapabilityProvider<'sensors'> {
  subscribeAccelerometer(cb: (d: SensorData) => void): () => void;
  subscribeGyroscope(cb: (d: SensorData) => void): () => void;
  subscribeHeartRate(cb: (d: SensorData) => void): () => void;
  subscribeAmbientLight(cb: (d: SensorData) => void): () => void;
}
