import type { ARPassthroughConfig, ARFrame, AnchoredObject } from '../types.js';

export class PassthroughBridge {
  private config: ARPassthroughConfig | null = null;
  private capturing = false;
  private overlays: Map<string, AnchoredObject> = new Map();

  initialize(config: ARPassthroughConfig): void {
    this.config = config;
    for (const obj of config.anchoredObjects) {
      this.overlays.set(obj.id, obj);
    }
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  async startCapture(): Promise<boolean> {
    if (!this.config) return false;
    this.capturing = true;
    return true;
  }

  async stopCapture(): Promise<void> {
    this.capturing = false;
  }

  isCapturing(): boolean {
    return this.capturing;
  }

  addOverlay(overlay: AnchoredObject): void {
    this.overlays.set(overlay.id, overlay);
  }

  removeOverlay(id: string): boolean {
    return this.overlays.delete(id);
  }

  getOverlays(): AnchoredObject[] {
    return Array.from(this.overlays.values());
  }

  getFrame(): ARFrame | null {
    if (!this.capturing || !this.config) return null;
    return {
      timestamp: Date.now(),
      resolution: this.config.resolution,
      overlays: Array.from(this.overlays.keys()),
    };
  }

  getConfig(): ARPassthroughConfig | null {
    return this.config;
  }
}
