import { Agent } from '../core/agent';
import { UnifiedAIService } from '@quant/ai';

export class QuantAIAgent extends Agent {
  private aiService: UnifiedAIService;

  constructor(aiService?: UnifiedAIService) {
    super({
      id: 'quantai-agent',
      name: 'QuantAI Agent',
      personality: 'Intelligent, multi-model, reasoning-focused AI assistant',
      capabilities: [
        'multi_model_chat',
        'reasoning',
        'tool_use',
        'web_search',
        'code_generation',
        'analysis',
      ],
    });

    this.aiService = aiService ?? new UnifiedAIService();

    this.registerAITools();
  }

  private registerAITools() {
    this.addTool({
      name: 'quantai_chat',
      description: 'Chat with multi-model AI',
      parameters: {
        message: 'string',
        model: 'string',
        temperature: 'number',
      },
      execute: async (params: any) => {
        console.log('[QuantAIAgent] Processing chat:', params);
        const result = await this.aiService.generateText(params.message, {
          model: params.model,
          temperature: params.temperature,
        });
        return {
          response: result.content,
          model: result.model,
        };
      },
    });

    this.addTool({
      name: 'quantai_reason',
      description: 'Perform complex reasoning',
      parameters: {
        problem: 'string',
        context: 'object',
      },
      execute: async (params: any) => {
        return {
          reasoning: 'Step-by-step reasoning would go here',
          conclusion: 'Final conclusion based on reasoning',
        };
      },
    });
  }
}
