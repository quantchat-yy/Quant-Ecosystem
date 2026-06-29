import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuggestionService } from '../services/suggestion.service';

function createMockPrisma() {
  return {
    docSuggestion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    document: {
      findUnique: vi.fn(),
    },
  };
}

const OWNER = 'user-1';
const OTHER = 'user-2';

function ownedDoc(overrides: Record<string, unknown> = {}) {
  return { id: 'doc-1', userId: OWNER, isDeleted: false, ...overrides };
}

function pendingSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sug-1',
    docId: 'doc-1',
    userId: OTHER,
    originalText: 'teh',
    suggestedText: 'the',
    selection: { startOffset: 0, endOffset: 3, selectedText: 'teh' },
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SuggestionService', () => {
  let service: SuggestionService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new SuggestionService(prisma as never);
  });

  describe('listSuggestions', () => {
    it('returns the document suggestions for the owner (oldest-first by default)', async () => {
      prisma.document.findUnique.mockResolvedValue(ownedDoc());
      const rows = [pendingSuggestion({ id: 's-1' }), pendingSuggestion({ id: 's-2' })];
      prisma.docSuggestion.findMany.mockResolvedValue(rows);

      const result = await service.listSuggestions('doc-1', OWNER);

      expect(result).toEqual(rows);
      expect(prisma.docSuggestion.findMany).toHaveBeenCalledWith({
        where: { docId: 'doc-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('filters by status and honors descending order', async () => {
      prisma.document.findUnique.mockResolvedValue(ownedDoc());
      prisma.docSuggestion.findMany.mockResolvedValue([]);

      await service.listSuggestions('doc-1', OWNER, { status: 'accepted', order: 'desc' });

      expect(prisma.docSuggestion.findMany).toHaveBeenCalledWith({
        where: { docId: 'doc-1', status: 'accepted' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('throws 404 when the document does not exist', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(service.listSuggestions('missing', OWNER)).rejects.toThrow('Document not found');
      expect(prisma.docSuggestion.findMany).not.toHaveBeenCalled();
    });

    it('throws 404 when the document is soft-deleted', async () => {
      prisma.document.findUnique.mockResolvedValue(ownedDoc({ isDeleted: true }));

      await expect(service.listSuggestions('doc-1', OWNER)).rejects.toThrow('Document not found');
    });

    it('throws 403 when a non-owner tries to list suggestions', async () => {
      prisma.document.findUnique.mockResolvedValue(ownedDoc());

      await expect(service.listSuggestions('doc-1', OTHER)).rejects.toThrow(
        'Not authorized to access this document',
      );
      expect(prisma.docSuggestion.findMany).not.toHaveBeenCalled();
    });
  });

  describe('acceptSuggestion', () => {
    it('transitions a pending suggestion to accepted for the owner', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(pendingSuggestion());
      prisma.document.findUnique.mockResolvedValue(ownedDoc());
      prisma.docSuggestion.update.mockResolvedValue(pendingSuggestion({ status: 'accepted' }));

      const result = await service.acceptSuggestion('sug-1', OWNER);

      expect(result.status).toBe('accepted');
      expect(prisma.docSuggestion.update).toHaveBeenCalledWith({
        where: { id: 'sug-1' },
        data: { status: 'accepted' },
      });
    });

    it('throws 404 SUGGESTION_NOT_FOUND when the suggestion is missing', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(null);

      await expect(service.acceptSuggestion('missing', OWNER)).rejects.toMatchObject({
        message: 'Suggestion not found',
        statusCode: 404,
        code: 'SUGGESTION_NOT_FOUND',
      });
      expect(prisma.docSuggestion.update).not.toHaveBeenCalled();
    });

    it('throws 403 when a non-owner tries to accept', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(pendingSuggestion());
      prisma.document.findUnique.mockResolvedValue(ownedDoc());

      await expect(service.acceptSuggestion('sug-1', OTHER)).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(prisma.docSuggestion.update).not.toHaveBeenCalled();
    });

    it('throws 409 SUGGESTION_NOT_PENDING when re-accepting an accepted suggestion', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(pendingSuggestion({ status: 'accepted' }));
      prisma.document.findUnique.mockResolvedValue(ownedDoc());

      await expect(service.acceptSuggestion('sug-1', OWNER)).rejects.toMatchObject({
        statusCode: 409,
        code: 'SUGGESTION_NOT_PENDING',
      });
      expect(prisma.docSuggestion.update).not.toHaveBeenCalled();
    });

    it('throws 409 when accepting an already-rejected suggestion', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(pendingSuggestion({ status: 'rejected' }));
      prisma.document.findUnique.mockResolvedValue(ownedDoc());

      await expect(service.acceptSuggestion('sug-1', OWNER)).rejects.toMatchObject({
        statusCode: 409,
        code: 'SUGGESTION_NOT_PENDING',
      });
    });
  });

  describe('rejectSuggestion', () => {
    it('transitions a pending suggestion to rejected for the owner', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(pendingSuggestion());
      prisma.document.findUnique.mockResolvedValue(ownedDoc());
      prisma.docSuggestion.update.mockResolvedValue(pendingSuggestion({ status: 'rejected' }));

      const result = await service.rejectSuggestion('sug-1', OWNER);

      expect(result.status).toBe('rejected');
      expect(prisma.docSuggestion.update).toHaveBeenCalledWith({
        where: { id: 'sug-1' },
        data: { status: 'rejected' },
      });
    });

    it('throws 404 when the suggestion is missing', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(null);

      await expect(service.rejectSuggestion('missing', OWNER)).rejects.toMatchObject({
        statusCode: 404,
        code: 'SUGGESTION_NOT_FOUND',
      });
    });

    it('throws 403 when a non-owner tries to reject', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(pendingSuggestion());
      prisma.document.findUnique.mockResolvedValue(ownedDoc());

      await expect(service.rejectSuggestion('sug-1', OTHER)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('throws 409 when rejecting an already-rejected suggestion', async () => {
      prisma.docSuggestion.findUnique.mockResolvedValue(pendingSuggestion({ status: 'rejected' }));
      prisma.document.findUnique.mockResolvedValue(ownedDoc());

      await expect(service.rejectSuggestion('sug-1', OWNER)).rejects.toMatchObject({
        statusCode: 409,
        code: 'SUGGESTION_NOT_PENDING',
      });
    });
  });
});
