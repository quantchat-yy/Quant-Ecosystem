import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter } from '../core/model-router';
import { CircuitBreakerRegistry } from '../core/circuit-breaker';
import type { AIInferenceRequest } from '../types';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
  });

  describe('selectModel', () => {
    it('selects a specific model when requested', () => {
      const request: AIInferenceRequest = {
        prompt: 'Hello world',
        model: 'gpt-4o-mini',
        userId: 'user1',
        app: 'quantchat',
        feature: 'test',
      };
      const model = router.selectModel(request);
      expect(model.id).toBe('gpt-4o-mini');
    });

    it('routes code tasks to code-capable models', () => {
      const request: AIInferenceRequest = {
        prompt: 'Write a function to sort an array',
        userId: 'user1',
        app: 'quantchat',
        feature: 'code',
      };
      const model = router.selectModel(request);
      expect(model.capabilities).toContain('code_generation');
    });

    it('routes summarization tasks appropriately', () => {
      const request: AIInferenceRequest = {
        prompt: 'Summarize this document',
        userId: 'user1',
        app: 'quantmail',
        feature: 'summary',
      };
      const model = router.selectModel(request);
      expect(model.capabilities).toContain('text_summarization');
    });

    it('routes general text tasks', () => {
      const request: AIInferenceRequest = {
        prompt: 'Hello, how are you?',
        userId: 'user1',
        app: 'quantchat',
        feature: 'chat',
      };
      const model = router.selectModel(request);
      expect(model.capabilities).toContain('text_generation');
    });

    it('falls back to default when model not found', () => {
      const request: AIInferenceRequest = {
        prompt: 'test',
        model: 'nonexistent-model',
        userId: 'user1',
        app: 'quantchat',
        feature: 'test',
      };
      const model = router.selectModel(request);
      expect(model).toBeDefined();
      expect(model.id).toBeDefined();
    });
  });

  describe('model registration', () => {
    it('registers default models', () => {
      const models = router.getModels();
      expect(models.length).toBeGreaterThanOrEqual(4);
      const ids = models.map((m) => m.id);
      expect(ids).toContain('gpt-4o');
      expect(ids).toContain('gpt-4o-mini');
      expect(ids).toContain('claude-3-5-sonnet');
      expect(ids).toContain('claude-3-5-haiku');
    });

    it('allows registering custom models', () => {
      router.registerModel({
        id: 'custom-model',
        name: 'Custom Model',
        provider: 'openai',
        capabilities: ['text_generation'],
        maxContextLength: 4000,
        maxOutputTokens: 1000,
        costPerInputToken: 0.001,
        costPerOutputToken: 0.002,
        latencyMs: 100,
        qualityScore: 0.5,
      });
      const models = router.getModels();
      expect(models.find((m) => m.id === 'custom-model')).toBeDefined();
    });
  });

  describe('getModelsByCapability', () => {
    it('returns models with text generation', () => {
      const models = router.getModelsByCapability('text_generation');
      expect(models.length).toBeGreaterThanOrEqual(4);
    });

    it('returns models with code generation', () => {
      const models = router.getModelsByCapability('code_generation');
      expect(models.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty for unsupported capabilities', () => {
      const models = router.getModelsByCapability('image_generation');
      expect(models).toHaveLength(0);
    });
  });

  describe('fallback chain', () => {
    it('returns default fallback chain for text generation', () => {
      const chain = router.getFallbackChain('text_generation');
      expect(chain).toEqual(['gpt-4o', 'gpt-4o-mini', 'claude-3-5-haiku']);
    });

    it('returns code fallback chain', () => {
      const chain = router.getFallbackChain('code_generation');
      expect(chain).toEqual(['gpt-4o', 'claude-3-5-sonnet', 'gpt-4o-mini']);
    });

    it('returns default chain for unknown capabilities', () => {
      const chain = router.getFallbackChain('embedding');
      expect(chain).toEqual(['gpt-4o', 'gpt-4o-mini', 'claude-3-5-haiku']);
    });
  });

  describe('circuit breaker integration', () => {
    it('skips unavailable models when circuit breaker is open', async () => {
      const registry = new CircuitBreakerRegistry({ failureThreshold: 1 });
      const routerWithCb = new ModelRouter(registry);

      // Trip the openai breaker
      const breaker = registry.getBreaker('openai');
      try {
        await breaker.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        /* expected */
      }

      const request: AIInferenceRequest = {
        prompt: 'test prompt',
        userId: 'user1',
        app: 'quantchat',
        feature: 'test',
      };

      const model = routerWithCb.selectModel(request);
      // Should select an anthropic model since openai is down
      expect(model.provider).toBe('anthropic');
    });
  });
});
