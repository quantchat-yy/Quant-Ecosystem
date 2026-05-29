import { z } from 'zod';
import type { HandoffSession } from '../types.js';

const InitiateHandoffInputSchema = z.object({
  fromDevice: z.string().min(1),
  toDevice: z.string().min(1),
  context: z.record(z.unknown()),
});

export class HandoffManager {
  private sessions: Map<string, HandoffSession> = new Map();

  initiateHandoff(
    fromDevice: string,
    toDevice: string,
    context: Record<string, unknown>,
  ): HandoffSession {
    InitiateHandoffInputSchema.parse({ fromDevice, toDevice, context });
    const id = `handoff-${crypto.randomUUID()}`;
    const session: HandoffSession = {
      id,
      sourceDevice: fromDevice,
      targetDevice: toDevice,
      state: 'pending',
      context,
      startedAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  acceptHandoff(sessionId: string): HandoffSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'pending') return null;
    const updated: HandoffSession = { ...session, state: 'accepted' };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  rejectHandoff(sessionId: string): HandoffSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'pending') return null;
    const updated: HandoffSession = { ...session, state: 'rejected' };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  getActiveSessions(): HandoffSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.state === 'pending' || s.state === 'accepted' || s.state === 'transferring',
    );
  }

  transferState(sessionId: string): HandoffSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'accepted') return null;
    const transferring: HandoffSession = { ...session, state: 'transferring' };
    this.sessions.set(sessionId, transferring);
    const completed: HandoffSession = { ...transferring, state: 'completed' };
    this.sessions.set(sessionId, completed);
    return completed;
  }

  getSession(sessionId: string): HandoffSession | undefined {
    return this.sessions.get(sessionId);
  }
}
