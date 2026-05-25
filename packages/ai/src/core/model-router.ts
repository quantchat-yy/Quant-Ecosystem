// ============================================================================
// AI Core - Model Router
// ============================================================================

import type { AIModelConfig, AIInferenceRequest, AICapability, FallbackChain } from '../types';
import type { CircuitBreakerRegistry } from './circuit-breaker';

/**
 * Model Router
 *
 * Intelligently routes AI requests to the most appropriate model based on:
 * - Request type and required capabilities
 * - Cost constraints
 * - Latency requirements
 * - Model availability and load
 * - Quality requirements
 * - Circuit breaker state
 */
export class ModelRouter {
  private models: Map<string, AIModelConfig> = new Map();
  private modelLoad: Map<string, number> = new Map();
  private fallbackChains: FallbackChain[] = [];
  private circuitBreakerRegistry: CircuitBreakerRegistry | null = null;

  constructor(circuitBreakerRegistry?: CircuitBreakerRegistry) {
    this.circuitBreakerRegistry = circuitBreakerRegistry ?? null;
    this.registerDefaultModels();
    this.registerDefaultFallbackChains();
  }

  /**
   * Select the best model for a given request
   */
  selectModel(request: AIInferenceRequest): AIModelConfig {
    // If specific model requested, use it
    if (request.model) {
      const model = this.models.get(request.model);
      if (model && this.isModelAvailable(model)) return model;
    }

    // Determine required capabilities from the request
    const capabilities = this.inferCapabilities(request);

    // Find eligible models
    const eligible = this.getEligibleModels(capabilities, request);

    if (eligible.length === 0) {
      // Use fallback chain
      const fallback = this.getFallbackModel(capabilities);
      if (fallback) return fallback;
      // Ultimate fallback to default model
      const defaultModel = this.models.get('gpt-4o-mini');
      if (!defaultModel) {
        throw new Error('No models available');
      }
      return defaultModel;
    }

    // Score and rank models
    const scored = eligible.map((model) => ({
      model,
      score: this.scoreModel(model, request),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0]!.model;
  }

  /**
   * Get fallback chain for a capability
   */
  getFallbackChain(capability: AICapability): string[] {
    const chain = this.fallbackChains.find((fc) => fc.capability === capability);
    if (!chain) return ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-haiku'];
    return chain.models;
  }

  /**
   * Register a new model
   */
  registerModel(config: AIModelConfig): void {
    this.models.set(config.id, config);
    this.modelLoad.set(config.id, 0);
  }

  /**
   * Get all registered models
   */
  getModels(): AIModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by capability
   */
  getModelsByCapability(capability: AICapability): AIModelConfig[] {
    return Array.from(this.models.values()).filter((m) => m.capabilities.includes(capability));
  }

  /**
   * Check if a model is available based on circuit breaker state
   */
  private isModelAvailable(model: AIModelConfig): boolean {
    if (!this.circuitBreakerRegistry) return true;
    const breaker = this.circuitBreakerRegistry.getBreaker(model.provider);
    return breaker.isAvailable();
  }

  /**
   * Get a fallback model from the fallback chains
   */
  private getFallbackModel(capabilities: AICapability[]): AIModelConfig | null {
    const primaryCapability = capabilities[0] || 'text_generation';
    const chain = this.getFallbackChain(primaryCapability);

    for (const modelId of chain) {
      const model = this.models.get(modelId);
      if (model && this.isModelAvailable(model)) {
        return model;
      }
    }

    return null;
  }

  /**
   * Infer required capabilities from a request
   */
  private inferCapabilities(request: AIInferenceRequest): AICapability[] {
    const capabilities: AICapability[] = ['text_generation'];
    const promptLower = request.prompt.toLowerCase();

    if (promptLower.includes('summarize') || promptLower.includes('summary')) {
      capabilities.push('text_summarization');
    }
    if (
      promptLower.includes('code') ||
      promptLower.includes('function') ||
      promptLower.includes('implement')
    ) {
      capabilities.push('code_generation');
    }
    if (promptLower.includes('translate') || promptLower.includes('translation')) {
      capabilities.push('translation');
    }
    if (
      promptLower.includes('moderate') ||
      promptLower.includes('safe') ||
      promptLower.includes('appropriate')
    ) {
      capabilities.push('content_moderation');
    }
    if (promptLower.includes('recommend') || promptLower.includes('suggest')) {
      capabilities.push('recommendation');
    }
    if (
      promptLower.includes('sentiment') ||
      promptLower.includes('feeling') ||
      promptLower.includes('emotion')
    ) {
      capabilities.push('sentiment_analysis');
    }
    if (request.feature === 'device_control') {
      capabilities.push('device_control');
    }

    return capabilities;
  }

  /**
   * Get models that support all required capabilities
   */
  private getEligibleModels(
    capabilities: AICapability[],
    request: AIInferenceRequest,
  ): AIModelConfig[] {
    return Array.from(this.models.values()).filter((model) => {
      // Check circuit breaker state
      if (!this.isModelAvailable(model)) return false;

      // Check capabilities
      const hasCapabilities = capabilities.every((cap) => model.capabilities.includes(cap));
      if (!hasCapabilities) return false;

      // Check context length
      const estimatedTokens = Math.ceil(request.prompt.length / 4);
      if (estimatedTokens > model.maxContextLength) return false;

      return true;
    });
  }

  /**
   * Score a model for a specific request
   */
  private scoreModel(model: AIModelConfig, request: AIInferenceRequest): number {
    let score = 0;

    // Quality score (0-40 points)
    score += model.qualityScore * 40;

    // Latency preference (0-20 points, lower is better)
    score += Math.max(0, 20 - model.latencyMs / 100);

    // Cost preference (0-20 points, lower is better)
    const estimatedCost = (request.prompt.length / 4) * model.costPerInputToken;
    score += Math.max(0, 20 - estimatedCost * 1000);

    // Load balancing (0-10 points)
    const load = this.modelLoad.get(model.id) || 0;
    score += Math.max(0, 10 - load);

    // Context window fit (0-10 points)
    const utilization = request.prompt.length / 4 / model.maxContextLength;
    score += utilization < 0.8 ? 10 : 5;

    return score;
  }

  /**
   * Register default models available in the ecosystem
   */
  private registerDefaultModels(): void {
    const defaultModels: AIModelConfig[] = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        capabilities: [
          'text_generation',
          'text_summarization',
          'code_generation',
          'translation',
          'sentiment_analysis',
          'content_moderation',
          'recommendation',
          'device_control',
        ],
        maxContextLength: 128000,
        maxOutputTokens: 4096,
        costPerInputToken: 0.000005,
        costPerOutputToken: 0.000015,
        latencyMs: 400,
        qualityScore: 0.95,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        capabilities: [
          'text_generation',
          'text_summarization',
          'code_generation',
          'translation',
          'sentiment_analysis',
          'content_moderation',
        ],
        maxContextLength: 128000,
        maxOutputTokens: 4096,
        costPerInputToken: 0.00000015,
        costPerOutputToken: 0.0000006,
        latencyMs: 200,
        qualityScore: 0.85,
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        capabilities: [
          'text_generation',
          'text_summarization',
          'code_generation',
          'translation',
          'sentiment_analysis',
          'content_moderation',
          'recommendation',
          'device_control',
        ],
        maxContextLength: 200000,
        maxOutputTokens: 4096,
        costPerInputToken: 0.000003,
        costPerOutputToken: 0.000015,
        latencyMs: 500,
        qualityScore: 0.97,
      },
      {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        capabilities: [
          'text_generation',
          'text_summarization',
          'code_generation',
          'translation',
          'sentiment_analysis',
          'content_moderation',
        ],
        maxContextLength: 200000,
        maxOutputTokens: 4096,
        costPerInputToken: 0.000001,
        costPerOutputToken: 0.000005,
        latencyMs: 300,
        qualityScore: 0.88,
      },
    ];

    for (const model of defaultModels) {
      this.registerModel(model);
    }
  }

  /**
   * Register default fallback chains
   */
  private registerDefaultFallbackChains(): void {
    this.fallbackChains = [
      {
        capability: 'text_generation',
        models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-haiku'],
      },
      {
        capability: 'code_generation',
        models: ['gpt-4o', 'claude-3-5-sonnet', 'gpt-4o-mini'],
      },
      {
        capability: 'text_summarization',
        models: ['gpt-4o-mini', 'claude-3-5-haiku', 'gpt-4o'],
      },
      {
        capability: 'content_moderation',
        models: ['gpt-4o-mini', 'claude-3-5-haiku', 'gpt-4o'],
      },
    ];
  }

  /**
   * Update load for a model
   */
  updateLoad(modelId: string, delta: number): void {
    const current = this.modelLoad.get(modelId) || 0;
    this.modelLoad.set(modelId, Math.max(0, current + delta));
  }
}
