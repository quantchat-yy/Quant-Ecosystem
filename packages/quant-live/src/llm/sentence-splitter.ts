import type { LLMStreamChunk } from '../types.js';

const SENTENCE_ENDINGS = /[.?!\u0964](?:\s|$)/;

export async function* splitSentences(
  stream: AsyncIterable<LLMStreamChunk>,
  options?: { maxBufferLength?: number },
): AsyncIterable<string> {
  const maxLen = options?.maxBufferLength ?? 200;
  let buffer = '';

  for await (const chunk of stream) {
    if (chunk.type === 'done') break;
    if (chunk.type !== 'text' || !chunk.text) continue;

    buffer += chunk.text;

    while (buffer.length > 0) {
      const match = SENTENCE_ENDINGS.exec(buffer);
      if (match) {
        const end = match.index + 1;
        const sentence = buffer.slice(0, end).trim();
        buffer = buffer.slice(end);
        if (sentence) yield sentence;
      } else if (buffer.length >= maxLen) {
        const out = buffer.trim();
        buffer = '';
        if (out) yield out;
      } else {
        break;
      }
    }
  }

  // Flush remaining buffer
  const remaining = buffer.trim();
  if (remaining) yield remaining;
}
