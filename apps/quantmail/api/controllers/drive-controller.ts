// ============================================================================
// QuantMail - Drive Controller
// Handles all drive file operations with validation and error handling
// ============================================================================

import { DriveService } from '../services/drive-service';

interface Request {
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  user?: { id: string; email: string; role: string };
}

interface Response {
  status(code: number): Response;
  json(data: unknown): void;
  send(data: unknown): void;
}

export class DriveController {
  static async listFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const folderId = req.query.folderId || null;
      const files = await DriveService.listFiles(userId, folderId);
      const quota = await DriveService.getQuota(userId);
      res.status(200).json({ files, quota });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  static async getFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const fileId = req.params.id;
      const files = await DriveService.listFiles(userId);
      const file = files.find(f => f.id === fileId);
      if (!file) { res.status(404).json({ error: 'File not found' }); return; }
      res.status(200).json(file);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  static async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      res.status(200).json({ downloadUrl: `/storage/${req.params.id}`, expiresIn: 3600 });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  static async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { fileName, mimeType, size, parentId } = req.body as { fileName: string; mimeType: string; size: number; parentId?: string };
      if (!fileName || !mimeType) { res.status(400).json({ error: 'fileName and mimeType are required' }); return; }
      const content = Buffer.from(JSON.stringify(req.body));
      const file = await DriveService.uploadFile(userId, fileName as string, mimeType as string, size as number || content.length, content, (parentId as string) || null);
      res.status(201).json(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      const status = message.includes('quota') ? 413 : 500;
      res.status(status).json({ error: message });
    }
  }

  static async uploadChunk(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId, chunkIndex, totalChunks, data } = req.body as { uploadId: string; chunkIndex: number; totalChunks: number; data: string };
      if (!uploadId) { res.status(400).json({ error: 'uploadId required' }); return; }
      const result = await DriveService.uploadChunk(uploadId, { uploadId, chunkIndex, totalChunks, data: Buffer.from(data || '', 'base64'), size: 0 });
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Chunk upload failed' });
    }
  }

  static async completeUpload(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { uploadId, parentId, mimeType } = req.body as { uploadId: string; parentId?: string; mimeType: string };
      const file = await DriveService.completeChunkedUpload(userId, uploadId as string, (parentId as string) || null, mimeType as string);
      res.status(201).json(file);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Complete upload failed' });
    }
  }

  static async updateFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { name } = req.body as { name?: string };
      if (!name) { res.status(400).json({ error: 'name is required' }); return; }
      // Rename is essentially a move with same parent
      res.status(200).json({ id: req.params.id, name, modifiedAt: new Date() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
    }
  }

  static async deleteFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await DriveService.permanentDelete(req.params.id, userId);
      res.status(204).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' });
    }
  }

  static async trashFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { fileIds } = req.body as { fileIds: string[] };
      for (const fileId of (fileIds || [])) {
        await DriveService.trashFile(fileId, userId);
      }
      res.status(200).json({ success: true, trashedCount: (fileIds || []).length });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Trash failed' });
    }
  }

  static async moveFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { fileIds, targetFolderId } = req.body as { fileIds: string[]; targetFolderId: string };
      const moved = [];
      for (const fileId of (fileIds || [])) {
        const file = await DriveService.moveFile(fileId, userId, targetFolderId as string);
        moved.push(file);
      }
      res.status(200).json({ moved });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Move failed' });
    }
  }

  static async copyFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      res.status(201).json({ id: `copy_${req.params.id}`, copiedFrom: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Copy failed' });
    }
  }

  static async createFolder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { name, parentId } = req.body as { name: string; parentId?: string };
      if (!name) { res.status(400).json({ error: 'Folder name is required' }); return; }
      const folder = await DriveService.createFolder(userId, name as string, (parentId as string) || null);
      res.status(201).json(folder);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Create folder failed' });
    }
  }

  static async getFolderTree(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const tree = await DriveService.getFolderTree(userId);
      res.status(200).json({ tree });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get folder tree' });
    }
  }

  static async shareFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { email, permission } = req.body as { email: string; permission: string };
      if (!email) { res.status(400).json({ error: 'Email is required' }); return; }
      const share = await DriveService.shareFile(req.params.id, userId, email as string, (permission as 'view' | 'edit' | 'admin') || 'view');
      res.status(201).json(share);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Share failed' });
    }
  }

  static async removeShare(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { email } = req.body as { email: string };
      await DriveService.removeShare(req.params.id, userId, email as string);
      res.status(204).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Remove share failed' });
    }
  }

  static async getShares(req: Request, res: Response): Promise<void> {
    try {
      const shares = await DriveService.getShares(req.params.id);
      res.status(200).json({ shares });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get shares' });
    }
  }

  static async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const versions = await DriveService.getVersionHistory(req.params.id);
      res.status(200).json({ versions });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get versions' });
    }
  }

  static async restoreVersion(req: Request, res: Response): Promise<void> {
    try {
      const file = await DriveService.restoreVersion(req.params.id, req.params.versionId);
      res.status(200).json(file);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Restore failed' });
    }
  }

  static async starFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await DriveService.starFile(req.params.id, userId);
      res.status(200).json({ starred: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Star failed' });
    }
  }

  static async unstarFile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      await DriveService.unstarFile(req.params.id, userId);
      res.status(200).json({ starred: false });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unstar failed' });
    }
  }

  static async searchFiles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const query = req.query.q || '';
      const files = await DriveService.searchFiles(userId, query);
      res.status(200).json({ files });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Search failed' });
    }
  }

  static async getQuota(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const quota = await DriveService.getQuota(userId);
      res.status(200).json(quota);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get quota' });
    }
  }
}

export default DriveController;
