import type { EditResult } from '../types.js';
import type { UnblurEditor } from './editor-types.js';
import type { InferenceRuntime } from './inference-runtime.js';

export class UnblurPipeline implements UnblurEditor {
  private scale: 2 | 4;

  constructor(
    private runtime: InferenceRuntime,
    scale: number = 2,
  ) {
    if (scale !== 2 && scale !== 4) {
      throw new Error('Scale factor must be 2 or 4');
    }
    this.scale = scale as 2 | 4;
  }

  async enhance(photoUri: string): Promise<EditResult> {
    if (!photoUri) {
      return { success: false, error: 'photoUri is required' };
    }

    const input = { data: new Float32Array(4), shape: [1, 1, 2, 2] };
    await this.runtime.run(`real-esrgan-x${this.scale}`, input);
    return { success: true, outputUri: `${photoUri}-enhanced-x${this.scale}` };
  }
}
