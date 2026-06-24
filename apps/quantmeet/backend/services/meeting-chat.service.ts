import { randomUUID } from 'crypto';

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: Date;
}

export interface Reaction {
  id: string;
  roomId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface PostMessageInput {
  userId: string;
  displayName: string;
  text: string;
}

export interface PostReactionInput {
  userId: string;
  emoji: string;
}

const MAX_MESSAGES_PER_ROOM = 500;
const MAX_REACTIONS_PER_ROOM = 200;
const MAX_TEXT_LENGTH = 4000;

/**
 * Ephemeral in-meeting chat + reactions.
 *
 * Like the rest of the QuantMeet backend (signaling, quant-live, the E2EE
 * relay) this is intentionally in-memory: chat and reactions live only for the
 * duration of a meeting on a single instance. Durable transcript persistence is
 * a separate concern handled by the transcript/recording lane.
 */
export class MeetingChatService {
  private messages = new Map<string, ChatMessage[]>();
  private reactions = new Map<string, Reaction[]>();

  postMessage(roomId: string, input: PostMessageInput): ChatMessage {
    const text = input.text.trim();
    if (text.length === 0) {
      throw new Error('Message text is required');
    }
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error('Message text is too long');
    }

    const message: ChatMessage = {
      id: randomUUID(),
      roomId,
      userId: input.userId,
      displayName: input.displayName,
      text,
      createdAt: new Date(),
    };

    const list = this.messages.get(roomId) ?? [];
    list.push(message);
    // Bound memory: keep only the most recent messages.
    if (list.length > MAX_MESSAGES_PER_ROOM) {
      list.splice(0, list.length - MAX_MESSAGES_PER_ROOM);
    }
    this.messages.set(roomId, list);
    return message;
  }

  listMessages(roomId: string): ChatMessage[] {
    return [...(this.messages.get(roomId) ?? [])];
  }

  postReaction(roomId: string, input: PostReactionInput): Reaction {
    const emoji = input.emoji.trim();
    if (emoji.length === 0) {
      throw new Error('Reaction emoji is required');
    }

    const reaction: Reaction = {
      id: randomUUID(),
      roomId,
      userId: input.userId,
      emoji,
      createdAt: new Date(),
    };

    const list = this.reactions.get(roomId) ?? [];
    list.push(reaction);
    if (list.length > MAX_REACTIONS_PER_ROOM) {
      list.splice(0, list.length - MAX_REACTIONS_PER_ROOM);
    }
    this.reactions.set(roomId, list);
    return reaction;
  }

  listReactions(roomId: string): Reaction[] {
    return [...(this.reactions.get(roomId) ?? [])];
  }

  /** Drop all chat/reaction state for a room (e.g. when the meeting ends). */
  clearRoom(roomId: string): void {
    this.messages.delete(roomId);
    this.reactions.delete(roomId);
  }
}
