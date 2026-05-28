import type {
  CostEstimate,
  GenerationRequest,
  ImageOptions,
  MusicOptions,
  ProviderConfig,
  VideoOptions,
} from '../types.js';

export class CostEstimator {
  private budgets = new Map<string, number>();

  setBudget(userId: string, amount: number): void {
    this.budgets.set(userId, amount);
  }

  estimate(request: GenerationRequest, provider: ProviderConfig): CostEstimate {
    const breakdown: { item: string; cost: number }[] = [];
    let total = provider.costPerUnit;

    breakdown.push({ item: 'base_generation', cost: provider.costPerUnit });

    if (request.mediaType === 'video' && request.options) {
      const opts = request.options as VideoOptions;
      if ('duration' in opts) {
        const multiplier = opts.duration / 5;
        const extra = provider.costPerUnit * (multiplier - 1);
        total += extra;
        breakdown.push({ item: 'duration_multiplier', cost: extra });
      }
    } else if (request.mediaType === 'image' && request.options) {
      const opts = request.options as ImageOptions;
      if ('width' in opts && 'height' in opts && (opts.width > 1024 || opts.height > 1024)) {
        const extra = provider.costPerUnit * 0.5;
        total += extra;
        breakdown.push({ item: 'high_resolution', cost: extra });
      }
    } else if (request.mediaType === 'music' && request.options) {
      const opts = request.options as MusicOptions;
      if ('duration' in opts && opts.duration > 30) {
        const extra = provider.costPerUnit * (opts.duration / 30 - 1);
        total += extra;
        breakdown.push({ item: 'extended_duration', cost: extra });
      }
    }

    return { provider: provider.id, estimatedCost: total, currency: 'USD', breakdown };
  }

  checkBudget(userId: string, cost: number): boolean {
    const budget = this.budgets.get(userId);
    if (budget == null) return true;
    return cost <= budget;
  }
}
