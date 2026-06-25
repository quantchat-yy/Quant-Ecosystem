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
    // Record the ended random-chat session against the real VideoChatSession
    // table (Omegle-style sessions). Persisted so history/safety/abuse tooling
    // can inspect it — no in-memory-only record.
    await this.prisma.videoChatSession.create({
      data: {
        user1Id: userId,
        user2Id: partnerId,
        status: 'ENDED',
        endedAt: new Date(),
      },
    });
  }
}
