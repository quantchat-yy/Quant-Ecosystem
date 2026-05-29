import type { TrackingData } from '../types.js';

export type HeadsetProfile = 'quest' | 'vision-pro';

interface HeadsetProfileConfig {
  name: string;
  degreesOfFreedom: 6;
  handTracking: boolean;
  eyeTracking: boolean;
  passthrough: boolean;
}

const PROFILES: Record<HeadsetProfile, HeadsetProfileConfig> = {
  quest: {
    name: 'Meta Quest',
    degreesOfFreedom: 6,
    handTracking: true,
    eyeTracking: true,
    passthrough: true,
  },
  'vision-pro': {
    name: 'Apple Vision Pro',
    degreesOfFreedom: 6,
    handTracking: true,
    eyeTracking: true,
    passthrough: true,
  },
};

export class HeadsetAdapter {
  private connected = false;
  private profile: HeadsetProfile = 'quest';
  private immersive = false;

  setProfile(profile: HeadsetProfile): void {
    this.profile = profile;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.immersive = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getTrackingData(): TrackingData | null {
    if (!this.connected) return null;
    return {
      position: { x: 0, y: 1.6, z: 0 },
      rotation: { pitch: 0, yaw: 0, roll: 0 },
      timestamp: Date.now(),
    };
  }

  async startImmersive(): Promise<void> {
    this.immersive = true;
  }

  async stopImmersive(): Promise<void> {
    this.immersive = false;
  }

  isImmersive(): boolean {
    return this.immersive;
  }

  getProfile(): HeadsetProfileConfig {
    return PROFILES[this.profile];
  }
}
