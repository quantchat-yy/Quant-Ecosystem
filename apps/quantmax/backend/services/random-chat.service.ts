import { PrismaClient } from '@prisma/client';

export class RandomChatService {
  private prisma: PrismaClient;
  private waitingQueue: string[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findRandomPartner(userId: string): Promise<string | null> {
    // Remove user from queue if already waiting
    this.waitingQueue = this.waitingQueue.filter((id) => id !== userId);

    if (this.waitingQueue.length > 0) {
      const partner = this.waitingQueue.shift()!;
      return partner;
    }

    // Add to waiting queue
    this.waitingQueue.push(userId);
    return null;
  }

  async endChat(userId: string, partnerId: string) {
    // Record chat session
    // @ts-expect-error randomChat model not yet defined in Prisma schema
    await this.prisma.randomChat.create({
      data: {
        user1Id: userId,
        user2Id: partnerId,
        endedAt: new Date(),
      },
    });
  }
}
