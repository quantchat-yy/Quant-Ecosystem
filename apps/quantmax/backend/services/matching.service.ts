import { PrismaClient } from '@prisma/client';

export class MatchingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findMatches(userId: string, limit: number = 10) {
    // Simple matching algorithm (can be replaced with ML)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { datingProfile: true },
    });

    if (!user?.datingProfile) {
      return [];
    }

    const matches = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        datingProfile: {
          isNot: null,
        },
      },
      include: {
        datingProfile: true,
      },
      take: limit,
    });

    return matches;
  }

  async recordSwipe(
    swiperId: string,
    targetId: string,
    direction: 'LEFT' | 'RIGHT' | 'SUPER_LIKE',
  ) {
    await this.prisma.swipe.create({
      data: {
        swiperId,
        targetId,
        direction,
      },
    });

    // Check for mutual interest
    if (direction === 'RIGHT' || direction === 'SUPER_LIKE') {
      const mutual = await this.prisma.swipe.findFirst({
        where: {
          swiperId: targetId,
          targetId: swiperId,
          direction: { in: ['RIGHT', 'SUPER_LIKE'] },
        },
      });

      if (mutual) {
        // Create match with deterministic ordering to satisfy unique constraint
        const [user1Id, user2Id] = [swiperId, targetId].sort();
        const match = await this.prisma.match.create({
          data: {
            user1Id,
            user2Id,
          },
        });
        return { matched: true, match };
      }
    }

    return { matched: false };
  }
}
