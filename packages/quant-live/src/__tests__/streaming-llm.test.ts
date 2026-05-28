import { describe, it, expect } from 'vitest';
import { createLLMProvider, MockLLMProvider } from '../llm/streaming-llm.js';
import type { LLMStreamChunk, LiveConversationContext } from '../types.js';

function makeContext(): LiveConversationContext {
  return {
    sessionId: 'test-session',
    transcript: [],
    systemPrompt: 'You are helpful.',
    tools: [],
  };
}

describe('createLLMProvider', () => {
  it('creates a mock provider that yields text chunks', async () => {
    const provider = createLLMProvider({ provider: 'mock' });
    const chunks: LLMStreamChunk[] = [];

    for await (const chunk of provider.streamResponse(makeContext())) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.filter((c) => c.type === 'text').length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1]!.type).toBe('done');
  });

  it('creates quant-ai provider that falls back to mock without streamFn', async () => {
    const provider = createLLMProvider({ provider: 'quant-ai' });
    const chunks: LLMStreamChunk[] = [];

    for await (const chunk of provider.streamResponse(makeContext())) {
      chunks.push(chunk);
    }

    // Falls back to mock provider
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[chunks.length - 1]!.type).toBe('done');
  });

  it('MockLLMProvider abort stops the stream', async () => {
    const provider = new MockLLMProvider();
    const chunks: LLMStreamChunk[] = [];

    for await (const chunk of provider.streamResponse(makeContext())) {
      chunks.push(chunk);
      if (chunks.length === 1) {
        provider.abort();
      }
    }

    // Abort after first chunk means we get at most 2 (the one triggering abort may already be yielded)
    expect(chunks.length).toBeLessThan(4);
  });
});
