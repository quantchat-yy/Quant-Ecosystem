import { PrismaClient } from '@prisma/client';

export interface CreateCommunityInput {
  name: string;
  slug: string;
  description?: string;
  isPrivate?: boolean;
}

export class CommunityService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createCommunity(userId: string, input: CreateCommunityInput) {
    const existing = await this.prisma.community.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new Error('Community slug already exists');
    }

    const community = await this.prisma.community.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        isPrivate: input.isPrivate ?? false,
        memberCount: 1,
      },
    });

    await this.prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId,
        role: 'OWNER',
      },
    });

    return community;
  }

  async joinCommunity(userId: string, communityId: string) {
    const existing = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (existing) {
      return { success: false, message: 'Already a member' };
    }

    await this.prisma.communityMember.create({
      data: {
        communityId,
        userId,
        role: 'MEMBER',
      },
    });

    await this.prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } },
    });

    return { success: true };
  }

  async getCommunity(communityId: string) {
    return this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        _count: {
          select: { members: true, posts: true },
        },
      },
    });
  }

  async getTrendingCommunities(limit: number = 10) {
    return this.prisma.community.findMany({
      orderBy: {
        memberCount: 'desc',
      },
      take: limit,
    });
  }
}
