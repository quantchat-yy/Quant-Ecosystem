// ============================================================================
// QuantMail - Drive Service
// File storage: upload, folder tree, sharing, versions, quotas, deduplication
// ============================================================================

interface DriveFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType: string;
  size: number;
  path: string;
  parentId: string | null;
  ownerId: string;
  hash?: string;
  createdAt: Date;
  modifiedAt: Date;
  isStarred: boolean;
  isTrashed: boolean;
  trashedAt?: Date;
}

interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  hash: string;
  createdAt: Date;
  createdBy: string;
  storagePath: string;
}

interface SharePermission {
  fileId: string;
  userId: string;
  email: string;
  permission: 'view' | 'edit' | 'admin';
  createdAt: Date;
  expiresAt?: Date;
}

interface StorageQuota {
  userId: string;
  used: number;
  total: number;
  fileCount: number;
  lastCalculated: Date;
}

interface UploadChunk {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  data: Buffer;
  size: number;
}

interface FolderTree {
  id: string;
  name: string;
  children: FolderTree[];
  fileCount: number;
}

const files = new Map<string, DriveFile>();
const versions = new Map<string, FileVersion[]>();
const shares = new Map<string, SharePermission[]>();
const quotas = new Map<string, StorageQuota>();
const uploadSessions = new Map<string, { chunks: Map<number, Buffer>; fileName: string; totalSize: number; totalChunks: number }>();
const hashIndex = new Map<string, string>();

