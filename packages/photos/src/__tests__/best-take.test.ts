import { describe, it, expect } from 'vitest';
import { InferenceRuntime } from '../editors/inference-runtime.js';
import { BestTakePipeline } from '../editors/best-take.js';
import type { FaceDetector } from '../ai/face-engine.js';
import type { Face } from '../types.js';

const bb = { x: 0, y: 0, width: 10, height: 10 };
const mockDetector: FaceDetector = {
  async detect(_uri: string): Promise<Face[]> {
    return [{ id: 'f1', boundingBox: bb, embedding: [1, 0, 0] }];
  },
};

describe('BestTakePipeline', () => {
  it('requires at least 2 burst photos', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const bestTake = new BestTakePipeline(runtime, mockDetector);
    const result = await bestTake.selectBest(['single.jpg']);
    expect(result.success).toBe(false);
    expect(result.error).toContain('At least 2');
  });

  it('selects best from burst', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const bestTake = new BestTakePipeline(runtime, mockDetector);
    const result = await bestTake.selectBest(['a.jpg', 'b.jpg', 'c.jpg']);
    expect(result.success).toBe(true);
    expect(result.outputUri).toBeDefined();
  });

  it('returns a URI from the burst set', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const bestTake = new BestTakePipeline(runtime, mockDetector);
    const uris = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
    const result = await bestTake.selectBest(uris);
    expect(uris).toContain(result.outputUri);
  });
});
