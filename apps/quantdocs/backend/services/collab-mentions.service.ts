/**
 * CollabMentionsService - Detects @mentions in document text and emits notification events.
 * Integrates with the Phase 27 notification center via an event emitter interface.
 */

export interface MentionedUser {
  userId: string;
  username: string;
  startIndex: number;
  endIndex: number;
}

export interface MentionNotification {
  docId: string;
  mentionedUserId: string;
  mentionerUserId: string;
  context: string;
  createdAt: Date;
}

export interface NotificationEmitter {
  emit(event: string, payload: MentionNotification): void;
}

export interface UserResolver {
  resolveUsername(username: string): string | null;
}

export class CollabMentionsService {
  private static readonly MENTION_REGEX = /@([a-zA-Z0-9_.-]+)/g;

  constructor(
    private readonly notifier: NotificationEmitter,
    private readonly userResolver: UserResolver,
  ) {}

  detectMentions(text: string): MentionedUser[] {
    const mentions: MentionedUser[] = [];
    let match: RegExpExecArray | null;

    const regex = new RegExp(CollabMentionsService.MENTION_REGEX.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      const username = match[1];
      const userId = this.userResolver.resolveUsername(username);
      if (userId) {
        mentions.push({
          userId,
          username,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    return mentions;
  }

  notifyMention(
    docId: string,
    mentionedUserId: string,
    mentionerUserId: string,
    context: string,
  ): void {
    const notification: MentionNotification = {
      docId,
      mentionedUserId,
      mentionerUserId,
      context,
      createdAt: new Date(),
    };

    this.notifier.emit('mention', notification);
  }
}
