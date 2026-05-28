import { describe, it, expect, vi } from 'vitest';
import { LivePipeline } from '../core/pipeline.js';
import type { ASRProvider, ASRResult, AudioChunk, LiveSession, TTSProvider } from '../types.js';

function mockSession(): LiveSession {
  return {
    id: 'mem-test',
    state: 'listening',
    createdAt: Date.now(),
    config: {
      asrProvider: 'whisper-server',
      vadConfig: { threshold: 0.01, silenceDuration: 500, minSpeechDuration: 100 },
      enableInterruption: true,
      maxSessionDuration: 300000,
      language: 'en',
    },
    transcript: [],
  };
}

function mockASR(): ASRProvider & { triggerResult: (r: ASRResult) => void } {
  let cb: ((r: ASRResult) => void) | null = null;
  return {
    start: vi.fn(),
    stop: vi.fn(),
    feedAudio: vi.fn(),
    onResult(fn) {
      cb = fn;
    },
    onError: vi.fn(),
    triggerResult(r) {
      cb?.(r);
    },
  };
}

function mockTTS(): TTSProvider {
  return {
    isStreaming: true,
    synthesize: vi.fn().mockImplementation(() =>
      (async function* () {
        yield {
          data: new Float32Array(32),
          sampleRate: 16000,
          channels: 1,
          timestamp: 0,
          duration: 2,
        } as AudioChunk;
      })(),
    ),
    stop: vi.fn(),
  };
}

describe('memory-stability', () => {
  it('does not leak memory over 100+ conversation turns', async () => {
    const pipeline = new LivePipeline();
    const provider = mockASR();
    pipeline.setTTSProvider(mockTTS());
    pipeline.start(mockSession(), provider);
    pipeline.onTranscript(() => {});
    pipeline.onAudioOut(() => {});

    const runTurn = async (i: number) => {
      pipeline.feedAudio({
        data: new Float32Array(160),
        sampleRate: 16000,
        channels: 1,
        timestamp: i * 10,
        duration: 10,
      });
      provider.triggerResult({
        segments: [
          {
            id: `s-${i}`,
            speaker: 'user',
            text: `t${i}`,
            startTime: 0,
            endTime: 10,
            confidence: 0.9,
            isFinal: true,
          },
        ],
        isFinal: true,
        latencyMs: 10,
      });
      await pipeline.synthesizeResponse(`R${i}`);
    };

    for (let i = 0; i < 10; i++) await runTurn(i);
    if (global.gc) global.gc();
    const baseline = process.memoryUsage().heapUsed;

    for (let i = 10; i < 110; i++) await runTurn(i);
    if (global.gc) global.gc();
    const delta = process.memoryUsage().heapUsed - baseline;

    expect(delta).toBeLessThan(10 * 1024 * 1024);
    pipeline.stop();
  }, 30000);

  it('does not accumulate state over repeated start/stop cycles', () => {
    const pipeline = new LivePipeline();
    for (let i = 0; i < 50; i++) {
      const provider = mockASR();
      pipeline.start(mockSession(), provider);
      pipeline.feedAudio({
        data: new Float32Array(160),
        sampleRate: 16000,
        channels: 1,
        timestamp: 0,
        duration: 10,
      });
      pipeline.stop();
    }
    expect(pipeline.isRunning()).toBe(false);
    expect(pipeline.isSpeaking()).toBe(false);
  });
});
