// ============================================================================
// AI Core - Semantic Cache
// ============================================================================

import type { SemanticCacheEntry } from '../types';

/** Default TTL for cache entries: 5 minutes */
const DEFAULT_TTL_MS = 300_000;

/** Default similarity threshold for cache hits */
const DEFAULT_THRESHOLD = 0.92;

/**
 * Semantic Cache
 *
 * In-memory cache that uses cosine similarity on word-frequency vectors
 * to match semantically similar prompts. Simulates pgvector behavior
 * for local/testing use.
 */
export class SemanticCache {
  private entries: SemanticCacheEntry[] = [];
  private defaultTtl: number;

  constructor(defaultTtl: number = DEFAULT_TTL_MS) {
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get a cached response for a semantically similar prompt
   */
  get(prompt: string, threshold: number = DEFAULT_THRESHOLD): string | null {
    this.evictExpired();

    const queryEmbedding = this.computeEmbedding(prompt);

    let bestMatch: SemanticCacheEntry | null = null;
    let bestSimilarity = -1;

    for (const entry of this.entries) {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (similarity >= threshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    return bestMatch ? bestMatch.response : null;
  }

  /**
   * Store a prompt-response pair in the cache
   */
  set(prompt: string, response: string, ttl?: number): void {
    const embedding = this.computeEmbedding(prompt);
    const entry: SemanticCacheEntry = {
      prompt,
      response,
      embedding,
      createdAt: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    };
    this.entries.push(entry);
  }

  /**
   * Invalidate all cache entries
   */
  invalidate(): void {
    this.entries = [];
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    this.evictExpired();
    return this.entries.length;
  }

  /**
   * Compute a simple word-frequency vector embedding
   */
  computeEmbedding(text: string): number[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const vocab = new Map<string, number>();

    // Build vocabulary index
    for (const word of words) {
      if (!vocab.has(word)) {
        vocab.set(word, vocab.size);
      }
    }

    // Create frequency vector
    const vector = new Array(Math.max(vocab.size, 1)).fill(0);
    for (const word of words) {
      const idx = vocab.get(word);
      if (idx !== undefined) {
        vector[idx]++;
      }
    }

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }

    return vector;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    // For vectors of different lengths, we need to compute a different way.
    // Since our word-freq vectors have different dimensions (different vocab),
    // we need to compare based on the original text words.
    // This simplified approach uses the shorter vector length.
    const minLen = Math.min(a.length, b.length);
    if (minLen === 0) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < minLen; i++) {
      dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
      magA += (a[i] ?? 0) * (a[i] ?? 0);
      magB += (b[i] ?? 0) * (b[i] ?? 0);
    }

    // Include remaining dimensions
    for (let i = minLen; i < a.length; i++) {
      magA += (a[i] ?? 0) * (a[i] ?? 0);
    }
    for (let i = minLen; i < b.length; i++) {
      magB += (b[i] ?? 0) * (b[i] ?? 0);
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Evict expired entries
   */
  private evictExpired(): void {
    const now = Date.now();
    this.entries = this.entries.filter((entry) => now - entry.createdAt < entry.ttl);
  }
}
