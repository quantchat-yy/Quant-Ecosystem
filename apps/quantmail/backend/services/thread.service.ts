import type { PrismaClient, Email, EmailThread } from '@prisma/client';
import { createAppError } from '@quant/server-core';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ThreadWithEmails extends EmailThread {
  emails: Email[];
  unreadCount: number;
}

/**
 * In-memory thread preferences store.
 * Workaround: The Prisma EmailThread model does not have isMuted/snoozedUntil columns.
 * Thread mute/snooze state is stored in memory until a schema migration adds a
 * `metadata Json` field or dedicated columns to the EmailThread model.
 */
export interface ThreadPreferences {
  isMuted?: boolean;
  snoozedUntil?: string;
}

export class ThreadService {
  /**
   * In-memory store for thread preferences (mute/snooze state).
   * Key: threadId, Value: ThreadPreferences
   */
  private readonly threadPreferences = new Map<string, ThreadPreferences>();

  constructor(private readonly prisma: PrismaClient) {}

  async getThread(threadId: string, userId: string): Promise<ThreadWithEmails> {
    const thread = await this.prisma.emailThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw createAppError('Thread not found', 404, 'THREAD_NOT_FOUND');
    }

    if (thread.userId !== userId) {
      throw createAppError('Not authorized to access this thread', 403, 'FORBIDDEN');
    }

    const emails = await this.prisma.email.findMany({
      where: { threadId, userId, deletedAt: null },
      orderBy: { receivedAt: 'asc' },
    });

    const unreadCount = emails.filter((e: Email) => !e.isRead).length;

    return {
      ...thread,
      emails,
      unreadCount,
    };
  }

  async listThreads(
    userId: string,
    folderId?: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<EmailThread>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { userId };
    if (folderId) {
      where['id'] = {
        in: await this.getThreadIdsForFolder(userId, folderId),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.emailThread.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { lastEmailAt: 'desc' },
      }),
      this.prisma.emailThread.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getThreadParticipants(threadId: string, userId: string): Promise<string[]> {
    const thread = await this.prisma.emailThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw createAppError('Thread not found', 404, 'THREAD_NOT_FOUND');
    }

    if (thread.userId !== userId) {
      throw createAppError('Not authorized', 403, 'FORBIDDEN');
    }

    return (thread.participantAddresses as string[]) ?? [];
  }

  private async getThreadIdsForFolder(userId: string, folderId: string): Promise<string[]> {
    const emails = await this.prisma.email.findMany({
      where: { userId, folderId, deletedAt: null, threadId: { not: null } },
      select: { threadId: true },
      distinct: ['threadId'],
    });

    return emails
      .map((e: { threadId: string | null }) => e.threadId)
      .filter((id: string | null): id is string => id !== null);
  }

  /**
   * Mute a thread for the user.
   *
   * Workaround: The Prisma schema does not yet have isMuted/snoozedUntil columns
   * or a metadata JSON field on EmailThread. Mute state is stored in an in-memory
   * Map until a schema migration adds the appropriate fields.
   */
  async muteThread(
    threadId: string,
    userId: string,
  ): Promise<EmailThread & { preferences: ThreadPreferences }> {
    const thread = await this.prisma.emailThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw createAppError('Thread not found', 404, 'THREAD_NOT_FOUND');
    }

    if (thread.userId !== userId) {
      throw createAppError('Not authorized', 403, 'FORBIDDEN');
    }

    const existing = this.threadPreferences.get(threadId) ?? {};
    const preferences: ThreadPreferences = { ...existing, isMuted: true };
    this.threadPreferences.set(threadId, preferences);

    return { ...thread, preferences };
  }

  /**
   * Snooze a thread until a specified date.
   *
   * Workaround: The Prisma schema does not yet have isMuted/snoozedUntil columns
   * or a metadata JSON field on EmailThread. Snooze state is stored in an in-memory
   * Map until a schema migration adds the appropriate fields.
   */
  async snoozeThread(
    threadId: string,
    userId: string,
    until: Date,
  ): Promise<EmailThread & { preferences: ThreadPreferences }> {
    const thread = await this.prisma.emailThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw createAppError('Thread not found', 404, 'THREAD_NOT_FOUND');
    }

    if (thread.userId !== userId) {
      throw createAppError('Not authorized', 403, 'FORBIDDEN');
    }

    const existing = this.threadPreferences.get(threadId) ?? {};
    const preferences: ThreadPreferences = { ...existing, snoozedUntil: until.toISOString() };
    this.threadPreferences.set(threadId, preferences);

    return { ...thread, preferences };
  }

  /**
   * Stitch an inbound message into the correct thread for a user and return the
   * thread id (QuantMail SuperHub Pillar 1, Requirement 5.2). Resolution order:
   *   1. If `inReplyTo` references a known message-id we already store, reuse that
   *      email's thread.
   *   2. Otherwise reuse the user's most-recent thread with a matching normalized
   *      subject (Re:/Fwd: prefixes stripped).
   *   3. Otherwise create a new thread.
   * The chosen thread's `messageCount`, `lastEmailAt`, and participant set are
   * updated. Idempotent fields are advanced, never regressed.
   */
  async stitchInbound(input: {
    userId: string;
    subject: string;
    inReplyTo?: string | null;
    participants?: string[];
    at?: Date;
  }): Promise<string> {
    const at = input.at ?? new Date();
    const normalizedSubject = normalizeSubject(input.subject);

    let thread: EmailThread | null = null;

    if (input.inReplyTo) {
      const parent = await this.prisma.email.findFirst({
        where: { userId: input.userId, messageId: input.inReplyTo, threadId: { not: null } },
        orderBy: { receivedAt: 'desc' },
      });
      if (parent?.threadId) {
        thread = await this.prisma.emailThread.findUnique({ where: { id: parent.threadId } });
      }
    }

    if (!thread && normalizedSubject.length > 0) {
      const candidates = await this.prisma.emailThread.findMany({
        where: { userId: input.userId },
        orderBy: { lastEmailAt: 'desc' },
        take: 50,
      });
      thread =
        candidates.find((t) => normalizeSubject(t.subject) === normalizedSubject) ?? null;
    }

    if (!thread) {
      const created = await this.prisma.emailThread.create({
        data: {
          userId: input.userId,
          subject: input.subject,
          participantAddresses: input.participants ?? [],
          messageCount: 1,
          lastEmailAt: at,
          isRead: false,
        },
      });
      return created.id;
    }

    const existingParticipants = ((thread.participantAddresses as string[]) ?? []).map((p) => p);
    const mergedParticipants = Array.from(
      new Set([...existingParticipants, ...(input.participants ?? [])].map((p) => p.toLowerCase())),
    );
    const nextLastEmailAt =
      !thread.lastEmailAt || at > thread.lastEmailAt ? at : thread.lastEmailAt;

    await this.prisma.emailThread.update({
      where: { id: thread.id },
      data: {
        messageCount: { increment: 1 },
        lastEmailAt: nextLastEmailAt,
        participantAddresses: mergedParticipants,
        isRead: false,
      },
    });

    return thread.id;
  }

  /**
   * Get thread preferences (mute/snooze state) from the in-memory store.
   */
  getThreadPreferences(threadId: string): ThreadPreferences | undefined {
    return this.threadPreferences.get(threadId);
  }
}

/** Strip common reply/forward prefixes and trim for subject-based threading. */
function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, '')
    .trim()
    .toLowerCase();
}
