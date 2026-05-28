import type { LLMStreamChunk, LiveConversationContext, LiveLLMProvider } from '../types.js';
import { QuantAIProvider } from './quant-ai-provider.js';

export type LLMProviderType = 'quant-ai' | 'mock';

export interface LLMProviderConfig {
  provider: LLMProviderType;
  streamFn?: (request: unknown) => AsyncIterable<{ id: string; content: string; done: boolean }>;
}

export class MockLLMProvider implements LiveLLMProvider {
  private aborted = false;

  async *streamResponse(_context: LiveConversationContext): AsyncIterable<LLMStreamChunk> {
    this.aborted = false;
    const texts = ['Hello, ', 'how can I ', 'help you today?'];
    for (const text of texts) {
      if (this.aborted) return;
      yield { type: 'text', text };
    }
    yield { type: 'done' };
  }

  abort(): void {
    this.aborted = true;
  }
}

export function createLLMProvider(config: LLMProviderConfig): LiveLLMProvider {
  switch (config.provider) {
    case 'mock':
      return new MockLLMProvider();
    case 'quant-ai':
      return new QuantAIProvider(config.streamFn);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider as string}`);
  }
}
