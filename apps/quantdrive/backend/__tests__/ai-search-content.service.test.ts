import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AISearchContentService } from '../services/ai-search-content.service';

function createMockAI() {
  return {
    infer: vi.fn(),
  };
}

function createMockPrisma() {
  return {
    fileIndex: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('AISearchContentService', () => {
  let service: AISearchContentService;
  let ai: ReturnType<typeof createMockAI>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    ai = createMockAI();
    prisma = createMockPrisma();
    service = new AISearchContentService(ai as never, prisma as never);
  });

  describe('indexFile', () => {
    it('stores content and returns record', async () => {
      prisma.fileIndex.create.mockImplementation(
        async (args: { data: Record<string, unknown> }) => {
          return { id: 'idx-1', ...args.data };
        },
      );

      const result = await service.indexFile(
        'file-1',
        'The quick brown fox jumps over the lazy dog',
        'text/plain',
        'user-1',
      );

      expect(result.fileId).toBe('file-1');
      expect(result.content).toContain('quick brown fox');
      expect(result.userId).toBe('user-1');
    });
  });

  describe('searchContent', () => {
    it('returns matching files', async () => {
      const records = [
        {
          id: 'idx-1',
          fileId: 'file-1',
          userId: 'user-1',
          content: 'The quick brown fox jumps over the lazy dog',
          mimeType: 'text/plain',
          indexedAt: new Date(),
        },
        {
          id: 'idx-2',
          fileId: 'file-2',
          userId: 'user-1',
          content: 'A completely different document about TypeScript programming',
          mimeType: 'text/plain',
          indexedAt: new Date(),
        },
      ];
      prisma.fileIndex.findMany.mockResolvedValue(records);

      const results = await service.searchContent('quick fox', 'user-1');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.fileId).toBe('file-1');
    });

    it('returns empty for no matches', async () => {
      const records = [
        {
          id: 'idx-1',
          fileId: 'file-1',
          userId: 'user-1',
          content: 'The quick brown fox',
          mimeType: 'text/plain',
          indexedAt: new Date(),
        },
      ];
      prisma.fileIndex.findMany.mockResolvedValue(records);

      const results = await service.searchContent('nonexistent unicorn magic', 'user-1');

      expect(results).toHaveLength(0);
    });

    it('respects limit option', async () => {
      const records = Array.from({ length: 10 }, (_, i) => ({
        id: `idx-${i}`,
        fileId: `file-${i}`,
        userId: 'user-1',
        content: `Document ${i} contains the word typescript and more typescript content`,
        mimeType: 'text/plain',
        indexedAt: new Date(),
      }));
      prisma.fileIndex.findMany.mockResolvedValue(records);

      const results = await service.searchContent('typescript', 'user-1', { limit: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('returns results sorted by relevance', async () => {
      const records = [
        {
          id: 'idx-1',
          fileId: 'file-1',
          userId: 'user-1',
          content: 'JavaScript is a programming language',
          mimeType: 'text/plain',
          indexedAt: new Date(),
        },
        {
          id: 'idx-2',
          fileId: 'file-2',
          userId: 'user-1',
          content:
            'TypeScript is a typed superset of JavaScript. JavaScript developers love TypeScript.',
          mimeType: 'text/plain',
          indexedAt: new Date(),
        },
      ];
      prisma.fileIndex.findMany.mockResolvedValue(records);

      const results = await service.searchContent('TypeScript JavaScript', 'user-1');

      // file-2 should rank higher since it matches both terms
      expect(results.length).toBe(2);
      expect(results[0]!.fileId).toBe('file-2');
    });
  });
});
