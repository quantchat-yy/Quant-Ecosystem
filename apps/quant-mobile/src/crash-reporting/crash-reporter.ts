// Crash Reporter - Privacy-respecting error tracking (Sentry/GlitchTip compatible)

import { randomBytes } from 'node:crypto';

export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export type BreadcrumbType = 'navigation' | 'http' | 'ui' | 'user' | 'system' | 'error';

export interface Breadcrumb {
  type: BreadcrumbType;
  category?: string;
  message: string;
  level?: SeverityLevel;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface CrashConfig {
  dsn: string;
  environment: string;
  release?: string;
  maxBreadcrumbs: number;
  privacyMode: boolean;
  sampleRate: number;
  enableAutoCapture: boolean;
}

export interface CrashEvent {
  eventId: string;
  timestamp: number;
  level: SeverityLevel;
  message?: string;
  error?: { name: string; message: string; stack?: string };
  tags: Record<string, string>;
  breadcrumbs: Breadcrumb[];
  user?: { id: string; email?: string } | null;
  context?: Record<string, unknown>;
}

const MAX_BREADCRUMBS = 100;

export class CrashReporter {
  private initialized = false;
  private config: CrashConfig | null = null;
  private breadcrumbs: Breadcrumb[] = [];
  private tags: Record<string, string> = {};
  private user: { id: string; email?: string } | null = null;
  private lastEventId: string | null = null;
  private events: CrashEvent[] = [];

  init(dsn: string, config?: Partial<CrashConfig>): void {
    if (!dsn) {
      throw new Error('DSN is required');
    }
    this.config = {
      dsn,
      environment: config?.environment ?? 'production',
      release: config?.release,
      maxBreadcrumbs: config?.maxBreadcrumbs ?? MAX_BREADCRUMBS,
      privacyMode: config?.privacyMode ?? true,
      sampleRate: config?.sampleRate ?? 1.0,
      enableAutoCapture: config?.enableAutoCapture ?? true,
    };
    this.initialized = true;
  }

  captureException(error: Error, context?: Record<string, unknown>): string {
    this.ensureInitialized();
    const eventId = this.generateEventId();

    const event: CrashEvent = {
      eventId,
      timestamp: Date.now(),
      level: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      tags: { ...this.tags },
      breadcrumbs: [...this.breadcrumbs],
      user: this.sanitizeUser(),
      context: this.config!.privacyMode ? this.stripPII(context) : context,
    };

    this.events.push(event);
    this.lastEventId = eventId;
    return eventId;
  }

  captureMessage(message: string, level?: SeverityLevel): string {
    this.ensureInitialized();
    const eventId = this.generateEventId();

    const event: CrashEvent = {
      eventId,
      timestamp: Date.now(),
      level: level ?? 'info',
      message,
      tags: { ...this.tags },
      breadcrumbs: [...this.breadcrumbs],
      user: this.sanitizeUser(),
    };

    this.events.push(event);
    this.lastEventId = eventId;
    return eventId;
  }

  setUser(user: { id: string; email?: string } | null): void {
    this.user = user;
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    const maxCrumbs = this.config?.maxBreadcrumbs ?? MAX_BREADCRUMBS;
    const entry: Breadcrumb = {
      ...breadcrumb,
      timestamp: breadcrumb.timestamp ?? Date.now(),
    };
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > maxCrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-maxCrumbs);
    }
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  getLastEventId(): string | null {
    return this.lastEventId;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /** @internal - for testing */
  _getEvents(): CrashEvent[] {
    return [...this.events];
  }

  /** @internal - for testing */
  _getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CrashReporter not initialized. Call init() first.');
    }
  }

  private sanitizeUser(): { id: string; email?: string } | null | undefined {
    if (!this.user) {
      return null;
    }
    if (this.config?.privacyMode) {
      return { id: this.user.id };
    }
    return this.user;
  }

  private stripPII(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) {
      return undefined;
    }
    const sanitized: Record<string, unknown> = {};
    const piiKeys = ['email', 'phone', 'name', 'address', 'ssn', 'password', 'token'];
    for (const [key, value] of Object.entries(context)) {
      if (piiKeys.some((pii) => key.toLowerCase().includes(pii))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private generateEventId(): string {
    return randomBytes(16).toString('hex');
  }
}
