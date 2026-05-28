import type { EmbeddingStore } from '../embeddings/embedding-store.js';
import type { QAResult, Citation } from '../types.js';

export class QAEngine {
  private store: EmbeddingStore;
  private embed: (text: string) => number[];

  constructor(store: EmbeddingStore, embed: (text: string) => number[]) {
    this.store = store;
    this.embed = embed;
  }

  ask(notebookId: string, question: string, options?: { webMode?: boolean }): QAResult {
    const queryVector = this.embed(question);
    const results = this.store.search(notebookId, queryVector, 5);
    const threshold = 0.3;
    const relevant = results.filter((r) => r.score >= threshold);

    if (!options?.webMode && relevant.length === 0) {
      return {
        answer: 'I can only answer based on the notebook content. No relevant information found.',
        citations: [],
        fromWebMode: false,
      };
    }

    const chunks = options?.webMode ? results : relevant;
    const citations: Citation[] = chunks.map((c) => ({
      sourceId: c.sourceId,
      sourceTitle: c.sourceId,
      chunkId: c.id,
      text: c.text.slice(0, 100),
      position: c.position,
    }));

    const answer = chunks.map((c) => c.text).join(' ');
    return { answer, citations, fromWebMode: options?.webMode ?? false };
  }
}
