import { randomUUID } from 'crypto';

export interface RoomSettings {
  maxParticipants: number;
  waitingRoom: boolean;
  muteOnEntry: boolean;
  allowScreenShare: boolean;
  enableRecording: boolean;
  enableTranscript: boolean;
}

export interface CreateRoomInput {
  name: string;
  hostId: string;
  settings: RoomSettings;
}

export interface JoinParticipantInput {
  userId: string;
  displayName: string;
  role: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface Participant extends JoinParticipantInput {
  id: string;
}

export type RoomStatus = 'active' | 'closed';

export interface Room {
  id: string;
  name: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  participants: Participant[];
  createdAt: Date;
}

function notFound(message: string): never {
  throw new Error(message);
}

export class RoomService {
  private rooms = new Map<string, Room>();

  createRoom(input: CreateRoomInput): Room {
    const room: Room = {
      id: randomUUID(),
      name: input.name,
      hostId: input.hostId,
      status: 'active',
      settings: { ...input.settings },
      participants: [],
      createdAt: new Date(),
    };
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) notFound('Room not found');
    return room;
  }

  joinRoom(roomId: string, participant: JoinParticipantInput): Room {
    const room = this.getRoom(roomId);
    if (room.status === 'closed') throw new Error('Room is closed');
    if (room.participants.length >= room.settings.maxParticipants) {
      throw new Error('Room is full');
    }
    if (room.participants.some((p) => p.userId === participant.userId)) {
      throw new Error('User already in room');
    }
    room.participants.push({
      ...participant,
      id: randomUUID(),
      audioEnabled: room.settings.muteOnEntry ? false : participant.audioEnabled,
    });
    return room;
  }

  leaveRoom(roomId: string, participantId: string): Room {
    const room = this.getRoom(roomId);
    const index = room.participants.findIndex((p) => p.id === participantId);
    if (index === -1) throw new Error('Participant not found in room');
    room.participants.splice(index, 1);
    return room;
  }

  listParticipants(roomId: string): Participant[] {
    return this.getRoom(roomId).participants;
  }

  closeRoom(roomId: string): Room {
    const room = this.getRoom(roomId);
    room.status = 'closed';
    room.participants = [];
    return room;
  }

  listRooms(userId: string): Room[] {
    return Array.from(this.rooms.values()).filter(
      (room) =>
        room.hostId === userId ||
        room.participants.some((p) => p.userId === userId),
    );
  }

  endMeeting(roomId: string, userId: string): Room {
    const room = this.getRoom(roomId);
    if (room.hostId !== userId) throw new Error('Only the host can end the meeting');
    return this.closeRoom(roomId);
  }
}
