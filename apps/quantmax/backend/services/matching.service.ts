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

  async recordSwipe(userId: string, targetUserId: string, liked: boolean) {
    await this.prisma.swipe.create({
      data: {
        swiperId: userId,
        targetId: targetUserId,
        liked,
      },
    });

    // Check for mutual like
    if (liked) {
      const mutual = await this.prisma.swipe.findFirst({
        where: {
          swiperId: targetUserId,
          targetId: userId,
          liked: true,
        },
      });

      if (mutual) {
        // Create match
        await this.prisma.match.create({
          data: {
            user1Id: userId,
            user2Id: targetUserId,
          },
        });
        return { matched: true };
      }
    }

    return { matched: false };
  }
}
