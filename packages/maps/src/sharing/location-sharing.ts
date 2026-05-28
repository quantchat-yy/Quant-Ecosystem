import { type LatLng, type ShareSession, type ShareConfig } from '../types.js';
import { haversine } from '../utils/geo.js';

const DEFAULT_CONFIG: ShareConfig = { duration: 3600000, accuracy: 'high', shareEta: false };

export class LocationSharingService {
  private sessions = new Map<string, ShareSession>();

  createSession(
    userId: string,
    contacts: string[],
    config: Partial<ShareConfig> = {},
  ): ShareSession {
    this.cleanup();
    const cfg = { ...DEFAULT_CONFIG, ...config };
    if (cfg.duration <= 0) cfg.duration = DEFAULT_CONFIG.duration;
    const session: ShareSession = {
      id: `share_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      sharedWith: contacts,
      position: { lat: 0, lng: 0 },
      accuracy: 0,
      expiresAt: Date.now() + cfg.duration,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  updatePosition(
    sessionId: string,
    position: LatLng,
    accuracy: number,
    destination?: LatLng,
  ): ShareSession | null {
    this.cleanup();
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.position = position;
    session.accuracy = accuracy;
    if (destination) {
      const dist = haversine(position, destination);
      session.eta = Date.now() + (dist / 8.33) * 1000; // ~30km/h avg
    }
    return session;
  }

  getSession(sessionId: string, requesterId?: string): ShareSession | null {
    this.cleanup();
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (requesterId && session.userId !== requesterId && !session.sharedWith.includes(requesterId))
      return null;
    return session;
  }

  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getActiveSessions(userId: string): ShareSession[] {
    this.cleanup();
    return [...this.sessions.values()].filter((s) => s.userId === userId);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (s.expiresAt <= now) this.sessions.delete(id);
    }
  }
}
