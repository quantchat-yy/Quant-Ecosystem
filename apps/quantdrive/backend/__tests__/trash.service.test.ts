import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrashService } from '../services/trash.service';

function createMockPrisma() {
  return {
    file: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

describe('TrashService', () => {
  let service: TrashService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new TrashService(prisma as never);
  });

  describe('moveToTrash', () => {
    it('sets isDeleted=true and deletedAt', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
        deletedAt: null,
      };
      prisma.file.findUnique.mockResolvedValue(file);
      prisma.file.update.mockResolvedValue({ ...file, isDeleted: true, deletedAt: new Date() });

      const result = (await service.moveToTrash('file-1', 'user-1')) as {
        isDeleted: boolean;
        deletedAt: Date;
      };

      expect(result.isDeleted).toBe(true);
      expect(result.deletedAt).toBeDefined();
      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: { isDeleted: true, deletedAt: expect.any(Date) },
      });
    });

    it('throws for already trashed file', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-1',
        isDeleted: true,
        deletedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(file);

      await expect(service.moveToTrash('file-1', 'user-1')).rejects.toThrow(
        'File is already in trash',
      );
    });

    it('throws 403 for wrong user', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
        deletedAt: null,
      };
      prisma.file.findUnique.mockResolvedValue(file);

      await expect(service.moveToTrash('file-1', 'user-2')).rejects.toThrow(
        'Not authorized to access this file',
      );
    });
  });

  describe('restoreFromTrash', () => {
    it('sets isDeleted=false and deletedAt=null', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-1',
        isDeleted: true,
        deletedAt: new Date(),
      };
      prisma.file.findUnique.mockResolvedValue(file);
      prisma.file.update.mockResolvedValue({ ...file, isDeleted: false, deletedAt: null });

      const result = (await service.restoreFromTrash('file-1', 'user-1')) as {
        isDeleted: boolean;
        deletedAt: Date | null;
      };

      expect(result.isDeleted).toBe(false);
      expect(result.deletedAt).toBeNull();
    });

    it('throws for non-trashed file', async () => {
      const file = {
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
        deletedAt: null,
      };
      prisma.file.findUnique.mockResolvedValue(file);

      await expect(service.restoreFromTrash('file-1', 'user-1')).rejects.toThrow(
        'File is not in trash',
      );
    });
  });

  describe('listTrash', () => {
    it('returns files with isDeleted=true', async () => {
      const trashedFiles = [
        { id: 'file-1', name: 'deleted.txt', isDeleted: true },
        { id: 'file-2', name: 'removed.pdf', isDeleted: true },
      ];
      prisma.file.findMany.mockResolvedValue(trashedFiles);

      const result = await service.listTrash('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.file.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      });
    });
  });

  describe('emptyTrash', () => {
    it('returns count of permanently deleted files', async () => {
      prisma.file.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.emptyTrash('user-1');

      expect(result).toBe(3);
      expect(prisma.file.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isDeleted: true },
      });
    });
  });

  describe('purgeExpired', () => {
    it('deletes files trashed more than 30 days ago', async () => {
      prisma.file.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.purgeExpired();

      expect(result).toBe(2);
      expect(prisma.file.deleteMany).toHaveBeenCalledWith({
        where: {
          isDeleted: true,
          deletedAt: { lt: expect.any(Date) },
        },
      });

      // Verify the date is approximately 30 days ago
      const callArgs = prisma.file.deleteMany.mock.calls[0]![0] as {
        where: { deletedAt: { lt: Date } };
      };
      const cutoffDate = callArgs.where.deletedAt.lt;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      expect(Math.abs(cutoffDate.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(1000);
    });
  });
});
