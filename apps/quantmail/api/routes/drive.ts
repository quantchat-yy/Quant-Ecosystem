// ============================================================================
// QuantMail - Drive Routes
// File storage CRUD: upload, download, share, versions, folders
// ============================================================================

import { Router } from '@quant/server';
import { DriveController } from '../controllers/drive-controller';

export function registerDriveRoutes(router: Router): void {
  // File operations
  router.register('GET', '/api/drive/files', DriveController.listFiles);
  router.register('GET', '/api/drive/files/:id', DriveController.getFile);
  router.register('GET', '/api/drive/files/:id/download', DriveController.downloadFile);
  router.register('POST', '/api/drive/upload', DriveController.uploadFile);
  router.register('POST', '/api/drive/upload/chunk', DriveController.uploadChunk);
  router.register('POST', '/api/drive/upload/complete', DriveController.completeUpload);
  router.register('PUT', '/api/drive/files/:id', DriveController.updateFile);
  router.register('DELETE', '/api/drive/files/:id', DriveController.deleteFile);
  router.register('POST', '/api/drive/files/trash', DriveController.trashFiles);
  router.register('POST', '/api/drive/files/move', DriveController.moveFiles);
  router.register('POST', '/api/drive/files/:id/copy', DriveController.copyFile);

  // Folder operations
  router.register('POST', '/api/drive/folders', DriveController.createFolder);
  router.register('GET', '/api/drive/folders/tree', DriveController.getFolderTree);

  // Sharing
  router.register('POST', '/api/drive/files/:id/share', DriveController.shareFile);
  router.register('DELETE', '/api/drive/files/:id/share', DriveController.removeShare);
  router.register('GET', '/api/drive/files/:id/shares', DriveController.getShares);

  // Versions
  router.register('GET', '/api/drive/files/:id/versions', DriveController.getVersions);
  router.register('POST', '/api/drive/files/:id/versions/:versionId/restore', DriveController.restoreVersion);

  // Star
  router.register('PUT', '/api/drive/files/:id/star', DriveController.starFile);
  router.register('DELETE', '/api/drive/files/:id/star', DriveController.unstarFile);

  // Search and quota
  router.register('GET', '/api/drive/search', DriveController.searchFiles);
  router.register('GET', '/api/drive/quota', DriveController.getQuota);
}

export default registerDriveRoutes;
