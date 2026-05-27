import { describe, it, expect, beforeEach } from 'vitest';
import { ParagraphPermissionsService } from '../services/paragraph-permissions.service';

describe('ParagraphPermissionsService', () => {
  let service: ParagraphPermissionsService;

  beforeEach(() => {
    service = new ParagraphPermissionsService();
  });

  describe('setPermission', () => {
    it('sets a permission for a user on a paragraph', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'owner');

      const perms = service.getPermissions('doc-1', 'para-1');
      expect(perms).toHaveLength(1);
      expect(perms[0]).toEqual({
        docId: 'doc-1',
        paragraphId: 'para-1',
        userId: 'user-1',
        role: 'owner',
      });
    });

    it('overwrites existing permission', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'editor');
      service.setPermission('doc-1', 'para-1', 'user-1', 'viewer');

      const perms = service.getPermissions('doc-1', 'para-1');
      expect(perms).toHaveLength(1);
      expect(perms[0].role).toBe('viewer');
    });
  });

  describe('checkPermission', () => {
    it('allows owner to read, write, and delete', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'owner');

      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'read')).toBe(true);
      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'write')).toBe(true);
      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'delete')).toBe(true);
    });

    it('allows editor to read and write but not delete', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'editor');

      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'read')).toBe(true);
      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'write')).toBe(true);
      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'delete')).toBe(false);
    });

    it('allows viewer to read only', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'viewer');

      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'read')).toBe(true);
      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'write')).toBe(false);
      expect(service.checkPermission('doc-1', 'para-1', 'user-1', 'delete')).toBe(false);
    });

    it('denies access if user has no permission entry', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'owner');

      // user-2 has no permission
      expect(service.checkPermission('doc-1', 'para-1', 'user-2', 'read')).toBe(false);
      expect(service.checkPermission('doc-1', 'para-1', 'user-2', 'write')).toBe(false);
    });

    it('allows access when no permissions are set for document', () => {
      // No permissions set at all - open access
      expect(service.checkPermission('doc-1', 'para-1', 'anyone', 'write')).toBe(true);
    });

    it('allows access when no permissions are set for specific paragraph', () => {
      // Permission set on another paragraph but not this one
      service.setPermission('doc-1', 'para-2', 'user-1', 'viewer');

      expect(service.checkPermission('doc-1', 'para-1', 'anyone', 'write')).toBe(true);
    });
  });

  describe('getPermissions', () => {
    it('returns empty array for unknown doc/paragraph', () => {
      expect(service.getPermissions('doc-1', 'para-1')).toEqual([]);
    });

    it('returns all permissions for a paragraph', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'owner');
      service.setPermission('doc-1', 'para-1', 'user-2', 'editor');
      service.setPermission('doc-1', 'para-1', 'user-3', 'viewer');

      const perms = service.getPermissions('doc-1', 'para-1');
      expect(perms).toHaveLength(3);
    });
  });

  describe('integration with YjsServer permission check', () => {
    it('blocks unauthorized write attempts', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'viewer');

      // Viewer cannot write
      const canWrite = service.checkPermission('doc-1', 'para-1', 'user-1', 'write');
      expect(canWrite).toBe(false);
    });

    it('allows authorized write attempts', () => {
      service.setPermission('doc-1', 'para-1', 'user-1', 'editor');

      const canWrite = service.checkPermission('doc-1', 'para-1', 'user-1', 'write');
      expect(canWrite).toBe(true);
    });
  });
});
