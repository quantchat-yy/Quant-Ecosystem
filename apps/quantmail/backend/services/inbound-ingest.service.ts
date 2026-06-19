import type { PrismaClient, Email } from '@prisma/client';
import { createAppError } from '@quant/server-core';
import {
  DeliverabilityAuthService,
  extractAddress,
  type AuthVerdict,
  type InboundAuthMessage,
} from './deliverability-auth.service';
import { EmailService } from './email.service';
import { ThreadService } from './thread.service';
// Observability (Task 23.1, Req 23.2): every inbound delivery operation emits a span.
import { noopSpanPort, withSpan, type SpanPort } from '../shared/observability';

/**
 * InboundIngestAdapter (QuantMail SuperHub — Pillar 1, Phase 2, task 7.1).
 *
 * Bridges the `smtp-inbound` infra service into the mail domain. For each raw
 * inbound message it:
 *   1. evaluates SPF/DKIM/DMARC via `DeliverabilityAuthService.verifyInbound` and
 *      records the combined `AuthVerdict` on the resulting email (Requirement 5.1);
 *   2. when authentication passes, persists the email, stitches it into the
 *      correct thread, routes it to the recipient's inbox folder, and indexes it
 *      (Requirement 5.2);
 *   3. when the message fails DMARC alignment, quarantines it to the spam folder
 *      (flagged `isSpam`) instead of routing it to the inbox, and does NOT index
 *      it (Requirement 5.3).
 *
 * Network/IO boundaries are injectable: DNS verification lives behind the
 * `DnsResolverPort` on `DeliverabilityAuthService`, and the search index is the
 * injectable {@link EmailIndexerPort} (defaults to a no-op seam until the
 * `search-indexer` wiring lands).
 *
 * Requirements: 5.1 (record AuthVerdict), 5.2 (persist/thread/route/index on
 * pass), 5.3 (quarantine on DMARC-alignment failure).
 */

/**
 * Injectable seam for indexing a persisted inbound email into the search engine
 * (`search-indexer` → Qdrant/pgvector + Meilisearch). The production wiring is
 * introduced with the Answer Engine (Phase 5); until then the default is a no-op
 * so ingest remains fully functional.
 */
export interface EmailIndexerPort {
  index(email: Email): Promise<void>;
}

/** Default no-op indexer — the index call seam with no side effects. */
export class NoopEmailIndexer implements EmailIndexerPort {
  async index(_email: Email): Promise<void> {
    // Intentionally empty: real indexing is wired in Phase 5 (search-indexer).
  }
}

/**
 * Raw inbound message as bridged from `smtp-inbound` (a superset of its
 * `ParsedEmail`). The envelope/header/raw fields are optional because the SMTP
 * transport may not always surface them; SPF/DKIM/DMARC degrade gracefully when
 * an input is missing rather than failing ingest.
 */
export interface InboundRawMessage {
  /** `From:` header value (display name and/or address). */
  from: string;
  /** Envelope/header recipient addresses. */
  to: string[];
  cc?: string[];
  subject: string;
  html?: string | null;
  text?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  date?: Date | null;
  hasAttachments?: boolean;
  attachments?: unknown[];
  /** Lowercased header name -> raw value, for DKIM verification. */
  headers?: Record<string, string>;
  /** Raw message body for the DKIM body hash. */
  rawBody?: string;
  /** SMTP envelope MAIL FROM (return-path), for SPF. */
  envelopeFrom?: string;
  /** Connecting client IP, for SPF. */
  clientIp?: string;
  /** HELO/EHLO domain, fallback SPF identity. */
  heloDomain?: string;
}

export interface InboundIngestDeps {
  email?: EmailService;
  thread?: ThreadService;
  indexer?: EmailIndexerPort;
  /**
   * Optional observability span port (Task 23.1, Req 23.2). When wired, each
   * `ingest` emits a `delivery.ingest_inbound` span; defaults to a no-op so the
   * adapter stays a zero-cost no-op when nothing is wired.
   */
  tracer?: SpanPort;
}

/** Structural view of the folder lookups this adapter needs. */
interface FolderLookupPrisma {
  emailFolder: {
    findFirst(args: {
      where: { userId: string; type: string };
    }): Promise<{ id: string } | null>;
  };
  user: {
    findUnique(args: { where: { email: string } }): Promise<{ id: string } | null>;
  };
}

/** Parse the display name from a `From:` header value, if present. */
function displayNameOf(headerFrom: string): string | null {
  const angle = headerFrom.indexOf('<');
  if (angle <= 0) {
    return null;
  }
  const name = headerFrom.slice(0, angle).trim().replace(/^"|"$/g, '').trim();
  return name.length > 0 ? name : null;
}

/** Strip a `+tag` sub-address so `user+x@d` resolves to the base mailbox `user@d`. */
function stripPlusTag(address: string): string {
  const at = address.lastIndexOf('@');
  if (at <= 0) {
    return address;
  }
  const local = address.slice(0, at);
  const domain = address.slice(at);
  const plus = local.indexOf('+');
  return plus === -1 ? address : `${local.slice(0, plus)}${domain}`;
}

