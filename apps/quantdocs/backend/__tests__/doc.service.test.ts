import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocService } from '../services/doc.service';

function createMockPrisma() {
  return {
    document: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    documentVersion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    documentCollaborator: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

describe('DocService', () => {
  let service: DocService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new DocService(prisma as never);
  });

  describe('createDoc', () => {
    it('creates a document', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Test Doc',
        content: '<p>Hello</p>',
        userId: 'user-1',
        metadata: {},
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.document.create.mockResolvedValue(mockDoc);

      const result = await service.createDoc({
        title: 'Test Doc',
        content: '<p>Hello</p>',
        userId: 'user-1',
      });

      expect(result).toEqual(mockDoc);
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Doc',
          content: '<p>Hello</p>',
          userId: 'user-1',
          metadata: {},
        },
      });
    });
  });

  describe('getDoc', () => {
    it('returns doc when found and user is owner', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Test Doc',
        content: '<p>Hello</p>',
        userId: 'user-1',
        metadata: {},
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.document.findUnique.mockResolvedValue(mockDoc);

      const result = await service.getDoc('doc-1', 'user-1');

      expect(result).toEqual(mockDoc);
    });

    it('throws not-found when document does not exist', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getDoc('missing', 'user-1')).rejects.toThrow('Document not found');
    });

    it('throws not-found when document is deleted', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        isDeleted: true,
      });

      await expect(service.getDoc('doc-1', 'user-1')).rejects.toThrow('Document not found');
    });

    it('throws unauthorized when user is not owner', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        isDeleted: false,
      });

      await expect(service.getDoc('doc-1', 'user-2')).rejects.toThrow(
        'Not authorized to access this document',
      );
    });
  });

  describe('updateDoc', () => {
    it('saves version and updates document', async () => {
      const existingDoc = {
        id: 'doc-1',
        title: 'Old Title',
        content: '<p>Old content</p>',
        userId: 'user-1',
        metadata: {},
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.document.findUnique.mockResolvedValue(existingDoc);
      prisma.documentVersion.create.mockResolvedValue({});

      const updatedDoc = { ...existingDoc, content: '<p>New content</p>', title: 'New Title' };
      prisma.document.update.mockResolvedValue(updatedDoc);

      const result = await service.updateDoc('doc-1', 'user-1', '<p>New content</p>', 'New Title');

      expect(result.content).toBe('<p>New content</p>');
      expect(prisma.documentVersion.create).toHaveBeenCalledWith({
        data: {
          docId: 'doc-1',
          title: 'Old Title',
          content: '<p>Old content</p>',
          createdAt: expect.any(Date),
        },
      });
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: {
          content: '<p>New content</p>',
          title: 'New Title',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('deleteDoc', () => {
    it('soft deletes the document', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Test Doc',
        content: '<p>Hello</p>',
        userId: 'user-1',
        metadata: {},
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.document.findUnique.mockResolvedValue(mockDoc);
      prisma.document.update.mockResolvedValue({ ...mockDoc, isDeleted: true });

      const result = await service.deleteDoc('doc-1', 'user-1');

      expect(result.isDeleted).toBe(true);
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { isDeleted: true, updatedAt: expect.any(Date) },
      });
    });
  });

  describe('listDocs', () => {
    it('returns paginated results', async () => {
      const docs = [
        { id: 'doc-1', title: 'Doc 1' },
        { id: 'doc-2', title: 'Doc 2' },
      ];
      prisma.document.findMany.mockResolvedValue(docs);
      prisma.document.count.mockResolvedValue(25);

      const result = await service.listDocs('user-1', { page: 1, pageSize: 10 });

      expect(result.data).toEqual(docs);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('uses default pagination when not specified', async () => {
      prisma.document.findMany.mockResolvedValue([]);
      prisma.document.count.mockResolvedValue(0);

      await service.listDocs('user-1');

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDeleted: false },
        skip: 0,
        take: 20,
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('getVersionHistory', () => {
    it('returns versions for the document', async () => {
      const mockDoc = {
        id: 'doc-1',
        userId: 'user-1',
        isDeleted: false,
      };
      prisma.document.findUnique.mockResolvedValue(mockDoc);

      const versions = [
        { id: 'v-1', docId: 'doc-1', title: 'V1', content: 'c1', createdAt: new Date() },
        { id: 'v-2', docId: 'doc-1', title: 'V2', content: 'c2', createdAt: new Date() },
      ];
      prisma.documentVersion.findMany.mockResolvedValue(versions);

      const result = await service.getVersionHistory('doc-1', 'user-1');

      expect(result).toEqual(versions);
      expect(prisma.documentVersion.findMany).toHaveBeenCalledWith({
        where: { docId: 'doc-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('restoreVersion', () => {
    it('updates content from version', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Current Title',
        content: '<p>Current</p>',
        userId: 'user-1',
        metadata: {},
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.document.findUnique.mockResolvedValue(mockDoc);

      const version = {
        id: 'v-1',
        docId: 'doc-1',
        title: 'Old Title',
        content: '<p>Old content</p>',
        createdAt: new Date(),
      };
      prisma.documentVersion.findUnique.mockResolvedValue(version);
      prisma.documentVersion.create.mockResolvedValue({});

      const restoredDoc = { ...mockDoc, title: 'Old Title', content: '<p>Old content</p>' };
      prisma.document.update.mockResolvedValue(restoredDoc);

      const result = await service.restoreVersion('doc-1', 'user-1', 'v-1');

      expect(result.title).toBe('Old Title');
      expect(result.content).toBe('<p>Old content</p>');
    });

    it('throws when version not found', async () => {
      const mockDoc = {
        id: 'doc-1',
        userId: 'user-1',
        isDeleted: false,
      };
      prisma.document.findUnique.mockResolvedValue(mockDoc);
      prisma.documentVersion.findUnique.mockResolvedValue(null);

      await expect(service.restoreVersion('doc-1', 'user-1', 'v-missing')).rejects.toThrow(
        'Version not found',
      );
    });
  });

  describe('searchDocs', () => {
    it('matches title/description over the caller\u2019s non-deleted docs', async () => {
      prisma.document.findMany.mockResolvedValue([{ id: 'd1', title: 'Roadmap' }]);
      prisma.document.count.mockResolvedValue(1);

      const result = await service.searchDocs('user-1', 'road', { page: 1, pageSize: 20 });

      expect(result.total).toBe(1);
      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            isDeleted: false,
            OR: [
              { title: { contains: 'road', mode: 'insensitive' } },
              { content: { contains: 'road', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('short-circuits a blank query (no DB hit)', async () => {
      const result = await service.searchDocs('user-1', '   ');
      expect(result.data).toHaveLength(0);
      expect(prisma.document.findMany).not.toHaveBeenCalled();
    });
  });

  describe('shareDoc', () => {
    it('flips public visibility and upserts a collaborator (owner only)', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        isDeleted: false,
      });
      prisma.document.update.mockResolvedValue({ id: 'doc-1', isPublic: true });
      prisma.documentCollaborator.upsert.mockResolvedValue({ userId: 'u2', role: 'editor' });

      const result = await service.shareDoc('doc-1', 'user-1', {
        isPublic: true,
        targetUserId: 'u2',
        role: 'editor',
      });

      expect(prisma.documentCollaborator.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { docId_userId: { docId: 'doc-1', userId: 'u2' } },
          create: { docId: 'doc-1', userId: 'u2', role: 'editor' },
          update: { role: 'editor' },
        }),
      );
      expect(result.collaborator).toBeDefined();
    });

    it('rejects a non-owner', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'owner',
        isDeleted: false,
      });
      await expect(service.shareDoc('doc-1', 'intruder', { isPublic: true })).rejects.toThrow();
    });
  });

  describe('listCollaborators', () => {
    it('returns the document collaborators for the owner', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        isDeleted: false,
      });
      prisma.documentCollaborator.findMany.mockResolvedValue([{ userId: 'u2', role: 'viewer' }]);

      const result = await service.listCollaborators('doc-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(prisma.documentCollaborator.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { docId: 'doc-1' } }),
      );
    });
  });
});
