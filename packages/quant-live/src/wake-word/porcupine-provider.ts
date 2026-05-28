import type { WakeWordConfig, WakeWordEngine, WakeWordEvent } from '../types.js';

type DetectionCallback = (event: WakeWordEvent) => void;
type Unsubscribe = () => void;

export class PorcupineProvider implements WakeWordEngine {
  private callbacks: DetectionCallback[] = [];
  private config: WakeWordConfig | null = null;
  private initialized = false;

  async init(config: WakeWordConfig): Promise<void> {
    if (!config.accessKey) {
      throw new Error('Porcupine requires an accessKey');
    }
    this.config = config;
    this.initialized = true;
  }

  feedAudio(samples: Float32Array): void {
    if (!this.initialized || !this.config) return;
    // Simulate frame processing - real implementation would use Porcupine SDK
    const energy = samples.reduce((sum, s) => sum + Math.abs(s), 0) / samples.length;
    if (energy > 0.8) {
      const event: WakeWordEvent = {
        type: 'detected',
        timestamp: Date.now(),
        confidence: Math.min(energy, 1.0),
        phrase: this.config.wakePhrase,
      };
      for (const cb of this.callbacks) cb(event);
    }
  }

  onDetection(cb: DetectionCallback): Unsubscribe {
    this.callbacks.push(cb);
    return () => {
      const idx = this.callbacks.indexOf(cb);
      if (idx >= 0) this.callbacks.splice(idx, 1);
    };
  }

  destroy(): void {
    this.callbacks = [];
    this.initialized = false;
    this.config = null;
  }
}

export class EnergyBasedFallback implements WakeWordEngine {
  private callbacks: DetectionCallback[] = [];
  private config: WakeWordConfig | null = null;
  private initialized = false;
  private sustainedCount = 0;
  private readonly sustainedThreshold = 3;
  private readonly energyThreshold = 0.5;

  async init(config: WakeWordConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    this.sustainedCount = 0;
  }

  feedAudio(samples: Float32Array): void {
    if (!this.initialized || !this.config) return;
    const energy = samples.reduce((sum, s) => sum + Math.abs(s), 0) / samples.length;
    if (energy > this.energyThreshold) {
      this.sustainedCount++;
    } else {
      this.sustainedCount = 0;
    }
    if (this.sustainedCount >= this.sustainedThreshold) {
      const event: WakeWordEvent = {
        type: 'detected',
        timestamp: Date.now(),
        confidence: Math.min(energy, 1.0),
        phrase: this.config.wakePhrase,
      };
      for (const cb of this.callbacks) cb(event);
      this.sustainedCount = 0;
    }
  }

  onDetection(cb: DetectionCallback): Unsubscribe {
    this.callbacks.push(cb);
    return () => {
      const idx = this.callbacks.indexOf(cb);
      if (idx >= 0) this.callbacks.splice(idx, 1);
    };
  }

  destroy(): void {
    this.callbacks = [];
    this.initialized = false;
    this.config = null;
    this.sustainedCount = 0;
  }
}
