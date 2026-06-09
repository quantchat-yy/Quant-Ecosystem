import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class RoomService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createRoom(userId: string, name: string, isPrivate: boolean = false) {
    const room = await this.prisma.room.create({
      data: {
        id: uuidv4(),
        name,
        createdBy: userId,
        isPrivate,
        status: 'active',
      },
    });

    return room;
  }

  async getRoom(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
    });
  }

  async joinRoom(roomId: string, userId: string) {
    // TODO: Add participant tracking
    return { success: true };
  }

  async leaveRoom(roomId: string, userId: string) {
    // TODO: Implement leave logic
    return { success: true };
  }
}
