import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FolderService } from '../services/folder.service';

function createMockPrisma() {
  return {
    folder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    file: {
      count: vi.fn(),
    },
  };
}

describe('FolderService', () => {
  let service: FolderService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new FolderService(prisma as never);
  });

  describe('createFolder', () => {
    it('creates a folder with path /name', async () => {
      prisma.folder.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return { id: 'folder-1', ...args.data };
      });

      const result = await service.createFolder({
        name: 'Documents',
        userId: 'user-1',
      });

      expect(result.path).toBe('/Documents');
      expect(result.name).toBe('Documents');
    });

    it('creates a nested folder with path /parent/child', async () => {
      const parentFolder = {
        id: 'parent-1',
        name: 'Documents',
        userId: 'user-1',
        parentId: null,
        path: '/Documents',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.folder.findUnique.mockResolvedValue(parentFolder);
      prisma.folder.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
        return { id: 'folder-2', ...args.data };
      });

      const result = await service.createFolder({
        name: 'Work',
        userId: 'user-1',
        parentId: 'parent-1',
      });

      expect(result.path).toBe('/Documents/Work');
    });
  });

  describe('getFolder', () => {
    it('returns folder when found and user is owner', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Documents',
        userId: 'user-1',
        parentId: null,
        path: '/Documents',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.folder.findUnique.mockResolvedValue(mockFolder);

      const result = await service.getFolder('folder-1', 'user-1');

      expect(result).toEqual(mockFolder);
    });

    it('throws 404 when folder not found', async () => {
      prisma.folder.findUnique.mockResolvedValue(null);

      await expect(service.getFolder('missing', 'user-1')).rejects.toThrow('Folder not found');
    });

    it('throws 403 for wrong user', async () => {
      const mockFolder = {
        id: 'folder-1',
        name: 'Documents',
        userId: 'user-1',
        parentId: null,
        path: '/Documents',
      };
      prisma.folder.findUnique.mockResolvedValue(mockFolder);

      await expect(service.getFolder('folder-1', 'user-2')).rejects.toThrow(
        'Not authorized to access this folder',
      );
    });
  });

  describe('listFolders', () => {
    it('returns array of folders', async () => {
      const folders = [
        { id: 'f-1', name: 'Documents', userId: 'user-1', path: '/Documents' },
        { id: 'f-2', name: 'Images', userId: 'user-1', path: '/Images' },
      ];
      prisma.folder.findMany.mockResolvedValue(folders);

      const result = await service.listFolders('user-1');

      expect(result).toEqual(folders);
      expect(result).toHaveLength(2);
    });
  });

  describe('moveFolder', () => {
    it('updates folder path to target parent path and cascades to descendants', async () => {
      const folder = {
        id: 'folder-1',
        name: 'Work',
        userId: 'user-1',
        parentId: null,
        path: '/Work',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const targetFolder = {
        id: 'folder-2',
        name: 'Documents',
        userId: 'user-1',
        parentId: null,
        path: '/Documents',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const childFolder = {
        id: 'folder-3',
        name: 'Reports',
        userId: 'user-1',
        parentId: 'folder-1',
        path: '/Work/Reports',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.folder.findUnique
        .mockResolvedValueOnce(folder) // getFolder call
        .mockResolvedValueOnce(targetFolder); // newParent lookup

      prisma.folder.update.mockResolvedValue({
        ...folder,
        parentId: 'folder-2',
        path: '/Documents/Work',
      });

      // findMany returns descendant folders for cascade
      prisma.folder.findMany.mockResolvedValue([childFolder]);

      const result = await service.moveFolder('folder-1', 'user-1', 'folder-2');

      expect(result.path).toBe('/Documents/Work');
      // Verify cascade update was called for the child
      expect(prisma.folder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'folder-3' },
          data: expect.objectContaining({ path: '/Documents/Work/Reports' }),
        }),
      );
    });
  });

  describe('renameFolder', () => {
    it('updates folder name and path', async () => {
      const folder = {
        id: 'folder-1',
        name: 'OldName',
        userId: 'user-1',
        parentId: null,
        path: '/OldName',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.folder.findUnique.mockResolvedValue(folder);
      prisma.folder.update.mockResolvedValue({
        ...folder,
        name: 'NewName',
        path: '/NewName',
      });
      prisma.folder.findMany.mockResolvedValue([]);

      const result = await service.renameFolder('folder-1', 'user-1', 'NewName');

      expect(result.name).toBe('NewName');
      expect(result.path).toBe('/NewName');
      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: 'folder-1' },
        data: expect.objectContaining({ name: 'NewName', path: '/NewName' }),
      });
    });
  });

  describe('deleteFolder', () => {
    it('deletes folder when it has no children and no files', async () => {
      const folder = {
        id: 'folder-1',
        name: 'Empty',
        userId: 'user-1',
        parentId: null,
        path: '/Empty',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.folder.findUnique.mockResolvedValue(folder);
      prisma.folder.count.mockResolvedValue(0);
      prisma.file.count.mockResolvedValue(0);
      prisma.folder.delete.mockResolvedValue(folder);

      const result = await service.deleteFolder('folder-1', 'user-1');

      expect(result).toEqual(folder);
      expect(prisma.folder.delete).toHaveBeenCalledWith({ where: { id: 'folder-1' } });
    });

    it('throws when folder has children', async () => {
      const folder = {
        id: 'folder-1',
        name: 'HasKids',
        userId: 'user-1',
        parentId: null,
        path: '/HasKids',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.folder.findUnique.mockResolvedValue(folder);
      prisma.folder.count.mockResolvedValue(3);

      await expect(service.deleteFolder('folder-1', 'user-1')).rejects.toThrow(
        'Cannot delete folder with children',
      );
    });

    it('throws when folder contains files', async () => {
      const folder = {
        id: 'folder-1',
        name: 'HasFiles',
        userId: 'user-1',
        parentId: null,
        path: '/HasFiles',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.folder.findUnique.mockResolvedValue(folder);
      prisma.folder.count.mockResolvedValue(0);
      prisma.file.count.mockResolvedValue(5);

      await expect(service.deleteFolder('folder-1', 'user-1')).rejects.toThrow(
        'Cannot delete folder that contains files',
      );
    });
  });

  describe('getFolderPath', () => {
    it('returns breadcrumb chain from root to current folder', async () => {
      const grandparent = {
        id: 'gp-1',
        name: 'Root',
        userId: 'user-1',
        parentId: null,
        path: '/Root',
      };
      const parent = {
        id: 'p-1',
        name: 'Documents',
        userId: 'user-1',
        parentId: 'gp-1',
        path: '/Root/Documents',
      };
      const current = {
        id: 'c-1',
        name: 'Work',
        userId: 'user-1',
        parentId: 'p-1',
        path: '/Root/Documents/Work',
      };

      prisma.folder.findUnique
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(grandparent);

      const result = await service.getFolderPath('c-1', 'user-1');

      expect(result).toEqual([
        { id: 'gp-1', name: 'Root' },
        { id: 'p-1', name: 'Documents' },
        { id: 'c-1', name: 'Work' },
      ]);
    });
  });
});
