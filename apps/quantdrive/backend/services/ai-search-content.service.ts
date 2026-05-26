import type { AIEngine } from '@quant/ai';

export interface FileIndexRecord {
  id: string;
  fileId: string;
  userId: string;
  content: string;
  mimeType: string;
  indexedAt: Date;
}

export interface PrismaClient {
  fileIndex: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  };
}

export interface SearchResult {
  fileId: string;
  name: string;
  snippet: string;
  relevanceScore: number;
}

export interface SearchOptions {
  limit?: number;
}

interface IndexedFileRecord {
  id: string;
  fileId: string;
  userId: string;
  content: string;
  mimeType: string;
  indexedAt: Date;
  fileName?: string;
}

export class AISearchContentService {
  constructor(
    private readonly ai: AIEngine,
    private readonly prisma: PrismaClient,
  ) {}

  async indexFile(
    fileId: string,
    content: string,
    mimeType: string,
    userId: string,
  ): Promise<FileIndexRecord> {
    let indexableContent = content;

    // For images, simulate OCR by storing filename/metadata
    if (mimeType.startsWith('image/')) {
      indexableContent = `[Image file: ${fileId}] ${content}`;
    }

    const record = await this.prisma.fileIndex.create({
      data: {
        fileId,
        userId,
        content: indexableContent,
        mimeType,
        indexedAt: new Date(),
      },
    });

    return record as unknown as FileIndexRecord;
  }

  async searchContent(
    query: string,
    userId: string,
    options?: SearchOptions,
  ): Promise<SearchResult[]> {
    const limit = options?.limit ?? 20;

    const records = await this.prisma.fileIndex.findMany({
      where: { userId },
    });

    const indexed = records as unknown as IndexedFileRecord[];
    const results: SearchResult[] = [];

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 0);

    for (const record of indexed) {
      const contentLower = record.content.toLowerCase();
      let matchCount = 0;

      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          matchCount++;
        }
      }

      if (matchCount === 0) continue;

      const relevanceScore = matchCount / queryTerms.length;
      const snippet = this.extractSnippet(record.content, queryTerms);

      results.push({
        fileId: record.fileId,
        name: record.fileName ?? record.fileId,
        snippet,
        relevanceScore,
      });
    }

    // Sort by relevance score descending
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, limit);
  }

  private extractSnippet(content: string, terms: string[]): string {
    const contentLower = content.toLowerCase();
    let bestIndex = 0;
    let bestScore = 0;

    for (const term of terms) {
      const idx = contentLower.indexOf(term);
      if (idx !== -1 && idx < content.length) {
        // Count how many terms are near this position
        let score = 0;
        for (const t of terms) {
          const tIdx = contentLower.indexOf(t, Math.max(0, idx - 100));
          if (tIdx !== -1 && tIdx < idx + 200) {
            score++;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestIndex = idx;
        }
      }
    }

    const start = Math.max(0, bestIndex - 50);
    const end = Math.min(content.length, bestIndex + 150);
    let snippet = content.slice(start, end).trim();

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }
}
