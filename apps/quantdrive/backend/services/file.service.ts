import crypto from 'node:crypto';
import { createAppError } from '@quant/server-core';

/** Compute SHA-256 hash of plaintext content for duplicate detection */
function computeContentHash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/** Minimal PrismaClient interface for dependency injection */
export interface PrismaClient {
  file: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    count: (args: Record<string, unknown>) => Promise<number>;
  };
  fileVersion: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  };
}

export interface FileRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  encryptedContent: string;
  encryptionIV: string;
  encryptionAuthTag: string;
  encryptionKey: string;
  contentHash: string;
  userId: string;
  folderId: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadFileInput {
  name: string;
  content: Buffer;
  mimeType: string;
  userId: string;
  folderId?: string;
}

export interface DownloadFileResult {
  name: string;
  content: Buffer;
  mimeType: string;
  size: number;
}

export interface UpdateFileInput {
  name?: string;
  content?: Buffer;
}

export class FileService {
  constructor(private readonly prisma: PrismaClient) {}

  async uploadFile(input: UploadFileInput): Promise<FileRecord> {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(input.content), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const contentHash = computeContentHash(input.content);

    const file = await this.prisma.file.create({
      data: {
        name: input.name,
        mimeType: input.mimeType,
        size: input.content.length,
        encryptedContent: encrypted.toString('base64'),
        encryptionIV: iv.toString('hex'),
        encryptionAuthTag: authTag.toString('hex'),
        encryptionKey: key.toString('hex'),
        contentHash,
        userId: input.userId,
        folderId: input.folderId ?? null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return file as unknown as FileRecord;
  }

  async downloadFile(fileId: string, userId: string): Promise<DownloadFileResult> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      throw createAppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    const record = file as unknown as FileRecord;

    if (record.userId !== userId) {
      throw createAppError('Not authorized to access this file', 403, 'UNAUTHORIZED');
    }

    if (record.isDeleted) {
      throw createAppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    const key = Buffer.from(record.encryptionKey, 'hex');
    const iv = Buffer.from(record.encryptionIV, 'hex');
    const authTag = Buffer.from(record.encryptionAuthTag, 'hex');
    const encryptedContent = Buffer.from(record.encryptedContent, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

    return {
      name: record.name,
      content: decrypted,
      mimeType: record.mimeType,
      size: record.size,
    };
  }

  async getFile(fileId: string, userId: string): Promise<FileRecord> {
    return this.getFileMetadata(fileId, userId);
  }

  async listFiles(
    userId: string,
    folderId?: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<FileRecord[]> {
    const where: Record<string, unknown> = { userId, isDeleted: false };
    if (folderId !== undefined) {
      where['folderId'] = folderId;
    }
    const files = await this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 100,
      skip: opts?.offset ?? 0,
    });
    return files as unknown as FileRecord[];
  }

  async moveFile(fileId: string, userId: string, targetFolderId: string): Promise<FileRecord> {
    await this.getFileMetadata(fileId, userId);
    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { folderId: targetFolderId, updatedAt: new Date() },
    });
    return updated as unknown as FileRecord;
  }

  async copyFile(fileId: string, userId: string, targetFolderId: string): Promise<FileRecord> {
    const original = await this.getFileMetadata(fileId, userId);

    // Decrypt the original content
    const key = Buffer.from(original.encryptionKey, 'hex');
    const iv = Buffer.from(original.encryptionIV, 'hex');
    const authTag = Buffer.from(original.encryptionAuthTag, 'hex');
    const encryptedContent = Buffer.from(original.encryptedContent, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

    // Re-encrypt with a fresh key, IV, and auth tag for the copy
    const newKey = crypto.randomBytes(32);
    const newIv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', newKey, newIv);
    const newEncrypted = Buffer.concat([cipher.update(decrypted), cipher.final()]);
    const newAuthTag = cipher.getAuthTag();

    const copy = await this.prisma.file.create({
      data: {
        name: `${original.name} (copy)`,
        mimeType: original.mimeType,
        size: original.size,
        encryptedContent: newEncrypted.toString('base64'),
        encryptionIV: newIv.toString('hex'),
        encryptionAuthTag: newAuthTag.toString('hex'),
        encryptionKey: newKey.toString('hex'),
        contentHash: original.contentHash,
        userId,
        folderId: targetFolderId,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return copy as unknown as FileRecord;
  }

  async getFileMetadata(fileId: string, userId: string): Promise<FileRecord> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });

    if (!file) {
      throw createAppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    const record = file as unknown as FileRecord;

    if (record.userId !== userId) {
      throw createAppError('Not authorized to access this file', 403, 'UNAUTHORIZED');
    }

    if (record.isDeleted) {
      throw createAppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    return record;
  }

  async updateFile(fileId: string, userId: string, input: UpdateFileInput): Promise<FileRecord> {
    const existing = await this.getFileMetadata(fileId, userId);

    const data: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name) {
      data['name'] = input.name;
    }

    if (input.content) {
      // Save current version before updating (including encryption key)
      await this.prisma.fileVersion.create({
        data: {
          fileId,
          encryptedContent: existing.encryptedContent,
          encryptionIV: existing.encryptionIV,
          encryptionAuthTag: existing.encryptionAuthTag,
          encryptionKey: existing.encryptionKey,
          size: existing.size,
          createdAt: new Date(),
        },
      });

      // Re-encrypt with new key
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(input.content), cipher.final()]);
      const authTag = cipher.getAuthTag();

      data['encryptedContent'] = encrypted.toString('base64');
      data['encryptionIV'] = iv.toString('hex');
      data['encryptionAuthTag'] = authTag.toString('hex');
      data['encryptionKey'] = key.toString('hex');
      data['contentHash'] = computeContentHash(input.content);
      data['size'] = input.content.length;
    }

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data,
    });

    return updated as unknown as FileRecord;
  }

  async deleteFile(fileId: string, userId: string): Promise<FileRecord> {
    await this.getFileMetadata(fileId, userId);

    const deleted = await this.prisma.file.update({
      where: { id: fileId },
      data: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    });

    return deleted as unknown as FileRecord;
  }
}
