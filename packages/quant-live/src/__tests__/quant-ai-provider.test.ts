import { describe, it, expect } from 'vitest';
import { QuantAIProvider } from '../llm/quant-ai-provider.js';
import type { LLMStreamChunk, LiveConversationContext } from '../types.js';

function makeContext(): LiveConversationContext {
  return {
    sessionId: 'sess-1',
    transcript: [
      {
        id: '1',
        speaker: 'user',
        text: 'Hi there',
        startTime: 0,
        endTime: 100,
        confidence: 0.9,
        isFinal: true,
      },
    ],
    systemPrompt: 'Be helpful.',
    tools: [],
    maxTokens: 256,
    temperature: 0.5,
  };
}

describe('QuantAIProvider', () => {
  it('yields LLMStreamChunks from a mock stream function', async () => {
    async function* mockStream(_req: unknown) {
      yield { id: '1', content: 'Hello ', done: false };
      yield { id: '2', content: 'world.', done: false };
      yield { id: '3', content: '', done: true };
    }

    const provider = new QuantAIProvider(mockStream);
    const chunks: LLMStreamChunk[] = [];

    for await (const chunk of provider.streamResponse(makeContext())) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world.' },
      { type: 'done' },
    ]);
  });

  it('falls back to mock when stream function throws', async () => {
    async function* failStream(
      _req: unknown,
    ): AsyncGenerator<{ id: string; content: string; done: boolean }> {
      throw new Error('API key missing');
    }

    const provider = new QuantAIProvider(failStream);
    const chunks: LLMStreamChunk[] = [];

    for await (const chunk of provider.streamResponse(makeContext())) {
      chunks.push(chunk);
    }

    // Should get mock output instead
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[chunks.length - 1]!.type).toBe('done');
  });

  it('abort stops the stream mid-iteration', async () => {
    let yielded = 0;
    async function* slowStream(_req: unknown) {
      for (let i = 0; i < 100; i++) {
        yielded++;
        yield { id: String(i), content: `chunk ${i}`, done: false };
      }
    }

    const provider = new QuantAIProvider(slowStream);
    const chunks: LLMStreamChunk[] = [];

    for await (const chunk of provider.streamResponse(makeContext())) {
      chunks.push(chunk);
      if (chunks.length === 3) {
        provider.abort();
      }
    }

    expect(chunks.length).toBeLessThanOrEqual(4);
  });
});
