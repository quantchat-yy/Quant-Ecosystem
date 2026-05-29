import type { GenerationResult, Modality, ModalityTransform } from '../types.js';

export interface ModalityTransformProvider {
  readonly id: string;
  readonly source: Modality;
  readonly target: Modality;
  transform(input: string, options?: Record<string, unknown>): Promise<GenerationResult>;
}

export class ModalityRouter {
  private providers = new Map<string, ModalityTransformProvider>();

  register(provider: ModalityTransformProvider): void {
    const key = `${provider.source}->${provider.target}`;
    this.providers.set(key, provider);
  }

  route(source: Modality, target: Modality): ModalityTransformProvider | null {
    const key = `${source}->${target}`;
    return this.providers.get(key) ?? null;
  }

  async transform(
    source: Modality,
    target: Modality,
    input: string,
    options?: Record<string, unknown>,
  ): Promise<GenerationResult | null> {
    const provider = this.route(source, target);
    if (!provider) return null;
    return provider.transform(input, options);
  }

  getSupportedTransforms(): ModalityTransform[] {
    const transforms: ModalityTransform[] = [];
    for (const [key, provider] of this.providers) {
      const [source, target] = key.split('->') as [Modality, Modality];
      transforms.push({ source, target, providerId: provider.id });
    }
    return transforms;
  }

  supportsTransform(source: Modality, target: Modality): boolean {
    return this.providers.has(`${source}->${target}`);
  }
}
