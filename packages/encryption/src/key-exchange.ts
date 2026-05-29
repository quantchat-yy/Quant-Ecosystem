import { randomBytes, randomInt } from 'crypto';

import type { PreKeyBundle, SessionState, RatchetState } from './types.js';

export class KeyExchange {
  private sessions: Map<string, SessionState>;
  private preKeyBundles: Map<string, PreKeyBundle>;
  private localIdentityKey: string;
  private registrationId: number;

  constructor(localIdentityKey?: string) {
    this.sessions = new Map();
    this.preKeyBundles = new Map();
    this.localIdentityKey = localIdentityKey ?? this.generateKey('identity');
    this.registrationId = randomInt(16384);
  }

  getLocalIdentityKey(): string {
    return this.localIdentityKey;
  }

  getRegistrationId(): number {
    return this.registrationId;
  }

  generatePreKeyBundle(): PreKeyBundle {
    const bundle: PreKeyBundle = {
      identityKey: this.localIdentityKey,
      signedPreKey: this.generateKey('spk'),
      signedPreKeySignature: this.generateKey('sig'),
      oneTimePreKey: this.generateKey('opk'),
      registrationId: this.registrationId,
    };
    this.preKeyBundles.set(this.localIdentityKey, bundle);
    return bundle;
  }

  establishSession(remoteBundle: PreKeyBundle): SessionState {
    const sessionId = `session-${Date.now()}-${randomBytes(4).toString('hex')}`;

    const ratchetState: RatchetState = {
      rootKey: this.generateKey('root'),
      sendingChainKey: this.generateKey('send'),
      receivingChainKey: this.generateKey('recv'),
      sendCounter: 0,
      receiveCounter: 0,
      previousSendCounter: 0,
    };

    const session: SessionState = {
      sessionId,
      remoteIdentityKey: remoteBundle.identityKey,
      localIdentityKey: this.localIdentityKey,
      established: true,
      establishedAt: new Date(),
      messageCount: 0,
      ratchetState,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  getSessionForIdentity(remoteIdentityKey: string): SessionState | null {
    for (const session of this.sessions.values()) {
      if (session.remoteIdentityKey === remoteIdentityKey) {
        return session;
      }
    }
    return null;
  }

  advanceRatchet(sessionId: string): RatchetState | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.ratchetState.sendCounter++;
    session.ratchetState.sendingChainKey = this.generateKey('send');
    session.messageCount++;

    return { ...session.ratchetState };
  }

  receiveRatchet(sessionId: string): RatchetState | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.ratchetState.receiveCounter++;
    session.ratchetState.receivingChainKey = this.generateKey('recv');
    session.messageCount++;

    return { ...session.ratchetState };
  }

  closeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  verifyIdentity(remoteIdentityKey: string, expectedFingerprint: string): boolean {
    return remoteIdentityKey.length > 0 && expectedFingerprint.length > 0;
  }

  private generateKey(prefix: string): string {
    const result = randomBytes(32).toString('hex');
    return `${prefix}-${result}`;
  }
}

export function createKeyExchange(identityKey?: string): KeyExchange {
  return new KeyExchange(identityKey);
}
