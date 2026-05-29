import type { DisplayInfo, ARPassthroughConfig } from '../types.js';

export type GlassesProfile = 'meta-rayban' | 'xreal' | 'vision-pro';

interface GlassesProfileConfig {
  name: string;
  displayWidth: number;
  displayHeight: number;
  refreshRate: number;
  fieldOfView: number;
  hasCamera: boolean;
}

const PROFILES: Record<GlassesProfile, GlassesProfileConfig> = {
  'meta-rayban': {
    name: 'Meta Ray-Ban',
    displayWidth: 1280,
    displayHeight: 720,
    refreshRate: 60,
    fieldOfView: 30,
    hasCamera: true,
  },
  xreal: {
    name: 'Xreal Air',
    displayWidth: 1920,
    displayHeight: 1080,
    refreshRate: 90,
    fieldOfView: 46,
    hasCamera: false,
  },
  'vision-pro': {
    name: 'Apple Vision Pro',
    displayWidth: 3660,
    displayHeight: 3200,
    refreshRate: 120,
    fieldOfView: 100,
    hasCamera: true,
  },
};

export class GlassesAdapter {
  private connected = false;
  private deviceId: string | null = null;
  private profile: GlassesProfile = 'meta-rayban';
  private cameraActive = false;

  setProfile(profile: GlassesProfile): void {
    this.profile = profile;
  }

  async connect(id: string): Promise<void> {
    this.deviceId = id;
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.deviceId = null;
    this.connected = false;
    this.cameraActive = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  getDisplayInfo(): DisplayInfo {
    const config = PROFILES[this.profile];
    return {
      width: config.displayWidth,
      height: config.displayHeight,
      refreshRate: config.refreshRate,
      fieldOfView: config.fieldOfView,
    };
  }

  async startCamera(): Promise<boolean> {
    const config = PROFILES[this.profile];
    if (!config.hasCamera) {
      return false;
    }
    this.cameraActive = true;
    return true;
  }

  async stopCamera(): Promise<void> {
    this.cameraActive = false;
  }

  isCameraActive(): boolean {
    return this.cameraActive;
  }

  getPassthrough(): ARPassthroughConfig | null {
    if (!this.connected) return null;
    const config = PROFILES[this.profile];
    return {
      resolution: { width: config.displayWidth, height: config.displayHeight },
      frameRate: config.refreshRate,
      overlayMode: 'passthrough',
      anchoredObjects: [],
    };
  }
}
