import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShareService } from '../services/share.service';

function createMockPrisma() {
  return {
    share: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    file: {
      findUnique: vi.fn(),
    },
    folder: {
      findUnique: vi.fn(),
    },
  };
}

describe('ShareService', () => {
  let service: ShareService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ShareService(prisma as never);
  });

  describe('shareFile', () => {
    it('creates a share with status pending', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'Recipient' });
      prisma.file.findUnique.mockResolvedValue({ id: 'file-1', userId: 'user-1' });
      prisma.share.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return { id: 'share-1', ...args.data };
      });

      const result = await service.shareFile({
        fileId: 'file-1',
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        encryptedFileKey: 'encrypted-key-data',
        permission: 'read',
      });

      expect(result.status).toBe('pending');
      expect(result.fileId).toBe('file-1');
    });

    it('throws when recipient not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.shareFile({
          fileId: 'file-1',
          ownerUserId: 'user-1',
          sharedWithUserId: 'nonexistent',
          encryptedFileKey: 'key',
          permission: 'read',
        }),
      ).rejects.toThrow('Recipient user not found');
    });

    it('throws when file not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'Recipient' });
      prisma.file.findUnique.mockResolvedValue(null);

      await expect(
        service.shareFile({
          fileId: 'file-missing',
          ownerUserId: 'user-1',
          sharedWithUserId: 'user-2',
          encryptedFileKey: 'key',
          permission: 'read',
        }),
      ).rejects.toThrow('File not found');
    });

    it('throws when caller does not own the file', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'Recipient' });
      prisma.file.findUnique.mockResolvedValue({ id: 'file-1', userId: 'user-other' });

      await expect(
        service.shareFile({
          fileId: 'file-1',
          ownerUserId: 'user-1',
          sharedWithUserId: 'user-2',
          encryptedFileKey: 'key',
          permission: 'read',
        }),
      ).rejects.toThrow('Not authorized to share this file');
    });
  });

  describe('shareFolder', () => {
    it('creates a share with folderId set and fileId null', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'Recipient' });
      prisma.folder.findUnique.mockResolvedValue({ id: 'folder-1', userId: 'user-1' });
      prisma.share.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return { id: 'share-2', ...args.data };
      });

      const result = await service.shareFolder({
        folderId: 'folder-1',
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        encryptedFileKey: 'encrypted-folder-key',
        permission: 'write',
      });

      expect(result.folderId).toBe('folder-1');
      expect(result.fileId).toBeNull();
      expect(result.status).toBe('pending');
    });

    it('throws when caller does not own the folder', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'Recipient' });
      prisma.folder.findUnique.mockResolvedValue({ id: 'folder-1', userId: 'user-other' });

      await expect(
        service.shareFolder({
          folderId: 'folder-1',
          ownerUserId: 'user-1',
          sharedWithUserId: 'user-2',
          encryptedFileKey: 'key',
          permission: 'read',
        }),
      ).rejects.toThrow('Not authorized to share this folder');
    });

    it('throws when folder not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', name: 'Recipient' });
      prisma.folder.findUnique.mockResolvedValue(null);

      await expect(
        service.shareFolder({
          folderId: 'folder-missing',
          ownerUserId: 'user-1',
          sharedWithUserId: 'user-2',
          encryptedFileKey: 'key',
          permission: 'read',
        }),
      ).rejects.toThrow('Folder not found');
    });
  });

  describe('acceptShare', () => {
    it('updates share status to accepted', async () => {
      const pendingShare = {
        id: 'share-1',
        fileId: 'file-1',
        folderId: null,
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        encryptedFileKey: 'key',
        permission: 'read',
        status: 'pending',
        createdAt: new Date(),
      };
      prisma.share.findUnique.mockResolvedValue(pendingShare);
      prisma.share.update.mockResolvedValue({ ...pendingShare, status: 'accepted' });

      const result = await service.acceptShare('share-1', 'user-2');

      expect(result.status).toBe('accepted');
    });

    it('throws for wrong user (not sharedWithUserId)', async () => {
      const pendingShare = {
        id: 'share-1',
        fileId: 'file-1',
        folderId: null,
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        status: 'pending',
      };
      prisma.share.findUnique.mockResolvedValue(pendingShare);

      await expect(service.acceptShare('share-1', 'user-3')).rejects.toThrow(
        'Not authorized to accept this share',
      );
    });

    it('throws for non-pending share', async () => {
      const acceptedShare = {
        id: 'share-1',
        fileId: 'file-1',
        folderId: null,
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        status: 'accepted',
      };
      prisma.share.findUnique.mockResolvedValue(acceptedShare);

      await expect(service.acceptShare('share-1', 'user-2')).rejects.toThrow(
        'Share is not in pending state',
      );
    });
  });

  describe('revokeShare', () => {
    it('updates share status to revoked', async () => {
      const share = {
        id: 'share-1',
        fileId: 'file-1',
        folderId: null,
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        status: 'accepted',
      };
      prisma.share.findUnique.mockResolvedValue(share);
      prisma.share.update.mockResolvedValue({ ...share, status: 'revoked' });

      const result = await service.revokeShare('share-1', 'user-1');

      expect(result.status).toBe('revoked');
    });

    it('throws for non-owner', async () => {
      const share = {
        id: 'share-1',
        fileId: 'file-1',
        folderId: null,
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        status: 'accepted',
      };
      prisma.share.findUnique.mockResolvedValue(share);

      await expect(service.revokeShare('share-1', 'user-2')).rejects.toThrow(
        'Not authorized to revoke this share',
      );
    });
  });

  describe('listShares', () => {
    it('returns shares for the user', async () => {
      const shares = [
        { id: 'share-1', ownerUserId: 'user-1', sharedWithUserId: 'user-2' },
        { id: 'share-2', ownerUserId: 'user-3', sharedWithUserId: 'user-1' },
      ];
      prisma.share.findMany.mockResolvedValue(shares);

      const result = await service.listShares('user-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('getShare', () => {
    it('returns share when user is owner or recipient', async () => {
      const share = {
        id: 'share-1',
        fileId: 'file-1',
        folderId: null,
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        status: 'accepted',
      };
      prisma.share.findUnique.mockResolvedValue(share);

      const result = await service.getShare('share-1', 'user-1');
      expect(result.id).toBe('share-1');
    });

    it('throws 403 when user is neither owner nor recipient', async () => {
      const share = {
        id: 'share-1',
        fileId: 'file-1',
        folderId: null,
        ownerUserId: 'user-1',
        sharedWithUserId: 'user-2',
        status: 'accepted',
      };
      prisma.share.findUnique.mockResolvedValue(share);

      await expect(service.getShare('share-1', 'user-3')).rejects.toThrow(
        'Not authorized to access this share',
      );
    });
  });
});
