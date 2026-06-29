import { createAppError } from '@quant/server-core';

/** Minimal PrismaClient interface for dependency injection */
export interface PrismaClient {
  docSuggestion: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  document: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  };
}

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';

export interface TextSelection {
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

export interface Suggestion {
  id: string;
  docId: string;
  userId: string;
  originalText: string;
  suggestedText: string;
  selection: TextSelection;
  status: SuggestionStatus;
  createdAt: Date;
}

interface DocumentRow {
  id: string;
  userId: string;
  isDeleted: boolean;
}

export interface ListSuggestionsOptions {
  /** Optionally restrict results to a single lifecycle status. */
  status?: SuggestionStatus;
  /** Sort direction by createdAt. Defaults to 'asc' (oldest-first). */
  order?: 'asc' | 'desc';
}

export class SuggestionService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Load a document and assert that `userId` is its owner. Mirrors the
   * ownership/existence semantics used by DocService.getDoc: a missing or
   * soft-deleted document is reported as 404, and a non-owner caller as 403.
   */
  private async assertOwner(docId: string, userId: string): Promise<DocumentRow> {
    const doc = (await this.prisma.document.findUnique({
      where: { id: docId },
    })) as DocumentRow | null;

    if (!doc || doc.isDeleted) {
      throw createAppError('Document not found', 404, 'DOC_NOT_FOUND');
    }

    if (doc.userId !== userId) {
      throw createAppError('Not authorized to access this document', 403, 'UNAUTHORIZED');
    }

    return doc;
  }

  /**
   * List a document's suggestions. The caller must be the document owner.
   * Optionally filter by status and choose sort order (oldest-first by default).
   */
  async listSuggestions(
    docId: string,
    userId: string,
    options: ListSuggestionsOptions = {},
  ): Promise<Suggestion[]> {
    await this.assertOwner(docId, userId);

    const where: Record<string, unknown> = { docId };
    if (options.status) {
      where.status = options.status;
    }

    const suggestions = await this.prisma.docSuggestion.findMany({
      where,
      orderBy: { createdAt: options.order ?? 'asc' },
    });

    return suggestions as unknown as Suggestion[];
  }

  /**
   * Transition a suggestion from 'pending' to 'accepted'. Only the document
   * owner may accept. Keeps scope to the status transition — document content
   * is not mutated here.
   */
  async acceptSuggestion(suggestionId: string, userId: string): Promise<Suggestion> {
    return this.transition(suggestionId, userId, 'accepted');
  }

  /**
   * Transition a suggestion from 'pending' to 'rejected'. Only the document
   * owner may reject.
   */
  async rejectSuggestion(suggestionId: string, userId: string): Promise<Suggestion> {
    return this.transition(suggestionId, userId, 'rejected');
  }

  private async transition(
    suggestionId: string,
    userId: string,
    target: Exclude<SuggestionStatus, 'pending'>,
  ): Promise<Suggestion> {
    const suggestion = (await this.prisma.docSuggestion.findUnique({
      where: { id: suggestionId },
    })) as Suggestion | null;

    if (!suggestion) {
      throw createAppError('Suggestion not found', 404, 'SUGGESTION_NOT_FOUND');
    }

    // Owner-only gating (also yields 404 if the parent doc is gone/deleted).
    await this.assertOwner(suggestion.docId, userId);

    // Idempotency: a suggestion that is already resolved cannot be re-resolved.
    // Re-accepting an accepted suggestion (or any non-pending transition) is a
    // conflict rather than a silent no-op.
    if (suggestion.status !== 'pending') {
      throw createAppError(
        `Suggestion is already ${suggestion.status}`,
        409,
        'SUGGESTION_NOT_PENDING',
      );
    }

    const updated = await this.prisma.docSuggestion.update({
      where: { id: suggestionId },
      data: { status: target },
    });

    return updated as unknown as Suggestion;
  }
}
