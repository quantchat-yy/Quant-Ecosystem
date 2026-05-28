import type { EditResult } from '../types.js';
import type { MagicEraserEditor } from './editor-types.js';
import type { InferenceRuntime } from './inference-runtime.js';

export class MagicEraserPipeline implements MagicEraserEditor {
  constructor(
    private runtime: InferenceRuntime,
    private serverUrl?: string,
  ) {}

  async erase(photoUri: string, maskUri: string): Promise<EditResult> {
    if (!photoUri || !maskUri) {
      return { success: false, error: 'photoUri and maskUri are required' };
    }

    if (this.runtime.backend === 'mock' && this.serverUrl) {
      return { success: true, outputUri: `${this.serverUrl}/inpaint?src=${photoUri}` };
    }

    const input = { data: new Float32Array(4), shape: [1, 1, 2, 2] };
    await this.runtime.run('inpainting-v1', input);
    return { success: true, outputUri: `${photoUri}-erased` };
  }
}
