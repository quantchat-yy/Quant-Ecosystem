import type { GenerationRequest, MediaType, ProviderConfig } from '../types.js';

export class MediaRouter {
  constructor(private providers: ProviderConfig[]) {}

  route(request: GenerationRequest): ProviderConfig | null {
    const candidates = this.providers
      .filter((p) => p.mediaType === request.mediaType && p.available)
      .filter((p) => (request.maxBudget == null ? true : p.costPerUnit <= request.maxBudget))
      .sort((a, b) => {
        if (a.priority === 'self-hosted' && b.priority !== 'self-hosted') return -1;
        if (b.priority === 'self-hosted' && a.priority !== 'self-hosted') return 1;
        return a.costPerUnit - b.costPerUnit;
      });
    return candidates[0] ?? null;
  }

  getAvailableProviders(mediaType: MediaType): ProviderConfig[] {
    return this.providers
      .filter((p) => p.mediaType === mediaType && p.available)
      .sort((a, b) => {
        if (a.priority === 'self-hosted' && b.priority !== 'self-hosted') return -1;
        if (b.priority === 'self-hosted' && a.priority !== 'self-hosted') return 1;
        return a.costPerUnit - b.costPerUnit;
      });
  }

  fallback(request: GenerationRequest, excludeId: string): ProviderConfig | null {
    const candidates = this.providers
      .filter((p) => p.id !== excludeId && p.mediaType === request.mediaType && p.available)
      .filter((p) => (request.maxBudget == null ? true : p.costPerUnit <= request.maxBudget))
      .sort((a, b) => {
        if (a.priority === 'self-hosted' && b.priority !== 'self-hosted') return -1;
        if (b.priority === 'self-hosted' && a.priority !== 'self-hosted') return 1;
        return a.costPerUnit - b.costPerUnit;
      });
    return candidates[0] ?? null;
  }
}
