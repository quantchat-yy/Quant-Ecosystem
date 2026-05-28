import { CostEstimator } from '../cost/cost-estimator.js';
import type { GenerationRequest, ProviderConfig } from '../types.js';

const provider: ProviderConfig = {
  id: 'sd3',
  name: 'SD3',
  mediaType: 'image',
  priority: 'self-hosted',
  available: true,
  costPerUnit: 0.02,
  selfHosted: true,
};

describe('CostEstimator', () => {
  const estimator = new CostEstimator();

  it('calculates cost based on provider rate', () => {
    const req: GenerationRequest = { prompt: 'a cat', mediaType: 'image' };
    const estimate = estimator.estimate(req, provider);
    expect(estimate.estimatedCost).toBe(0.02);
    expect(estimate.currency).toBe('USD');
  });

  it('budget check passes when sufficient', () => {
    estimator.setBudget('user1', 1.0);
    expect(estimator.checkBudget('user1', 0.5)).toBe(true);
  });

  it('budget check fails when insufficient', () => {
    estimator.setBudget('user2', 0.01);
    expect(estimator.checkBudget('user2', 0.5)).toBe(false);
  });

  it('returns breakdown', () => {
    const req: GenerationRequest = { prompt: 'a cat', mediaType: 'image' };
    const estimate = estimator.estimate(req, provider);
    expect(estimate.breakdown.length).toBeGreaterThan(0);
    expect(estimate.breakdown[0]!.item).toBe('base_generation');
  });
});
