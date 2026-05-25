// ============================================================================
// Quant Ecosystem Bridge - Auth State Sync Service
// Synchronizes authentication state across all 9 Quant apps (SSO)
// ============================================================================

import {
  AppName,
  SessionInfo,
  ALL_APPS,
  APP_REGISTRY
} from '../types';

interface LoginEvent {
  userId: string;
  app: AppName;
  sessionId: string;
  timestamp: number;
  device: string;
  ipAddress: string;
}

interface LogoutEvent {
  userId: string;
  app: AppName;
  sessionId: string;
  timestamp: number;
  reason: 'user_initiated' | 'timeout' | 'forced' | 'token_expired' | 'security';
}

interface SessionTimeline {
  userId: string;
  events: Array<LoginEvent | LogoutEvent & { type: 'login' | 'logout' }>;
  totalLogins: number;
  totalLogouts: number;
  averageSessionDuration: number;
  mostActiveApp: AppName;
  lastActivity: number;
}

interface TokenValidation {
  valid: boolean;
  userId?: string;
  app?: AppName;
  expiresAt?: number;
  reason?: string;
  permissions?: string[];
}

interface CrossAppToken {
  token: string;
  userId: string;
  sourceApp: AppName;
  targetApp: AppName;
  issuedAt: number;
  expiresAt: number;
  scopes: string[];
}

export class AuthStateSync {
  private sessions: Map<string, SessionInfo> = new Map();
  private userSessions: Map<string, Map<AppName, SessionInfo>> = new Map();
  private loginHistory: Map<string, Array<LoginEvent & { type: 'login' }>> = new Map();
  private logoutHistory: Map<string, Array<LogoutEvent & { type: 'logout' }>> = new Map();
  private crossAppTokens: Map<string, CrossAppToken> = new Map();
  private tokenCounter: number = 0;

  async syncLogin(userId: string, app: AppName, session: {
    device: string;
    ipAddress: string;
    token: string;
    expiresAt: number;
  }): Promise<{ sessionId: string; propagatedTo: AppName[] }> {
    const sessionId = this.generateSessionId();
    const sessionInfo: SessionInfo = {
      sessionId,
      userId,
      app,
      token: session.token,
      createdAt: Date.now(),
      expiresAt: session.expiresAt,
      lastActivity: Date.now(),
      device: session.device,
      ipAddress: session.ipAddress,
      active: true
    };

    this.sessions.set(sessionId, sessionInfo);

    const userSessionMap = this.userSessions.get(userId) || new Map();
    userSessionMap.set(app, sessionInfo);
    this.userSessions.set(userId, userSessionMap);

    const loginEvent: LoginEvent & { type: 'login' } = {
      type: 'login',
      userId,
      app,
      sessionId,
      timestamp: Date.now(),
      device: session.device,
      ipAddress: session.ipAddress
    };
    const history = this.loginHistory.get(userId) || [];
    history.push(loginEvent);
    if (history.length > 200) history.splice(0, history.length - 200);
    this.loginHistory.set(userId, history);

    const propagatedTo = this.propagateLogin(userId, app, sessionInfo);

    return { sessionId, propagatedTo };
  }

  async syncLogout(userId: string, app: AppName, reason: LogoutEvent['reason'] = 'user_initiated'): Promise<{ loggedOutFrom: AppName[] }> {
    const userSessionMap = this.userSessions.get(userId);
    if (!userSessionMap) return { loggedOutFrom: [] };

    const session = userSessionMap.get(app);
    if (session) {
      session.active = false;
      this.sessions.delete(session.sessionId);
      userSessionMap.delete(app);
    }

    const logoutEvent: LogoutEvent & { type: 'logout' } = {
      type: 'logout',
      userId,
      app,
      sessionId: session?.sessionId || 'unknown',
      timestamp: Date.now(),
      reason
    };
    const history = this.logoutHistory.get(userId) || [];
    history.push(logoutEvent);
    this.logoutHistory.set(userId, history);

    const loggedOutFrom: AppName[] = [app];

    if (reason === 'security' || reason === 'forced') {
      for (const [otherApp, otherSession] of userSessionMap.entries()) {
        otherSession.active = false;
        this.sessions.delete(otherSession.sessionId);
        loggedOutFrom.push(otherApp);
      }
      userSessionMap.clear();
    }

    this.invalidateCrossAppTokens(userId, app);

    return { loggedOutFrom };
  }

  getActiveSessions(userId: string): SessionInfo[] {
    const userSessionMap = this.userSessions.get(userId);
    if (!userSessionMap) return [];

    const activeSessions: SessionInfo[] = [];
    for (const [app, session] of userSessionMap.entries()) {
      if (session.active && session.expiresAt > Date.now()) {
        activeSessions.push(session);
      } else {
        session.active = false;
        this.sessions.delete(session.sessionId);
        userSessionMap.delete(app);
      }
    }

    return activeSessions;
  }

  async propagateTokenRefresh(userId: string, newToken: string, app: AppName): Promise<AppName[]> {
    const userSessionMap = this.userSessions.get(userId);
    if (!userSessionMap) return [];

    const session = userSessionMap.get(app);
    if (!session) return [];

    session.token = newToken;
    session.lastActivity = Date.now();
    session.expiresAt = Date.now() + 3600000;

    const refreshedApps: AppName[] = [app];

    for (const [otherApp, otherSession] of userSessionMap.entries()) {
      if (otherApp !== app && otherSession.active) {
        otherSession.lastActivity = Date.now();
        refreshedApps.push(otherApp);
      }
    }

    return refreshedApps;
  }

