import type { PrismaClient } from '@prisma/client';
import type { KeyStorage, PreKeyBundle, KeySession } from './encryption.service';

/**
 * Store for a user's pool of single-use (one-time) prekeys.
 *
 * Public key material only — the backend is a zero-knowledge relay and never
 * persists private keys, ratchet secrets, or plaintext.
 *
 * NOTE: The atomic pool/claim behaviour (storeOneTimePreKeys / claimOneTimePreKey /
 * countOneTimePreKeys) is implemented in Task 2.2. The method signatures are
 * declared here so {@link PrismaKeyStorage} satisfies the full contract from the
 * design's Component 1 interface; the bodies are filled in by Task 2.2.
 */
export interface OneTimePreKeyStore {
  /** Store a batch of one-time prekeys for a user (public keys only). */
  storeOneTimePreKeys(userId: string, preKeys: string[]): Promise<void>;
  /**
   * Atomically claim (consume) a single one-time prekey for a user.
   * Returns null when none remain (caller falls back to signedPreKey-only X3DH).
   */
  claimOneTimePreKey(userId: string): Promise<string | null>;
  /** Count remaining unclaimed one-time prekeys (drives client replenishment). */
  countOneTimePreKeys(userId: string): Promise<number>;
}

/**
 * Durable, Prisma-backed implementation of the {@link KeyStorage} contract
 * (plus {@link OneTimePreKeyStore}). Prekey bundles and X3DH sessions survive
 * restarts/redeploys and are shared across all backend instances.
 *
 * Zero-knowledge invariant (Requirement 16): this class persists PUBLIC key
 * material only. It never reads, writes, or accepts private keys, ratchet
 * secrets, or plaintext.
 */
export class PrismaKeyStorage implements KeyStorage, OneTimePreKeyStore {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Persist (or atomically replace) a user's current prekey bundle.
   *
   * Upserts on the unique `userId` so that exactly one bundle row exists per
   * user, including under concurrent re-uploads for the same user. Only public
   * material is written. (Requirements 1.1, 1.4, 1.7, 16.1)
   */
  async storeBundle(userId: string, bundle: PreKeyBundle): Promise<void> {
    await this.prisma.preKeyBundle.upsert({
      where: { userId },
      create: {
        userId,
        identityKey: bundle.identityKey,
        signedPreKey: bundle.signedPreKey,
        signedPreKeySignature: bundle.signedPreKeySignature,
        registrationId: bundle.registrationId,
      },
      update: {
        identityKey: bundle.identityKey,
        signedPreKey: bundle.signedPreKey,
        signedPreKeySignature: bundle.signedPreKeySignature,
        registrationId: bundle.registrationId,
      },
    });
  }

  /**
   * Return the persisted public prekey bundle for a user, or null when none
   * has been persisted. (Requirements 1.5, 1.6, 16.3)
   */
  async getBundle(userId: string): Promise<PreKeyBundle | null> {
    const row = await this.prisma.preKeyBundle.findUnique({
      where: { userId },
    });

    if (!row) {
      return null;
    }

    return {
      identityKey: row.identityKey,
      signedPreKey: row.signedPreKey,
      signedPreKeySignature: row.signedPreKeySignature,
      registrationId: row.registrationId,
    };
  }

  /**
   * Persist (or atomically replace) an X3DH session keyed by
   * `(initiatorId, responderId)`. Upserts on the compound unique so that
   * exactly one session row exists per pair, including under concurrent stores
   * for the same pair. (Requirements 3.1, 3.3, 16.1)
   */
  async storeSession(session: KeySession): Promise<void> {
    await this.prisma.keySession.upsert({
      where: {
        initiatorId_responderId: {
          initiatorId: session.initiatorId,
          responderId: session.responderId,
        },
      },
      create: {
        initiatorId: session.initiatorId,
        responderId: session.responderId,
        rootKey: session.rootKey,
        established: session.established,
      },
      update: {
        rootKey: session.rootKey,
        established: session.established,
      },
    });
  }

  /**
   * Return the persisted session for an `(initiatorId, responderId)` pair, or
   * null when none has been persisted. (Requirements 3.2, 3.4)
   */
  async getSession(initiatorId: string, responderId: string): Promise<KeySession | null> {
    const row = await this.prisma.keySession.findUnique({
      where: {
        initiatorId_responderId: { initiatorId, responderId },
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      initiatorId: row.initiatorId,
      responderId: row.responderId,
      rootKey: row.rootKey,
      established: row.established,
      createdAt: row.createdAt,
    };
  }

  // ---------------------------------------------------------------------------
  // OneTimePreKeyStore — implemented in Task 2.2 (atomic pool + claim).
  // Signatures are declared here to satisfy the design's Component 1 interface.
  // ---------------------------------------------------------------------------

  storeOneTimePreKeys(_userId: string, _preKeys: string[]): Promise<void> {
    throw new Error('storeOneTimePreKeys is implemented in Task 2.2');
  }

  claimOneTimePreKey(_userId: string): Promise<string | null> {
    throw new Error('claimOneTimePreKey is implemented in Task 2.2');
  }

  countOneTimePreKeys(_userId: string): Promise<number> {
    throw new Error('countOneTimePreKeys is implemented in Task 2.2');
  }
}
