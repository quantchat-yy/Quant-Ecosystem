import { AIService } from '@quant/ai/services/ai.service';
import { ModelRouter } from '@quant/ai/core/model-router';

export class AIEngine {
  private aiService: AIService;
  private modelRouter: ModelRouter;

  constructor() {
    this.modelRouter = new ModelRouter({
      defaultModel: 'gpt-4o',
      providers: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          models: ['claude-3-5-sonnet', 'claude-3-opus'],
        },
        // Add more providers as needed
      },
      routingStrategy: 'cost-optimized', // or 'quality-first', 'latency-first'
    });

    this.aiService = new AIService(this.modelRouter);
  }

  async chat(messages: any[], options: any = {}) {
    return this.aiService.chat(messages, {
      model: options.model || 'gpt-4o',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
      ...options,
    });
  }

  async streamChat(messages: any[], options: any = {}) {
    return this.aiService.streamChat(messages, {
      model: options.model || 'gpt-4o',
      temperature: options.temperature || 0.7,
      ...options,
    });
  }

  async getAvailableModels() {
    return this.modelRouter.getAvailableModels();
  }
}
