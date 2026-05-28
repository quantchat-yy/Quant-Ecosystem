import type { EditResult } from '../types.js';
import type { BestTakeEditor } from './editor-types.js';
import type { InferenceRuntime } from './inference-runtime.js';
import type { FaceDetector } from '../ai/face-engine.js';

export class BestTakePipeline implements BestTakeEditor {
  constructor(
    private runtime: InferenceRuntime,
    private faceDetector: FaceDetector,
  ) {}

  async selectBest(burstUris: string[]): Promise<EditResult> {
    if (burstUris.length < 2) {
      return { success: false, error: 'At least 2 burst photos are required' };
    }

    let bestUri = burstUris[0]!;
    let bestScore = -1;

    for (let i = 0; i < burstUris.length; i++) {
      const uri = burstUris[i]!;
      const faces = await this.faceDetector.detect(uri);
      const score = this.scoreFaces(faces.length, i, uri);
      if (score > bestScore) {
        bestScore = score;
        bestUri = uri;
      }
    }

    const input = { data: new Float32Array(4), shape: [1, 1, 2, 2] };
    await this.runtime.run('composite', input);
    return { success: true, outputUri: bestUri };
  }

  private scoreFaces(faceCount: number, index: number, uri: string): number {
    // Mock scoring: combine face count, index position, and URI hash
    const hash = uri.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const sharpness = (hash % 100) / 100;
    const exposure = (((index + 1) * 17) % 100) / 100;
    const eyesOpen = faceCount > 0 ? 0.8 : 0.3;
    return sharpness + exposure + eyesOpen;
  }
}
