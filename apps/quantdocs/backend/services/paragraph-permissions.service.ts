/**
 * ParagraphPermissionsService - Per-paragraph permission enforcement for collaborative docs.
 * Supports owner, editor, viewer roles with read, write, delete actions.
 */

export type PermissionRole = 'owner' | 'editor' | 'viewer';
export type PermissionAction = 'read' | 'write' | 'delete';

export interface ParagraphPermission {
  docId: string;
  paragraphId: string;
  userId: string;
  role: PermissionRole;
}

const ROLE_ACTIONS: Record<PermissionRole, PermissionAction[]> = {
  owner: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read'],
};

export class ParagraphPermissionsService {
  private readonly permissions: Map<string, Map<string, Map<string, PermissionRole>>> = new Map();

  setPermission(docId: string, paragraphId: string, userId: string, role: PermissionRole): void {
    let docPerms = this.permissions.get(docId);
    if (!docPerms) {
      docPerms = new Map();
      this.permissions.set(docId, docPerms);
    }

    let paraPerms = docPerms.get(paragraphId);
    if (!paraPerms) {
      paraPerms = new Map();
      docPerms.set(paragraphId, paraPerms);
    }

    paraPerms.set(userId, role);
  }

  checkPermission(
    docId: string,
    paragraphId: string,
    userId: string,
    action: PermissionAction,
  ): boolean {
    const docPerms = this.permissions.get(docId);
    if (!docPerms) {
      // No permissions set means open access
      return true;
    }

    const paraPerms = docPerms.get(paragraphId);
    if (!paraPerms) {
      // No paragraph-level permissions means open access for this paragraph
      return true;
    }

    const role = paraPerms.get(userId);
    if (!role) {
      // User has no explicit permission - deny
      return false;
    }

    const allowedActions = ROLE_ACTIONS[role];
    return allowedActions.includes(action);
  }

  getPermissions(docId: string, paragraphId: string): ParagraphPermission[] {
    const docPerms = this.permissions.get(docId);
    if (!docPerms) {
      return [];
    }

    const paraPerms = docPerms.get(paragraphId);
    if (!paraPerms) {
      return [];
    }

    const result: ParagraphPermission[] = [];
    for (const [userId, role] of paraPerms.entries()) {
      result.push({ docId, paragraphId, userId, role });
    }
    return result;
  }

  removePermission(docId: string, paragraphId: string, userId: string): void {
    const docPerms = this.permissions.get(docId);
    if (!docPerms) return;

    const paraPerms = docPerms.get(paragraphId);
    if (!paraPerms) return;

    paraPerms.delete(userId);
    if (paraPerms.size === 0) {
      docPerms.delete(paragraphId);
    }
    if (docPerms.size === 0) {
      this.permissions.delete(docId);
    }
  }
}