  validateCrossApp(token: string, targetApp: AppName): TokenValidation {
    const crossAppToken = this.crossAppTokens.get(token);
    if (crossAppToken) {
      if (crossAppToken.expiresAt < Date.now()) {
        this.crossAppTokens.delete(token);
        return { valid: false, reason: 'Cross-app token expired' };
      }
      if (crossAppToken.targetApp !== targetApp) {
        return { valid: false, reason: 'Token not valid for target app' };
      }
      return {
        valid: true,
        userId: crossAppToken.userId,
        app: crossAppToken.sourceApp,
        expiresAt: crossAppToken.expiresAt,
        permissions: crossAppToken.scopes
      };
    }

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.token === token && session.active) {
        if (session.expiresAt < Date.now()) {
          return { valid: false, reason: 'Session expired' };
        }
        return {
          valid: true,
          userId: session.userId,
          app: session.app,
          expiresAt: session.expiresAt,
          permissions: ['read', 'write']
        };
      }
    }

    return { valid: false, reason: 'Token not found' };
  }

  generateCrossAppToken(userId: string, sourceApp: AppName, targetApp: AppName, scopes: string[]): CrossAppToken | null {
    const userSessionMap = this.userSessions.get(userId);
    if (!userSessionMap) return null;

    const sourceSession = userSessionMap.get(sourceApp);
    if (!sourceSession || !sourceSession.active) return null;

    const token: CrossAppToken = {
      token: this.generateToken(),
      userId,
      sourceApp,
      targetApp,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 900000,
      scopes
    };

    this.crossAppTokens.set(token.token, token);
    return token;
  }

  async revokeAllSessions(userId: string): Promise<number> {
    const userSessionMap = this.userSessions.get(userId);
    if (!userSessionMap) return 0;

    let revokedCount = 0;
    for (const [app, session] of userSessionMap.entries()) {
      session.active = false;
      this.sessions.delete(session.sessionId);
      revokedCount++;

      const logoutEvent: LogoutEvent & { type: 'logout' } = {
        type: 'logout',
        userId,
        app,
        sessionId: session.sessionId,
        timestamp: Date.now(),
        reason: 'forced'
      };
      const history = this.logoutHistory.get(userId) || [];
      history.push(logoutEvent);
      this.logoutHistory.set(userId, history);
    }

    userSessionMap.clear();
    this.invalidateAllCrossAppTokens(userId);

    return revokedCount;
  }

  getSessionTimeline(userId: string): SessionTimeline {
    const logins = this.loginHistory.get(userId) || [];
    const logouts = this.logoutHistory.get(userId) || [];

    const allEvents = [
      ...logins.map(e => ({ ...e, type: 'login' as const })),
      ...logouts.map(e => ({ ...e, type: 'logout' as const }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    const appActivity: Map<string, number> = new Map();
    for (const login of logins) {
      appActivity.set(login.app, (appActivity.get(login.app) || 0) + 1);
    }

    let mostActiveApp: AppName = 'quantchat';
    let maxActivity = 0;
    for (const [app, count] of appActivity.entries()) {
      if (count > maxActivity) {
        maxActivity = count;
        mostActiveApp = app as AppName;
      }
    }

    const sessionDurations: number[] = [];
    for (const logout of logouts) {
      const matchingLogin = logins.find(l => l.sessionId === logout.sessionId);
      if (matchingLogin) {
        sessionDurations.push(logout.timestamp - matchingLogin.timestamp);
      }
    }

    const averageDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    return {
      userId,
      events: allEvents.slice(0, 100) as any,
      totalLogins: logins.length,
      totalLogouts: logouts.length,
      averageSessionDuration: averageDuration,
      mostActiveApp,
      lastActivity: allEvents.length > 0 ? allEvents[0].timestamp : 0
    };
  }

  isUserLoggedIn(userId: string, app?: AppName): boolean {
    const userSessionMap = this.userSessions.get(userId);
    if (!userSessionMap) return false;

    if (app) {
      const session = userSessionMap.get(app);
      return !!session && session.active && session.expiresAt > Date.now();
    }

    for (const session of userSessionMap.values()) {
      if (session.active && session.expiresAt > Date.now()) return true;
    }
    return false;
  }

  private propagateLogin(userId: string, sourceApp: AppName, session: SessionInfo): AppName[] {
    const propagated: AppName[] = [];
    const userSessionMap = this.userSessions.get(userId) || new Map();

    for (const app of ALL_APPS) {
      if (app !== sourceApp && !userSessionMap.has(app)) {
        propagated.push(app);
      }
    }

    return propagated;
  }

  private invalidateCrossAppTokens(userId: string, app: AppName): void {
    for (const [token, data] of this.crossAppTokens.entries()) {
      if (data.userId === userId && (data.sourceApp === app || data.targetApp === app)) {
        this.crossAppTokens.delete(token);
      }
    }
  }

  private invalidateAllCrossAppTokens(userId: string): void {
    for (const [token, data] of this.crossAppTokens.entries()) {
      if (data.userId === userId) {
        this.crossAppTokens.delete(token);
      }
    }
  }

  private generateSessionId(): string {
    this.tokenCounter++;
    return `session_${Date.now()}_${this.tokenCounter}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateToken(): string {
    const parts: string[] = [];
    for (let i = 0; i < 4; i++) {
      parts.push(Math.random().toString(36).substring(2, 10));
    }
    return `qcat_${parts.join('')}`;
  }
}
