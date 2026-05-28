import type { WakeWordConfig, WakeWordEngine, WakeWordEvent } from '../types.js';

type DetectionCallback = (event: WakeWordEvent) => void;
type Unsubscribe = () => void;

const DEFAULT_CONFIG: WakeWordConfig = {
  wakePhrase: 'Hey Quant',
  sensitivity: 0.7,
  engineType: 'energy-fallback',
  fallbackToPushToTalk: true,
};

export class WakeWordDetector {
  private config: WakeWordConfig;
  private engine: WakeWordEngine | null = null;
  private callbacks: DetectionCallback[] = [];
  private listening = false;
  private fallbackMode = false;

  constructor(config?: Partial<WakeWordConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setEngine(engine: WakeWordEngine): void {
    this.engine = engine;
  }

  async start(): Promise<void> {
    if (this.listening) return;
    if (!this.engine) {
      this.fallbackMode = this.config.fallbackToPushToTalk;
      return;
    }
    await this.engine.init(this.config);
    this.engine.onDetection((event) => {
      if (event.confidence >= this.config.sensitivity) {
        for (const cb of this.callbacks) cb(event);
      }
    });
    this.listening = true;
  }

  stop(): void {
    if (this.engine && this.listening) {
      this.engine.destroy();
    }
    this.listening = false;
    this.fallbackMode = false;
  }

  feedAudio(samples: Float32Array): void {
    if (this.engine && this.listening) {
      this.engine.feedAudio(samples);
    }
  }

  onDetected(cb: DetectionCallback): Unsubscribe {
    this.callbacks.push(cb);
    return () => {
      const idx = this.callbacks.indexOf(cb);
      if (idx >= 0) this.callbacks.splice(idx, 1);
    };
  }

  isListening(): boolean {
    return this.listening;
  }

  isFallbackMode(): boolean {
    return this.fallbackMode;
  }

  getConfig(): WakeWordConfig {
    return { ...this.config };
  }
}
