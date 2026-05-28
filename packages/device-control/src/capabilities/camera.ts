import type { CapabilityProvider } from './types.js';

export interface CameraCapability extends CapabilityProvider<'camera'> {
  takePhoto(): Promise<{ uri: string; width: number; height: number }>;
  recordVideo(maxDuration?: number): Promise<{ uri: string; duration: number }>;
  scanQR(): Promise<string>;
  scanDocument(): Promise<{ uri: string; pages: number }>;
}