const generateId = (): string => `drv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const computeHash = (data: string | Buffer): string => {
  let hash = 0;
  const str = typeof data === 'string' ? data : data.toString('base64').slice(0, 100);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const getDefaultQuota = (userId: string): StorageQuota => ({
  userId, used: 0, total: 15 * 1024 * 1024 * 1024, fileCount: 0, lastCalculated: new Date()
});

export class DriveService {
  static async uploadFile(userId: string, fileName: string, mimeType: string, size: number, content: Buffer, parentId: string | null = null): Promise<DriveFile> {
    const quota = quotas.get(userId) || getDefaultQuota(userId);
    if (quota.used + size > quota.total) {
      throw new Error('Storage quota exceeded');
    }

    const contentHash = computeHash(content);
    const existingFileId = hashIndex.get(`${userId}:${contentHash}`);
    if (existingFileId && files.has(existingFileId)) {
      const existing = files.get(existingFileId)!;
      if (existing.name === fileName && existing.parentId === parentId) {
        const newVersion = await DriveService.createVersion(existing.id, userId, size, content);
        existing.modifiedAt = new Date();
        existing.size = size;
        return existing;
      }
    }

    const fileId = generateId();
    const path = parentId ? `${DriveService.getFilePath(parentId)}/${fileName}` : `/${fileName}`;
    const file: DriveFile = {
      id: fileId, name: fileName, type: 'file', mimeType, size, path,
      parentId, ownerId: userId, hash: contentHash,
      createdAt: new Date(), modifiedAt: new Date(), isStarred: false, isTrashed: false
    };

    files.set(fileId, file);
    hashIndex.set(`${userId}:${contentHash}`, fileId);
    await DriveService.createVersion(fileId, userId, size, content);
    quota.used += size;
    quota.fileCount += 1;
    quotas.set(userId, quota);
    return file;
  }

  static async initiateChunkedUpload(userId: string, fileName: string, totalSize: number, totalChunks: number): Promise<string> {
    const uploadId = generateId();
    uploadSessions.set(uploadId, { chunks: new Map(), fileName, totalSize, totalChunks });
    return uploadId;
  }

  static async uploadChunk(uploadId: string, chunk: UploadChunk): Promise<{ complete: boolean; progress: number }> {
    const session = uploadSessions.get(uploadId);
    if (!session) throw new Error('Upload session not found');
    session.chunks.set(chunk.chunkIndex, chunk.data);
    const progress = (session.chunks.size / session.totalChunks) * 100;
    return { complete: session.chunks.size === session.totalChunks, progress };
  }

  static async completeChunkedUpload(userId: string, uploadId: string, parentId: string | null, mimeType: string): Promise<DriveFile> {
    const session = uploadSessions.get(uploadId);
    if (!session) throw new Error('Upload session not found');
    const sortedChunks = Array.from(session.chunks.entries()).sort(([a], [b]) => a - b);
    const combined = Buffer.concat(sortedChunks.map(([, data]) => data));
    uploadSessions.delete(uploadId);
    return DriveService.uploadFile(userId, session.fileName, mimeType, combined.length, combined, parentId);
  }

  static async createFolder(userId: string, name: string, parentId: string | null = null): Promise<DriveFile> {
    const existing = Array.from(files.values()).find(f => f.ownerId === userId && f.parentId === parentId && f.name === name && f.type === 'folder' && !f.isTrashed);
    if (existing) throw new Error('Folder already exists');
    const folderId = generateId();
    const path = parentId ? `${DriveService.getFilePath(parentId)}/${name}` : `/${name}`;
    const folder: DriveFile = {
      id: folderId, name, type: 'folder', mimeType: 'application/folder', size: 0, path,
      parentId, ownerId: userId, createdAt: new Date(), modifiedAt: new Date(), isStarred: false, isTrashed: false
    };
    files.set(folderId, folder);
    return folder;
  }

  static async listFiles(userId: string, folderId: string | null = null, includeShared: boolean = true): Promise<DriveFile[]> {
    const ownFiles = Array.from(files.values()).filter(f => f.ownerId === userId && f.parentId === folderId && !f.isTrashed);
    if (!includeShared) return ownFiles;
    const sharedFileIds = Array.from(shares.values()).flat().filter(s => s.userId === userId || s.email.includes(userId)).map(s => s.fileId);
    const sharedFiles = sharedFileIds.map(id => files.get(id)).filter((f): f is DriveFile => !!f && f.parentId === folderId && !f.isTrashed);
    return [...ownFiles, ...sharedFiles];
  }

  static async getFolderTree(userId: string): Promise<FolderTree[]> {
    const buildTree = (parentId: string | null): FolderTree[] => {
      return Array.from(files.values())
        .filter(f => f.ownerId === userId && f.parentId === parentId && f.type === 'folder' && !f.isTrashed)
        .map(folder => ({
          id: folder.id, name: folder.name,
          children: buildTree(folder.id),
          fileCount: Array.from(files.values()).filter(f => f.parentId === folder.id && !f.isTrashed).length
        }));
    };
    return buildTree(null);
  }

  static async shareFile(fileId: string, ownerUserId: string, targetEmail: string, permission: 'view' | 'edit' | 'admin', expiresAt?: Date): Promise<SharePermission> {
    const file = files.get(fileId);
    if (!file) throw new Error('File not found');
    if (file.ownerId !== ownerUserId) throw new Error('Only the owner can share files');
    const share: SharePermission = { fileId, userId: targetEmail, email: targetEmail, permission, createdAt: new Date(), expiresAt };
    const fileShares = shares.get(fileId) || [];
    const existingIdx = fileShares.findIndex(s => s.email === targetEmail);
    if (existingIdx >= 0) { fileShares[existingIdx] = share; }
    else { fileShares.push(share); }
    shares.set(fileId, fileShares);
    return share;
  }

  static async removeShare(fileId: string, ownerUserId: string, targetEmail: string): Promise<void> {
    const file = files.get(fileId);
    if (!file || file.ownerId !== ownerUserId) throw new Error('Not authorized');
    const fileShares = shares.get(fileId) || [];
    shares.set(fileId, fileShares.filter(s => s.email !== targetEmail));
  }

  static async getShares(fileId: string): Promise<SharePermission[]> {
    return shares.get(fileId) || [];
  }

  static async createVersion(fileId: string, userId: string, size: number, content: Buffer): Promise<FileVersion> {
    const fileVersions = versions.get(fileId) || [];
    const version: FileVersion = {
      id: generateId(), fileId, version: fileVersions.length + 1, size,
      hash: computeHash(content), createdAt: new Date(), createdBy: userId,
      storagePath: `/storage/${fileId}/v${fileVersions.length + 1}`
    };
    fileVersions.push(version);
    versions.set(fileId, fileVersions);
    return version;
  }

  static async getVersionHistory(fileId: string): Promise<FileVersion[]> {
    return (versions.get(fileId) || []).sort((a, b) => b.version - a.version);
  }

  static async restoreVersion(fileId: string, versionId: string): Promise<DriveFile> {
    const file = files.get(fileId);
    if (!file) throw new Error('File not found');
    const fileVersions = versions.get(fileId) || [];
    const targetVersion = fileVersions.find(v => v.id === versionId);
    if (!targetVersion) throw new Error('Version not found');
    file.size = targetVersion.size;
    file.modifiedAt = new Date();
    return file;
  }

  static async moveFile(fileId: string, userId: string, targetFolderId: string | null): Promise<DriveFile> {
    const file = files.get(fileId);
    if (!file) throw new Error('File not found');
    if (file.ownerId !== userId) throw new Error('Not authorized');
    if (file.type === 'folder' && targetFolderId) {
      const isDescendant = DriveService.isDescendant(targetFolderId, fileId);
      if (isDescendant) throw new Error('Cannot move folder into its own descendant');
    }
    file.parentId = targetFolderId;
    file.path = targetFolderId ? `${DriveService.getFilePath(targetFolderId)}/${file.name}` : `/${file.name}`;
    file.modifiedAt = new Date();
    return file;
  }

  static async trashFile(fileId: string, userId: string): Promise<void> {
    const file = files.get(fileId);
    if (!file || file.ownerId !== userId) throw new Error('Not authorized');
    file.isTrashed = true;
    file.trashedAt = new Date();
    if (file.type === 'folder') {
      const children = Array.from(files.values()).filter(f => f.parentId === fileId);
      for (const child of children) { await DriveService.trashFile(child.id, userId); }
    }
    const quota = quotas.get(userId) || getDefaultQuota(userId);
    quota.used = Math.max(0, quota.used - file.size);
    quotas.set(userId, quota);
  }

  static async permanentDelete(fileId: string, userId: string): Promise<void> {
    const file = files.get(fileId);
    if (!file || file.ownerId !== userId) throw new Error('Not authorized');
    files.delete(fileId);
    versions.delete(fileId);
    shares.delete(fileId);
    if (file.hash) hashIndex.delete(`${userId}:${file.hash}`);
  }

  static async getQuota(userId: string): Promise<StorageQuota> {
    if (!quotas.has(userId)) {
      const userFiles = Array.from(files.values()).filter(f => f.ownerId === userId && !f.isTrashed);
      const used = userFiles.reduce((sum, f) => sum + f.size, 0);
      const quota: StorageQuota = { userId, used, total: 15 * 1024 * 1024 * 1024, fileCount: userFiles.length, lastCalculated: new Date() };
      quotas.set(userId, quota);
    }
    return quotas.get(userId)!;
  }

  static async searchFiles(userId: string, query: string): Promise<DriveFile[]> {
    const q = query.toLowerCase();
    return Array.from(files.values()).filter(f =>
      (f.ownerId === userId || (shares.get(f.id) || []).some(s => s.email.includes(userId))) &&
      !f.isTrashed && f.name.toLowerCase().includes(q)
    );
  }

  static async starFile(fileId: string, userId: string): Promise<void> {
    const file = files.get(fileId);
    if (file) file.isStarred = true;
  }

  static async unstarFile(fileId: string, userId: string): Promise<void> {
    const file = files.get(fileId);
    if (file) file.isStarred = false;
  }

  private static getFilePath(fileId: string): string {
    const file = files.get(fileId);
    if (!file) return '';
    return file.path || `/${file.name}`;
  }

  private static isDescendant(targetId: string, folderId: string): boolean {
    let current = files.get(targetId);
    while (current && current.parentId) {
      if (current.parentId === folderId) return true;
      current = files.get(current.parentId);
    }
    return false;
  }
}

export default DriveService;
