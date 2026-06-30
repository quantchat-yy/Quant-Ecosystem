import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommentService } from '../services/comment.service';

function createMockPrisma() {
  return {
    docComment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    docSuggestion: {
      create: vi.fn(),
    },
  };
}

describe('CommentService', () => {
  let service: CommentService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new CommentService(prisma as never);
  });

  describe('createComment', () => {
    it('creates a comment on a document', async () => {
      const mockComment = {
        id: 'comment-1',
        docId: 'doc-1',
        userId: 'user-1',
        content: 'Great point here',
        selection: null,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.docComment.create.mockResolvedValue(mockComment);

      const result = await service.createComment({
        docId: 'doc-1',
        userId: 'user-1',
        content: 'Great point here',
      });

      expect(result).toEqual(mockComment);
      expect(prisma.docComment.create).toHaveBeenCalledWith({
        data: {
          docId: 'doc-1',
          userId: 'user-1',
          content: 'Great point here',
          selection: null,
          resolved: false,
        },
      });
    });

    it('creates a comment with text selection', async () => {
      const selection = { startOffset: 10, endOffset: 20, selectedText: 'some text' };
      const mockComment = {
        id: 'comment-2',
        docId: 'doc-1',
        userId: 'user-1',
        content: 'Comment on selection',
        selection,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.docComment.create.mockResolvedValue(mockComment);

      const result = await service.createComment({
        docId: 'doc-1',
        userId: 'user-1',
        content: 'Comment on selection',
        selection,
      });

      expect(result.selection).toEqual(selection);
    });
  });

  describe('replyToComment', () => {
    it('creates a reply to an existing comment', async () => {
      const parentComment = {
        id: 'comment-1',
        docId: 'doc-1',
        userId: 'user-1',
        content: 'Original comment',
      };
      prisma.docComment.findUnique.mockResolvedValue(parentComment);

      const mockReply = {
        id: 'comment-2',
        docId: 'doc-1',
        userId: 'user-2',
        content: 'This is a reply',
        parentId: 'comment-1',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.docComment.create.mockResolvedValue(mockReply);

      const result = await service.replyToComment('comment-1', 'user-2', 'This is a reply');

      expect(result.parentId).toBe('comment-1');
      expect(result.content).toBe('This is a reply');
      expect(prisma.docComment.create).toHaveBeenCalledWith({
        data: {
          docId: 'doc-1',
          userId: 'user-2',
          content: 'This is a reply',
          parentId: 'comment-1',
          resolved: false,
        },
      });
    });

    it('throws when parent comment not found', async () => {
      prisma.docComment.findUnique.mockResolvedValue(null);

      await expect(service.replyToComment('nonexistent', 'user-2', 'Reply')).rejects.toThrow(
        'Comment not found',
      );
    });
  });

  describe('resolveComment', () => {
    it('sets resolved flag on comment', async () => {
      const mockComment = {
        id: 'comment-1',
        docId: 'doc-1',
        userId: 'user-1',
        content: 'To resolve',
        resolved: false,
      };
      prisma.docComment.findUnique.mockResolvedValue(mockComment);

      const resolvedComment = { ...mockComment, resolved: true };
      prisma.docComment.update.mockResolvedValue(resolvedComment);

      const result = await service.resolveComment('comment-1', 'user-1');

      expect(result.resolved).toBe(true);
      expect(prisma.docComment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { resolved: true, updatedAt: expect.any(Date) },
      });
    });

    it('throws unauthorized when different user tries to resolve', async () => {
      prisma.docComment.findUnique.mockResolvedValue({
        id: 'comment-1',
        userId: 'user-1',
      });

      await expect(service.resolveComment('comment-1', 'user-2')).rejects.toThrow(
        'Not authorized to resolve this comment',
      );
    });

    it('throws when comment not found', async () => {
      prisma.docComment.findUnique.mockResolvedValue(null);

      await expect(service.resolveComment('nonexistent', 'user-1')).rejects.toThrow(
        'Comment not found',
      );
    });
  });

  describe('deleteComment', () => {
    it('deletes a comment owned by the requesting user', async () => {
      const mockComment = {
        id: 'comment-1',
        docId: 'doc-1',
        userId: 'user-1',
        content: 'To delete',
        resolved: false,
      };
      prisma.docComment.findUnique.mockResolvedValue(mockComment);
      prisma.docComment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.docComment.delete.mockResolvedValue(mockComment);

      const result = await service.deleteComment('comment-1', 'user-1');

      expect(result).toEqual(mockComment);
      expect(prisma.docComment.deleteMany).toHaveBeenCalledWith({
        where: { parentId: 'comment-1' },
      });
      expect(prisma.docComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });

    it('throws unauthorized when a different user tries to delete', async () => {
      prisma.docComment.findUnique.mockResolvedValue({
        id: 'comment-1',
        userId: 'user-1',
      });

      await expect(service.deleteComment('comment-1', 'user-2')).rejects.toThrow(
        'Not authorized to delete this comment',
      );
      expect(prisma.docComment.delete).not.toHaveBeenCalled();
      expect(prisma.docComment.deleteMany).not.toHaveBeenCalled();
    });

    it('throws when comment not found', async () => {
      prisma.docComment.findUnique.mockResolvedValue(null);

      await expect(service.deleteComment('nonexistent', 'user-1')).rejects.toThrow(
        'Comment not found',
      );
      expect(prisma.docComment.delete).not.toHaveBeenCalled();
    });
  });

  describe('getComments', () => {
    it('returns all comments for a document', async () => {
      const comments = [
        { id: 'c-1', docId: 'doc-1', content: 'Comment 1' },
        { id: 'c-2', docId: 'doc-1', content: 'Comment 2' },
      ];
      prisma.docComment.findMany.mockResolvedValue(comments);

      const result = await service.getComments('doc-1');

      expect(result).toEqual(comments);
      expect(prisma.docComment.findMany).toHaveBeenCalledWith({
        where: { docId: 'doc-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('createSuggestion', () => {
    it('creates a text suggestion', async () => {
      const mockSuggestion = {
        id: 'sug-1',
        docId: 'doc-1',
        userId: 'user-1',
        originalText: 'teh',
        suggestedText: 'the',
        selection: { startOffset: 0, endOffset: 3, selectedText: 'teh' },
        status: 'pending',
        createdAt: new Date(),
      };
      prisma.docSuggestion.create.mockResolvedValue(mockSuggestion);

      const result = await service.createSuggestion({
        docId: 'doc-1',
        userId: 'user-1',
        originalText: 'teh',
        suggestedText: 'the',
        selection: { startOffset: 0, endOffset: 3, selectedText: 'teh' },
      });

      expect(result.originalText).toBe('teh');
      expect(result.suggestedText).toBe('the');
      expect(result.status).toBe('pending');
    });
  });
});
