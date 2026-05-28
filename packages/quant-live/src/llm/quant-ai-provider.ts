import type { LLMStreamChunk, LiveConversationContext, LiveLLMProvider } from '../types.js';
import { MockLLMProvider } from './streaming-llm.js';

type StreamFn = (request: unknown) => AsyncIterable<{ id: string; content: string; done: boolean }>;

export class QuantAIProvider implements LiveLLMProvider {
  private aborted = false;
  private streamFn: StreamFn | undefined;

  constructor(streamFn?: StreamFn) {
    this.streamFn = streamFn;
  }

  async *streamResponse(context: LiveConversationContext): AsyncIterable<LLMStreamChunk> {
    this.aborted = false;

    if (!this.streamFn) {
      // Fall back to mock when no stream function is provided
      const mock = new MockLLMProvider();
      yield* mock.streamResponse(context);
      return;
    }

    const messages = context.transcript.map((seg) => ({
      role: seg.speaker === 'user' ? ('user' as const) : ('assistant' as const),
      content: seg.text,
    }));

    const request = {
      prompt: messages.length > 0 ? messages[messages.length - 1]!.content : '',
      systemPrompt: context.systemPrompt,
      context: messages,
      maxTokens: context.maxTokens ?? 1024,
      temperature: context.temperature ?? 0.7,
      stream: true,
      userId: context.sessionId,
      app: 'quant-live',
      feature: 'conversation',
    };

    try {
      for await (const chunk of this.streamFn(request)) {
        if (this.aborted) return;
        if (chunk.done) {
          yield { type: 'done' };
          return;
        }
        yield { type: 'text', text: chunk.content };
      }
      yield { type: 'done' };
    } catch {
      // Fall back to mock on error
      const mock = new MockLLMProvider();
      yield* mock.streamResponse(context);
    }
  }

  abort(): void {
    this.aborted = true;
  }
}
