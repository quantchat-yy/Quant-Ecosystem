import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunityService } from '../services/community.service';

function createMockPrisma() {
  return {
    community: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    communityMember: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('CommunityService', () => {
  let service: CommunityService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new CommunityService(prisma as never);
  });

  describe('createCommunity', () => {
    it('creates a community and adds creator as OWNER', async () => {
      prisma.community.findUnique.mockResolvedValue(null);
      prisma.community.create.mockResolvedValue({
        id: 'community-1',
        name: 'Test Community',
        slug: 'test-community',
        memberCount: 1,
      });
      prisma.communityMember.create.mockResolvedValue({
        id: 'member-1',
        communityId: 'community-1',
        userId: 'user-1',
        role: 'OWNER',
      });

      const result = await service.createCommunity('user-1', {
        name: 'Test Community',
        slug: 'test-community',
      });

      expect(result.name).toBe('Test Community');
      expect(result.memberCount).toBe(1);
    });

    it('throws SLUG_EXISTS if slug is taken', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createCommunity('user-1', {
          name: 'Test',
          slug: 'taken-slug',
        }),
      ).rejects.toThrow('Community slug already exists');
    });
  });

  describe('joinCommunity', () => {
    it('adds user as MEMBER and increments count', async () => {
      prisma.community.findUnique.mockResolvedValue({
        id: 'community-1',
        memberCount: 5,
      });
      prisma.communityMember.findFirst.mockResolvedValue(null);
      prisma.communityMember.create.mockResolvedValue({
        id: 'member-2',
        communityId: 'community-1',
        userId: 'user-2',
        role: 'MEMBER',
      });
      prisma.community.update.mockResolvedValue({
        id: 'community-1',
        memberCount: 6,
      });

      const result = await service.joinCommunity('community-1', 'user-2');

      expect(result.role).toBe('MEMBER');
    });

    it('throws ALREADY_MEMBER if user is already a member', async () => {
      prisma.community.findUnique.mockResolvedValue({ id: 'community-1' });
      prisma.communityMember.findFirst.mockResolvedValue({ id: 'member-1' });

      await expect(service.joinCommunity('community-1', 'user-1')).rejects.toThrow(
        'Already a member of this community',
      );
    });
  });

  describe('leaveCommunity', () => {
    it('removes member and decrements count', async () => {
      prisma.communityMember.findFirst.mockResolvedValue({
        id: 'member-2',
        role: 'MEMBER',
      });
      prisma.communityMember.delete.mockResolvedValue({});
      prisma.community.findUnique.mockResolvedValue({
        id: 'community-1',
        memberCount: 5,
      });
      prisma.community.update.mockResolvedValue({
        id: 'community-1',
        memberCount: 4,
      });

      await service.leaveCommunity('community-1', 'user-2');

      expect(prisma.communityMember.delete).toHaveBeenCalled();
    });

    it('throws OWNER_CANNOT_LEAVE if user is the owner', async () => {
      prisma.communityMember.findFirst.mockResolvedValue({
        id: 'member-1',
        role: 'OWNER',
      });

      await expect(service.leaveCommunity('community-1', 'user-1')).rejects.toThrow(
        'Owner cannot leave the community',
      );
    });
  });

  describe('listMembers', () => {
    it('returns paginated members', async () => {
      prisma.communityMember.findMany.mockResolvedValue([
        { id: 'member-1', userId: 'user-1', role: 'OWNER' },
      ]);
      prisma.communityMember.count.mockResolvedValue(1);

      const result = await service.listMembers('community-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('listCommunities', () => {
    it('returns paginated public communities', async () => {
      prisma.community.findMany.mockResolvedValue([
        { id: 'community-1', name: 'Public Community', isPrivate: false },
      ]);
      prisma.community.count.mockResolvedValue(1);

      const result = await service.listCommunities();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
