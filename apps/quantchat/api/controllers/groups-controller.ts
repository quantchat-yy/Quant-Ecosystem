// ============================================================================
// QuantChat API - Groups Controller
// Create/manage groups, roles, invites, settings, mentions
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Group, GroupMember, GroupSettings, GroupInvite, GroupRole, CreateGroupRequest } from '../../src/types';

// ============================================================================
// Group Store
// ============================================================================

class GroupStore {
  private groups: Map<string, Group> = new Map();
  private invites: Map<string, GroupInvite> = new Map();

  async createGroup(creatorId: string, request: CreateGroupRequest): Promise<Group> {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const members: GroupMember[] = [
      {
        userId: creatorId,
        username: `user_${creatorId}`,
        displayName: `User ${creatorId.slice(-4)}`,
        role: 'owner',
        joinedAt: new Date(),
        isMuted: false,
      },
      ...request.memberIds.map(id => ({
        userId: id,
        username: `user_${id}`,
        displayName: `User ${id.slice(-4)}`,
        role: 'member' as GroupRole,
        joinedAt: new Date(),
        addedBy: creatorId,
        isMuted: false,
      })),
    ];

    const group: Group = {
      id: groupId,
      name: request.name,
      description: request.description,
      creatorId,
      members,
      memberCount: members.length,
      maxMembers: 256,
      settings: {
        allowMemberInvites: true,
        allowMemberEdit: false,
        disappearMode: 'off',
        slowMode: 0,
        mediaOnly: false,
        adminOnlyPost: false,
        joinApproval: false,
        maxFileSize: 50 * 1024 * 1024,
        allowedMediaTypes: ['text', 'image', 'video', 'voice', 'sticker', 'gif'],
        ...request.settings,
      },
      isPublic: request.isPublic ?? false,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.groups.set(groupId, group);
    return group;
  }

  async getGroup(groupId: string): Promise<Group | null> {
    return this.groups.get(groupId) || null;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const groups: Group[] = [];
    for (const group of this.groups.values()) {
      if (group.members.some(m => m.userId === userId)) {
        groups.push(group);
      }
    }
    return groups;
  }

  async updateGroup(groupId: string, userId: string, updates: { name?: string; description?: string; avatarUrl?: string }): Promise<Group | null> {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const member = group.members.find(m => m.userId === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) return null;

    if (updates.name) group.name = updates.name;
    if (updates.description) group.description = updates.description;
    if (updates.avatarUrl) group.avatarUrl = updates.avatarUrl;
    group.updatedAt = new Date();

    return group;
  }

  async updateSettings(groupId: string, userId: string, settings: Partial<GroupSettings>): Promise<Group | null> {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const member = group.members.find(m => m.userId === userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) return null;

    group.settings = { ...group.settings, ...settings };
    group.updatedAt = new Date();
    return group;
  }

  async addMember(groupId: string, addedBy: string, userId: string): Promise<GroupMember | null> {
    const group = this.groups.get(groupId);
    if (!group) return null;
    if (group.memberCount >= group.maxMembers) return null;

    const adder = group.members.find(m => m.userId === addedBy);
    if (!adder) return null;
    if (!group.settings.allowMemberInvites && adder.role === 'member') return null;

    if (group.members.some(m => m.userId === userId)) return null;

    const newMember: GroupMember = {
      userId,
      username: `user_${userId}`,
      displayName: `User ${userId.slice(-4)}`,
      role: 'member',
      joinedAt: new Date(),
      addedBy,
      isMuted: false,
    };

    group.members.push(newMember);
    group.memberCount++;
    group.updatedAt = new Date();
    return newMember;
  }

  async removeMember(groupId: string, removedBy: string, userId: string): Promise<boolean> {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const remover = group.members.find(m => m.userId === removedBy);
    if (!remover || remover.role === 'member') return false;

    const target = group.members.find(m => m.userId === userId);
    if (!target) return false;
    if (target.role === 'owner') return false;

    group.members = group.members.filter(m => m.userId !== userId);
    group.memberCount--;
    group.updatedAt = new Date();
    return true;
  }

  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const member = group.members.find(m => m.userId === userId);
    if (!member) return false;

    if (member.role === 'owner' && group.members.length > 1) {
      // Transfer ownership to first admin or member
      const newOwner = group.members.find(m => m.userId !== userId && m.role === 'admin')
        || group.members.find(m => m.userId !== userId);
      if (newOwner) newOwner.role = 'owner';
    }

    group.members = group.members.filter(m => m.userId !== userId);
    group.memberCount--;
    group.updatedAt = new Date();

    if (group.members.length === 0) {
      this.groups.delete(groupId);
    }

    return true;
  }

  async setRole(groupId: string, setterId: string, userId: string, role: GroupRole): Promise<GroupMember | null> {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const setter = group.members.find(m => m.userId === setterId);
    if (!setter || setter.role !== 'owner') return null;

    const member = group.members.find(m => m.userId === userId);
    if (!member) return null;

    member.role = role;
    group.updatedAt = new Date();
    return member;
  }

