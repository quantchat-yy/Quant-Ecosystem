import type { GenerationResult, ImageOptions } from '../types.js';

export interface ImageProvider {
  readonly id: string;
  readonly name: string;
  generate(prompt: string, options?: ImageOptions): Promise<GenerationResult>;
}

function makeResult(provider: string, prompt: string): GenerationResult {
  return {
    uri: `https://cdn.quant.app/gen/${provider}/${Date.now()}.png`,
    mediaType: 'image',
    provider,
    cost: 0.02,
    provenance: {
      assetId: crypto.randomUUID(),
      model: provider,
      prompt,
      timestamp: Date.now(),
      userId: 'system',
      signature: 'mock-sig',
    },
    metadata: {},
  };
}

export class StableDiffusion3Provider implements ImageProvider {
  readonly id = 'sd3';
  readonly name = 'Stable Diffusion 3';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}

export class FLUXProvider implements ImageProvider {
  readonly id = 'flux';
  readonly name = 'FLUX';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}

export class ReplicateProvider implements ImageProvider {
  readonly id = 'replicate';
  readonly name = 'Replicate';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}

export class FalAIProvider implements ImageProvider {
  readonly id = 'fal-ai';
  readonly name = 'Fal AI';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}
