import { AIEngine as CoreAIEngine } from '@quant/ai';
import type {
  AIEngineInterface,
  AIInferenceRequest,
  AIInferenceResponse,
  StreamChunk,
} from './chat.service';

export class AIEngine implements AIEngineInterface {
  private engine: CoreAIEngine;
  private modelRouter: ReturnType<CoreAIEngine['getModelRouter']>;

  constructor() {
    this.engine = new CoreAIEngine();
    this.modelRouter = this.engine.getModelRouter();
  }

  /**
   * AIEngineInterface.infer — context-preserving inference used by ChatService
   * (persists multi-turn context). Delegates to the shared @quant/ai engine so
   * circuit-breaker / cost-tracking state is shared with the rest of the app.
   */
  async infer(request: AIInferenceRequest): Promise<AIInferenceResponse> {
    const response = await this.engine.infer({
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      context: request.context as never,
      model: request.model,
      userId: request.userId,
      app: request.app as never,
      feature: request.feature,
    });

    const usage = response.usage ?? {};
    return {
      id: response.id ?? `infer-${Date.now()}`,
      content: response.content ?? '',
      model: response.model ?? request.model ?? 'unknown',
      finishReason: response.finishReason ?? 'stop',
      usage: {
        promptTokens: usage.promptTokens ?? 0,
        completionTokens: usage.completionTokens ?? 0,
        totalTokens: usage.totalTokens ?? 0,
        estimatedCost: usage.estimatedCost ?? 0,
      },
      latencyMs: response.latencyMs ?? 0,
      cached: response.cached ?? false,
    };
  }

  /** AIEngineInterface.stream — token stream used by ChatService.streamMessage. */
  async *stream(request: AIInferenceRequest): AsyncGenerator<StreamChunk> {
    const source = this.engine.stream({
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      context: request.context as never,
      model: request.model,
      userId: request.userId,
      app: request.app as never,
      feature: request.feature,
      stream: true,
    });

    for await (const chunk of source as AsyncIterable<Partial<StreamChunk>>) {
      yield {
        id: chunk.id ?? `chunk-${Date.now()}`,
        content: chunk.content ?? '',
        done: chunk.done ?? false,
        finishReason: chunk.finishReason,
      };
    }
  }

  async chat(messages: any[], options: any = {}) {
    const userMessage = [...messages].reverse().find((m) => m.role === 'user');
    const systemMessage = messages.find((m) => m.role === 'system');
    const prompt = userMessage?.content || '';

    const response = await this.engine.infer({
      prompt,
      systemPrompt: systemMessage?.content || options.systemPrompt,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      userId: options.userId || 'anonymous',
      app: 'quantai',
      feature: 'chat',
    });

    return {
      content: response.content,
      model: response.model,
      usage: response.usage,
    };
  }

  async streamChat(messages: any[], options: any = {}) {
    const userMessage = [...messages].reverse().find((m) => m.role === 'user');
    const systemMessage = messages.find((m) => m.role === 'system');
    const prompt = userMessage?.content || '';

    return this.engine.stream({
      prompt,
      systemPrompt: systemMessage?.content || options.systemPrompt,
      model: options.model,
      temperature: options.temperature,
      userId: options.userId || 'anonymous',
      app: 'quantai',
      feature: 'chat',
      stream: true,
    });
  }

  async getAvailableModels() {
    return this.modelRouter.getModels();
  }
}
