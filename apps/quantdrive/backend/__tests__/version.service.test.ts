import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VersionService } from '../services/version.service';

function createMockPrisma() {
  return {
    fileVersion: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    file: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('VersionService', () => {
  let service: VersionService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new VersionService(prisma as never);
  });

  describe('createVersion', () => {
    it('creates version with versionNumber 1 when no prior versions', async () => {
      prisma.file.findUnique.mockResolvedValue({
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
      });
      prisma.fileVersion.findMany.mockResolvedValue([]);
      prisma.fileVersion.create.mockImplementation(
        async (args: { data: Record<string, unknown> }) => {
          return { id: 'ver-1', ...args.data };
        },
      );

      const result = await service.createVersion({
        fileId: 'file-1',
        encryptedContent: 'encrypted',
        encryptionIV: 'iv-hex',
        encryptionAuthTag: 'tag-hex',
        encryptionKey: 'key-hex',
        size: 1024,
        userId: 'user-1',
      });

      expect(result.versionNumber).toBe(1);
      expect(result.encryptionKey).toBe('key-hex');
    });

    it('increments version number based on latest', async () => {
      prisma.file.findUnique.mockResolvedValue({
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
      });
      prisma.fileVersion.findMany.mockResolvedValue([{ versionNumber: 3 }]);
      prisma.fileVersion.create.mockImplementation(
        async (args: { data: Record<string, unknown> }) => {
          return { id: 'ver-4', ...args.data };
        },
      );

      const result = await service.createVersion({
        fileId: 'file-1',
        encryptedContent: 'encrypted',
        encryptionIV: 'iv-hex',
        encryptionAuthTag: 'tag-hex',
        encryptionKey: 'key-hex',
        size: 2048,
        userId: 'user-1',
      });

      expect(result.versionNumber).toBe(4);
    });
  });

  describe('listVersions', () => {
    it('returns versions for the file after owner check', async () => {
      prisma.file.findUnique.mockResolvedValue({
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
      });
      const versions = [
        { id: 'v-2', fileId: 'file-1', versionNumber: 2 },
        { id: 'v-1', fileId: 'file-1', versionNumber: 1 },
      ];
      prisma.fileVersion.findMany.mockResolvedValue(versions);

      const result = await service.listVersions('file-1', 'user-1');

      expect(result).toEqual(versions);
      expect(prisma.fileVersion.findMany).toHaveBeenCalledWith({
        where: { fileId: 'file-1' },
        orderBy: { versionNumber: 'desc' },
      });
    });
  });

  describe('getVersion', () => {
    it('returns version when found and user is authorized', async () => {
      const version = {
        id: 'ver-1',
        fileId: 'file-1',
        versionNumber: 1,
        encryptedContent: 'data',
        encryptionIV: 'iv',
        encryptionAuthTag: 'tag',
        size: 100,
        createdAt: new Date(),
      };
      prisma.fileVersion.findUnique.mockResolvedValue(version);
      prisma.file.findUnique.mockResolvedValue({
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
      });

      const result = await service.getVersion('ver-1', 'user-1');

      expect(result).toEqual(version);
    });

    it('throws 404 for missing version', async () => {
      prisma.fileVersion.findUnique.mockResolvedValue(null);

      await expect(service.getVersion('missing', 'user-1')).rejects.toThrow('Version not found');
    });
  });

  describe('restoreVersion', () => {
    it('updates file with version data including encryptionKey', async () => {
      const version = {
        id: 'ver-1',
        fileId: 'file-1',
        versionNumber: 1,
        encryptedContent: 'old-encrypted',
        encryptionIV: 'old-iv',
        encryptionAuthTag: 'old-tag',
        encryptionKey: 'old-key',
        size: 500,
        createdAt: new Date(),
      };
      prisma.fileVersion.findUnique.mockResolvedValue(version);
      prisma.file.findUnique.mockResolvedValue({
        id: 'file-1',
        userId: 'user-1',
        isDeleted: false,
      });
      prisma.file.update.mockResolvedValue({
        id: 'file-1',
        encryptedContent: 'old-encrypted',
      });

      const result = await service.restoreVersion('ver-1', 'user-1');

      expect(prisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: {
          encryptedContent: 'old-encrypted',
          encryptionIV: 'old-iv',
          encryptionAuthTag: 'old-tag',
          encryptionKey: 'old-key',
          size: 500,
          updatedAt: expect.any(Date),
        },
      });
      expect(result.fileId).toBe('file-1');
    });
  });

  describe('purgeExpiredVersions', () => {
    it('deletes versions older than 30 days', async () => {
      prisma.fileVersion.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.purgeExpiredVersions();

      expect(result).toBe(5);
      expect(prisma.fileVersion.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
        },
      });

      // Verify the date is approximately 30 days ago
      const callArgs = prisma.fileVersion.deleteMany.mock.calls[0]![0] as {
        where: { createdAt: { lt: Date } };
      };
      const cutoffDate = callArgs.where.createdAt.lt;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      expect(Math.abs(cutoffDate.getTime() - thirtyDaysAgo.getTime())).toBeLessThan(1000);
    });
  });
});
