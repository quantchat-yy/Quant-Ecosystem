import type { CallDirection, CallEvent, CallSession, CallState } from './types.js';

type StateChangeCallback = (event: CallEvent) => void;

const VALID_TRANSITIONS: Record<CallState, CallState[]> = {
  idle: ['dialing', 'ringing', 'failed'],
  dialing: ['ringing', 'connected', 'failed', 'ended'],
  ringing: ['connected', 'failed', 'ended'],
  connected: ['on-hold', 'ended', 'failed'],
  'on-hold': ['connected', 'ended', 'failed'],
  ended: [],
  failed: [],
};

export class CallSessionManager {
  private sessions = new Map<string, CallSession>();
  private listeners: StateChangeCallback[] = [];

  create(callSid: string, from: string, to: string, direction: CallDirection): CallSession {
    const session: CallSession = {
      callSid,
      status: 'idle',
      fromNumber: from,
      toNumber: to,
      startTime: Date.now(),
      duration: 0,
      direction,
    };
    this.sessions.set(callSid, session);
    return session;
  }

  transition(callSid: string, newState: CallState): void {
    const session = this.sessions.get(callSid);
    if (!session) throw new Error(`Session not found: ${callSid}`);
    const allowed = VALID_TRANSITIONS[session.status];
    if (!allowed?.includes(newState)) {
      throw new Error(`Invalid transition: ${session.status} -> ${newState}`);
    }
    const oldState = session.status;
    session.status = newState;
    if (newState === 'ended' || newState === 'failed') {
      session.duration = Date.now() - session.startTime;
    }
    const event: CallEvent = {
      type: 'state-change',
      callSid,
      data: { from: oldState, to: newState },
    };
    for (const cb of this.listeners) cb(event);
  }

  get(callSid: string): CallSession | undefined {
    return this.sessions.get(callSid);
  }

  getActive(): CallSession[] {
    return [...this.sessions.values()].filter((s) => s.status !== 'ended' && s.status !== 'failed');
  }

  end(callSid: string): void {
    const session = this.sessions.get(callSid);
    if (!session) return;
    if (session.status !== 'ended' && session.status !== 'failed') {
      this.transition(callSid, 'ended');
    }
  }

  onStateChange(callback: StateChangeCallback): void {
    this.listeners.push(callback);
  }

  removeStateChangeListener(callback: StateChangeCallback): void {
    const idx = this.listeners.indexOf(callback);
    if (idx !== -1) {
      this.listeners.splice(idx, 1);
    }
  }
}
