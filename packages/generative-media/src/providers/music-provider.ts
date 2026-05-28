import type { GenerationResult, MusicOptions } from '../types.js';

export interface MusicProvider {
  readonly id: string;
  readonly name: string;
  generate(prompt: string, options?: MusicOptions): Promise<GenerationResult>;
}

function makeResult(provider: string, prompt: string): GenerationResult {
  return {
    uri: `https://cdn.quant.app/gen/${provider}/${Date.now()}.mp3`,
    mediaType: 'music',
    provider,
    cost: 0.05,
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

export class MusicGenProvider implements MusicProvider {
  readonly id = 'musicgen';
  readonly name = 'MusicGen';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}

export class StableAudioProvider implements MusicProvider {
  readonly id = 'stable-audio';
  readonly name = 'Stable Audio';
  async generate(prompt: string): Promise<GenerationResult> {
    return makeResult(this.id, prompt);
  }
}