  async createInvite(groupId: string, inviterId: string, maxUses: number = 100, expiresInHours: number = 72): Promise<GroupInvite | null> {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const member = group.members.find(m => m.userId === inviterId);
    if (!member) return null;
    if (!group.settings.allowMemberInvites && member.role === 'member') return null;

    const invite: GroupInvite = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId,
      inviterId,
      code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      maxUses,
      usedCount: 0,
      isActive: true,
    };

    this.invites.set(invite.id, invite);
    group.inviteCode = invite.code;
    group.inviteLink = `https://chat.quant.app/join/${invite.code}`;
    return invite;
  }

  async joinViaInvite(code: string, userId: string): Promise<Group | null> {
    let invite: GroupInvite | undefined;
    for (const inv of this.invites.values()) {
      if (inv.code === code && inv.isActive) {
        invite = inv;
        break;
      }
    }

    if (!invite) return null;
    if (invite.expiresAt < new Date()) {
      invite.isActive = false;
      return null;
    }
    if (invite.usedCount >= invite.maxUses) return null;

    const group = this.groups.get(invite.groupId);
    if (!group) return null;
    if (group.members.some(m => m.userId === userId)) return group; // Already member

    const member: GroupMember = {
      userId,
      username: `user_${userId}`,
      displayName: `User ${userId.slice(-4)}`,
      role: 'member',
      joinedAt: new Date(),
      isMuted: false,
    };

    group.members.push(member);
    group.memberCount++;
    invite.usedCount++;
    group.updatedAt = new Date();
    return group;
  }

  async deleteGroup(groupId: string, userId: string): Promise<boolean> {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const member = group.members.find(m => m.userId === userId);
    if (!member || member.role !== 'owner') return false;

    this.groups.delete(groupId);
    return true;
  }
}

const groupStore = new GroupStore();

// ============================================================================
// Groups Controller
// ============================================================================

export class GroupsController {
  async createGroup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as CreateGroupRequest;

    if (!body.name || !body.memberIds || body.memberIds.length === 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Group name and member IDs are required', statusCode: 400 } });
      return;
    }

    const group = await groupStore.createGroup(userId, body);
    res.status(201).json({ success: true, data: group });
  }

  async getGroup(req: Request, res: Response): Promise<void> {
    const groupId = req.params['groupId'];
    const group = await groupStore.getGroup(groupId);

    if (!group) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: group });
  }

  async getUserGroups(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groups = await groupStore.getUserGroups(userId);
    res.status(200).json({ success: true, data: groups });
  }

  async updateGroup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];
    const body = req.body as { name?: string; description?: string; avatarUrl?: string };

    const group = await groupStore.updateGroup(groupId, userId, body);
    if (!group) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 } });
      return;
    }

    res.status(200).json({ success: true, data: group });
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];
    const body = req.body as Partial<GroupSettings>;

    const group = await groupStore.updateSettings(groupId, userId, body);
    if (!group) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 } });
      return;
    }

    res.status(200).json({ success: true, data: group });
  }

  async addMember(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];
    const body = req.body as { memberId: string };

    if (!body.memberId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Member ID is required', statusCode: 400 } });
      return;
    }

    const member = await groupStore.addMember(groupId, userId, body.memberId);
    if (!member) {
      res.status(400).json({ success: false, error: { code: 'ADD_FAILED', message: 'Failed to add member', statusCode: 400 } });
      return;
    }

    res.status(201).json({ success: true, data: member });
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];
    const memberId = req.params['memberId'];

    const removed = await groupStore.removeMember(groupId, userId, memberId);
    if (!removed) {
      res.status(400).json({ success: false, error: { code: 'REMOVE_FAILED', message: 'Failed to remove member', statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Member removed' } });
  }

  async leaveGroup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];

    const left = await groupStore.leaveGroup(groupId, userId);
    if (!left) {
      res.status(400).json({ success: false, error: { code: 'LEAVE_FAILED', message: 'Failed to leave group', statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Left group successfully' } });
  }

  async setRole(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];
    const memberId = req.params['memberId'];
    const body = req.body as { role: GroupRole };

    if (!body.role) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Role is required', statusCode: 400 } });
      return;
    }

    const member = await groupStore.setRole(groupId, userId, memberId, body.role);
    if (!member) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 } });
      return;
    }

    res.status(200).json({ success: true, data: member });
  }

  async createInvite(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];
    const body = req.body as { maxUses?: number; expiresInHours?: number };

    const invite = await groupStore.createInvite(groupId, userId, body.maxUses, body.expiresInHours);
    if (!invite) {
      res.status(400).json({ success: false, error: { code: 'INVITE_FAILED', message: 'Failed to create invite', statusCode: 400 } });
      return;
    }

    res.status(201).json({ success: true, data: invite });
  }

  async joinViaInvite(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { code: string };

    if (!body.code) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invite code is required', statusCode: 400 } });
      return;
    }

    const group = await groupStore.joinViaInvite(body.code, userId);
    if (!group) {
      res.status(400).json({ success: false, error: { code: 'JOIN_FAILED', message: 'Invalid or expired invite', statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: group });
  }

  async deleteGroup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const groupId = req.params['groupId'];

    const deleted = await groupStore.deleteGroup(groupId, userId);
    if (!deleted) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can delete a group', statusCode: 403 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Group deleted' } });
  }
}

export const groupsController = new GroupsController();