export class InboundIngestAdapter {
  private readonly email: EmailService;
  private readonly thread: ThreadService;
  private readonly indexer: EmailIndexerPort;
  private readonly tracer: SpanPort;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly auth: DeliverabilityAuthService,
    deps: InboundIngestDeps = {},
  ) {
    this.email = deps.email ?? new EmailService(prisma);
    this.thread = deps.thread ?? new ThreadService(prisma);
    this.indexer = deps.indexer ?? new NoopEmailIndexer();
    this.tracer = deps.tracer ?? noopSpanPort;
  }

  /**
   * Decide whether a message must be quarantined: it fails DMARC *alignment* when
   * a DMARC policy is published for the From domain and neither SPF nor DKIM
   * aligns (`dmarc === 'fail'`). Absence of any DMARC record (`'none'`) is not a
   * failure and routes normally.
   */
  static shouldQuarantine(verdict: AuthVerdict): boolean {
    return verdict.dmarc === 'fail';
  }

  /**
   * Ingest one raw inbound message: authenticate, persist, thread, route, index.
   * Returns the persisted `Email` (with its AuthVerdict recorded).
   *
   * Every inbound delivery operation emits a `delivery.ingest_inbound` span
   * (Req 23.2): the span records the routing decision (quarantine vs. inbox) and
   * the auth verdict, and ends `error` if ingest throws (e.g. no local recipient).
   */
  async ingest(rawMessage: InboundRawMessage): Promise<Email> {
    return withSpan(
      this.tracer,
      'delivery.ingest_inbound',
      {
        'delivery.direction': 'inbound',
        'delivery.recipient_count': rawMessage.to.length,
      },
      async (span) => {
        // 1) Authenticate (SPF/DKIM/DMARC).
        const verdict = await this.auth.verifyInbound(this.toAuthMessage(rawMessage));

        // 2) Resolve the local recipient mailbox -> user.
        const userId = await this.resolveRecipientUser(rawMessage.to);
        if (!userId) {
          throw createAppError(
            'No local recipient found for inbound message',
            404,
            'INBOUND_NO_RECIPIENT',
          );
        }

        // 3) Routing decision.
        const quarantine = InboundIngestAdapter.shouldQuarantine(verdict);
        const folderId = await this.resolveFolder(userId, quarantine ? 'SPAM' : 'INBOX');

        // 4) Thread stitching (Requirement 5.2).
        const fromAddress = extractAddress(rawMessage.from) ?? rawMessage.from;
        const participants = [fromAddress, ...rawMessage.to.map((a) => a.toLowerCase())];
        const threadId = await this.thread.stitchInbound({
          userId,
          subject: rawMessage.subject,
          inReplyTo: rawMessage.inReplyTo ?? null,
          participants,
          at: rawMessage.date ?? new Date(),
        });

        // 5) Persist, recording the AuthVerdict + routing (Requirements 5.1/5.3).
        const text = rawMessage.text ?? null;
        const email = await this.email.receive({
          userId,
          folderId: folderId ?? '',
          fromAddress,
          fromName: displayNameOf(rawMessage.from) ?? undefined,
          toAddresses: rawMessage.to,
          ccAddresses: rawMessage.cc ?? [],
          subject: rawMessage.subject,
          bodyHtml: rawMessage.html ?? undefined,
          bodyPlain: text ?? undefined,
          snippet: (text ?? '').slice(0, 200),
          threadId,
          inReplyTo: rawMessage.inReplyTo ?? undefined,
          hasAttachments: rawMessage.hasAttachments ?? (rawMessage.attachments?.length ?? 0) > 0,
          attachments: rawMessage.attachments ?? [],
          receivedAt: rawMessage.date ?? new Date(),
          authResults: verdict as unknown,
          isSpam: quarantine,
          deliveryStatus: 'delivered',
        });

        // Persist the originating Message-ID so future replies thread correctly.
        if (rawMessage.messageId) {
          await this.prisma.email.update({
            where: { id: email.id },
            data: { messageId: rawMessage.messageId } as never,
          });
        }

        // 6) Index only authenticated (non-quarantined) mail (Requirement 5.2).
        if (!quarantine) {
          await this.indexer.index(email);
        }

        span.setAttributes({
          'delivery.user_id': userId,
          'delivery.quarantined': quarantine,
          'delivery.dmarc': verdict.dmarc,
          'delivery.indexed': !quarantine,
        });

        return email;
      },
    );
  }

  /** Map the bridged raw message into the auth service's verification shape. */
  private toAuthMessage(rawMessage: InboundRawMessage): InboundAuthMessage {
    const headers = rawMessage.headers ?? {};
    const headerFrom = headers['from'] ?? rawMessage.from;
    const rawBody = rawMessage.rawBody ?? rawMessage.text ?? rawMessage.html ?? '';
    return {
      headerFrom,
      headers,
      rawBody,
      ...(rawMessage.envelopeFrom !== undefined ? { envelopeFrom: rawMessage.envelopeFrom } : {}),
      ...(rawMessage.clientIp !== undefined ? { clientIp: rawMessage.clientIp } : {}),
      ...(rawMessage.heloDomain !== undefined ? { heloDomain: rawMessage.heloDomain } : {}),
    };
  }

  /** Resolve the first recipient address that maps to a known local user. */
  private async resolveRecipientUser(recipients: string[]): Promise<string | null> {
    const db = this.prisma as unknown as FolderLookupPrisma;
    for (const raw of recipients) {
      const address = stripPlusTag((extractAddress(raw) ?? raw).toLowerCase());
      const user = await db.user.findUnique({ where: { email: address } });
      if (user) {
        return user.id;
      }
    }
    return null;
  }

  /** Find the recipient's folder of the given type (INBOX or SPAM). */
  private async resolveFolder(userId: string, type: 'INBOX' | 'SPAM'): Promise<string | null> {
    const db = this.prisma as unknown as FolderLookupPrisma;
    const folder = await db.emailFolder.findFirst({ where: { userId, type } });
    return folder?.id ?? null;
  }
}
