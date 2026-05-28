import type { PrivacyAuditEvent, PrivacyAuditEventType } from '../types.js';

let auditIdCounter = 0;

export class PrivacyAudit {
  private events: PrivacyAuditEvent[] = [];

  record(type: PrivacyAuditEventType, metadata?: Record<string, unknown>): void {
    const event: PrivacyAuditEvent = Object.freeze({
      id: `audit-${++auditIdCounter}`,
      type,
      timestamp: Date.now(),
      metadata,
    });
    this.events.push(event);
  }

  query(filter: {
    type?: PrivacyAuditEventType;
    since?: number;
    until?: number;
  }): PrivacyAuditEvent[] {
    return this.events.filter((e) => {
      if (filter.type && e.type !== filter.type) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      if (filter.until && e.timestamp > filter.until) return false;
      return true;
    });
  }

  getLastHour(): PrivacyAuditEvent[] {
    const oneHourAgo = Date.now() - 3600000;
    return this.events.filter((e) => e.timestamp >= oneHourAgo);
  }

  exportJSON(): string {
    return JSON.stringify(this.events);
  }

  clear(): void {
    this.events = [];
  }

  getCount(): number {
    return this.events.length;
  }
}
