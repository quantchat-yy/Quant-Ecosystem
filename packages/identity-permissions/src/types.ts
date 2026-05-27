// ============================================================================
// @quant/identity-permissions - Types
// ============================================================================

/** Workspace role levels */
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

/** Resource-level permissions */
export type ResourcePermission = 'create' | 'read' | 'update' | 'delete' | 'share' | 'admin';

/** All resource types tracked in the ecosystem */
export type ResourceType =
  | 'message'
  | 'email'
  | 'doc'
  | 'file'
  | 'meeting'
  | 'post'
  | 'video'
  | 'campaign'
  | 'task'
  | 'payment'
  | 'code-artifact';

/** Workspace role membership for a user */
export interface RoleMembership {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  grantedAt: number;
}

/** Resource entry tracked by the registry */
export interface ResourceEntry {
  id: string;
  type: ResourceType;
  ownerId: string;
  workspaceId: string;
  title: string;
  metadata: Record<string, unknown>;
  aiAccessEnabled: boolean;
  createdAt: number;
}

/** Agent access grant for resource types */
export interface AgentAccessGrant {
  id: string;
  agentId: string;
  userId: string;
  workspaceId: string;
  resourceTypes: ResourceType[];
  permissions: ResourcePermission[];
  expiresAt?: number;
  createdAt: number;
}

/** Node in the context graph */
export interface ContextNode {
  id: string;
  type: ResourceType;
  ownerId: string;
  workspaceId: string;
  metadata: Record<string, unknown>;
  relationships: ContextEdge[];
}

/** Edge connecting two context nodes */
export interface ContextEdge {
  targetId: string;
  relationship: string;
}

/** Memory entry for a user */
export interface MemoryEntry {
  id: string;
  userId: string;
  appSource: string;
  content: string;
  paused: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Consent prompt from an agent to a user */
export interface ConsentPrompt {
  id: string;
  userId: string;
  agentId: string;
  resourceType: ResourceType;
  reason: string;
  createdAt: number;
}

/** User response to a consent prompt */
export interface ConsentResponse {
  promptId: string;
  userId: string;
  granted: boolean;
  respondedAt: number;
}

/** Audit event for workspace activity tracking */
export interface AuditEvent {
  id: string;
  workspaceId: string;
  actorId: string;
  actorType: 'user' | 'agent';
  action: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}
