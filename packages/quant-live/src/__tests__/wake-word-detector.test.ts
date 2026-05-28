import { describe, it, expect, vi } from 'vitest';
import { WakeWordDetector } from '../wake-word/wake-word-detector.js';
import type { WakeWordEngine, WakeWordEvent } from '../types.js';

function createMockEngine(): WakeWordEngine & { trigger: (e: WakeWordEvent) => void } {
  let cb: ((e: WakeWordEvent) => void) | null = null;
  return {
    init: vi.fn().mockResolvedValue(undefined),
    feedAudio: vi.fn(),
    onDetection(callback) {
      cb = callback;
      return () => {
        cb = null;
      };
    },
    destroy: vi.fn(),
    trigger(event: WakeWordEvent) {
      cb?.(event);
    },
  };
}

describe('WakeWordDetector', () => {
  it('fires detection callback when engine detects wake word', async () => {
    const detector = new WakeWordDetector();
    const engine = createMockEngine();
    detector.setEngine(engine);

    const handler = vi.fn();
    detector.onDetected(handler);
    await detector.start();

    const event: WakeWordEvent = {
      type: 'detected',
      timestamp: 1000,
      confidence: 0.9,
      phrase: 'Hey Quant',
    };
    engine.trigger(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('filters out low-confidence detections', async () => {
    const detector = new WakeWordDetector({ sensitivity: 0.8 });
    const engine = createMockEngine();
    detector.setEngine(engine);

    const handler = vi.fn();
    detector.onDetected(handler);
    await detector.start();

    engine.trigger({ type: 'detected', timestamp: 1000, confidence: 0.5, phrase: 'Hey Quant' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('enters fallback mode when no engine is set', async () => {
    const detector = new WakeWordDetector();
    await detector.start();

    expect(detector.isListening()).toBe(false);
    expect(detector.isFallbackMode()).toBe(true);
  });

  it('manages start/stop lifecycle', async () => {
    const detector = new WakeWordDetector();
    const engine = createMockEngine();
    detector.setEngine(engine);

    await detector.start();
    expect(detector.isListening()).toBe(true);

    detector.stop();
    expect(detector.isListening()).toBe(false);
    expect(engine.destroy).toHaveBeenCalled();
  });

  it('returns default config', () => {
    const detector = new WakeWordDetector();
    const config = detector.getConfig();
    expect(config.wakePhrase).toBe('Hey Quant');
    expect(config.sensitivity).toBe(0.7);
    expect(config.engineType).toBe('energy-fallback');
  });

  it('unsubscribes detection callback', async () => {
    const detector = new WakeWordDetector();
    const engine = createMockEngine();
    detector.setEngine(engine);

    const handler = vi.fn();
    const unsub = detector.onDetected(handler);
    await detector.start();

    unsub();
    engine.trigger({ type: 'detected', timestamp: 1000, confidence: 0.9, phrase: 'Hey Quant' });
    expect(handler).not.toHaveBeenCalled();
  });
});
