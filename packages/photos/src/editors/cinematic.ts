import type { EditResult } from '../types.js';
import type { CinematicEditor } from './editor-types.js';
import type { InferenceRuntime } from './inference-runtime.js';

export interface CinematicConfig {
  focusDistance: number;
  apertureStrength: number;
}

export class CinematicPipeline implements CinematicEditor {
  private config: CinematicConfig;

  constructor(
    private runtime: InferenceRuntime,
    config?: Partial<CinematicConfig>,
  ) {
    this.config = {
      focusDistance: Math.max(0, Math.min(1, config?.focusDistance ?? 0.5)),
      apertureStrength: Math.max(0, Math.min(1, config?.apertureStrength ?? 0.7)),
    };
  }

  async applyBokeh(photoUri: string, depthMapUri?: string): Promise<EditResult> {
    if (!photoUri) {
      return { success: false, error: 'photoUri is required' };
    }

    let resolvedDepthMap = depthMapUri;
    if (!resolvedDepthMap) {
      const input = { data: new Float32Array(4), shape: [1, 1, 2, 2] };
      await this.runtime.run('midas-depth', input);
      resolvedDepthMap = `${photoUri}-depth`;
    }

    const input = { data: new Float32Array(4), shape: [1, 1, 2, 2] };
    await this.runtime.run('bokeh-render', input);
    return {
      success: true,
      outputUri: `${photoUri}-cinematic-f${this.config.focusDistance}-a${this.config.apertureStrength}`,
    };
  }
}
