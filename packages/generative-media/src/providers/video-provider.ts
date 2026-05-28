import type { GenerationResult, VideoOptions } from '../types.js';

export interface VideoProvider {
  readonly id: string;
  readonly name: string;
  generate(prompt: string, options?: VideoOptions): Promise<GenerationResult>;
}

function makeResult(provider: string, prompt: string): GenerationResult {
  return {
    uri: `https://cdn.quant.app/gen/${provider}/${Date.now()}.mp4`,
    mediaType: 'video',
    provider,
    cost: 0.1,
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

export class OpenSoraProvider implements VideoProvider {
  readonly id = 'opensora';
  readonly name = 'Open-Sora';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}

export class RunwayProvider implements VideoProvider {
  readonly id = 'runway';
  readonly name = 'Runway';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}
