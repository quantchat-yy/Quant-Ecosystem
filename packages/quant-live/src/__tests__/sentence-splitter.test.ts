import { describe, it, expect } from 'vitest';
import { splitSentences } from '../llm/sentence-splitter.js';
import type { LLMStreamChunk } from '../types.js';

async function* makeStream(chunks: LLMStreamChunk[]): AsyncIterable<LLMStreamChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

async function collect(iter: AsyncIterable<string>): Promise<string[]> {
  const results: string[] = [];
  for await (const item of iter) {
    results.push(item);
  }
  return results;
}

describe('splitSentences', () => {
  it('splits on English sentence boundaries', async () => {
    const chunks: LLMStreamChunk[] = [
      { type: 'text', text: 'Hello world. ' },
      { type: 'text', text: 'How are you? ' },
      { type: 'text', text: 'I am fine!' },
      { type: 'done' },
    ];

    const sentences = await collect(splitSentences(makeStream(chunks)));
    expect(sentences).toEqual(['Hello world.', 'How are you?', 'I am fine!']);
  });

  it('splits on Hindi danda character', async () => {
    const chunks: LLMStreamChunk[] = [
      { type: 'text', text: '\u0928\u092E\u0938\u094D\u0924\u0947\u0964 ' },
      { type: 'text', text: '\u0906\u092A \u0915\u0948\u0938\u0947 \u0939\u0948\u0902\u0964' },
      { type: 'done' },
    ];

    const sentences = await collect(splitSentences(makeStream(chunks)));
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toContain('\u0964');
  });

  it('yields on buffer overflow when no sentence boundary found', async () => {
    const longText = 'a'.repeat(250);
    const chunks: LLMStreamChunk[] = [{ type: 'text', text: longText }, { type: 'done' }];

    const sentences = await collect(splitSentences(makeStream(chunks), { maxBufferLength: 200 }));
    expect(sentences.length).toBeGreaterThanOrEqual(1);
    expect(sentences.join('')).toBe(longText);
  });

  it('flushes remaining buffer on done', async () => {
    const chunks: LLMStreamChunk[] = [{ type: 'text', text: 'No ending here' }, { type: 'done' }];

    const sentences = await collect(splitSentences(makeStream(chunks)));
    expect(sentences).toEqual(['No ending here']);
  });

  it('skips non-text chunks', async () => {
    const chunks: LLMStreamChunk[] = [
      { type: 'text', text: 'Hello. ' },
      { type: 'tool_call', toolCall: { id: '1', name: 'search', args: {} } },
      { type: 'text', text: 'World.' },
      { type: 'done' },
    ];

    const sentences = await collect(splitSentences(makeStream(chunks)));
    expect(sentences).toEqual(['Hello.', 'World.']);
  });

  it('does not split on periods without trailing whitespace (abbreviations)', async () => {
    const chunks: LLMStreamChunk[] = [
      { type: 'text', text: 'The value is 3.14 ok. ' },
      { type: 'text', text: 'Version 2.0 works.' },
      { type: 'done' },
    ];
    const sentences = await collect(splitSentences(makeStream(chunks)));
    // Periods in "3.14" and "2.0" do not cause splits because no trailing whitespace after them
    expect(sentences).toEqual(['The value is 3.14 ok.', 'Version 2.0 works.']);
  });
});
