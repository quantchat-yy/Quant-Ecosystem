import { describe, it, expect, vi } from 'vitest';
import { PrivacyAudit } from '../privacy/privacy-audit.js';

describe('PrivacyAudit', () => {
  it('record adds event to log', () => {
    const audit = new PrivacyAudit();
    audit.record('mic_activated');
    expect(audit.getCount()).toBe(1);
  });

  it('events are frozen and cannot be mutated', () => {
    const audit = new PrivacyAudit();
    audit.record('mic_activated', { device: 'default' });
    const events = audit.query({});
    expect(() => {
      (events[0] as unknown as Record<string, unknown>).type = 'mic_deactivated';
    }).toThrow();
  });

  it('query filters by type', () => {
    const audit = new PrivacyAudit();
    audit.record('mic_activated');
    audit.record('frame_captured');
    audit.record('mic_deactivated');

    const micEvents = audit.query({ type: 'mic_activated' });
    expect(micEvents.length).toBe(1);
    expect(micEvents[0]!.type).toBe('mic_activated');
  });

  it('query filters by time range', () => {
    const audit = new PrivacyAudit();
    const now = Date.now();

    vi.spyOn(Date, 'now').mockReturnValue(now - 5000);
    audit.record('mic_activated');
    vi.spyOn(Date, 'now').mockReturnValue(now - 2000);
    audit.record('frame_captured');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    audit.record('mic_deactivated');

    const filtered = audit.query({ since: now - 3000 });
    expect(filtered.length).toBe(2);
    vi.restoreAllMocks();
  });

  it('getLastHour returns only recent events', () => {
    const audit = new PrivacyAudit();
    const now = Date.now();

    vi.spyOn(Date, 'now').mockReturnValue(now - 7200000); // 2 hours ago
    audit.record('mic_activated');
    vi.spyOn(Date, 'now').mockReturnValue(now);
    audit.record('frame_captured');

    const recent = audit.getLastHour();
    expect(recent.length).toBe(1);
    expect(recent[0]!.type).toBe('frame_captured');
    vi.restoreAllMocks();
  });

  it('exportJSON returns valid JSON array', () => {
    const audit = new PrivacyAudit();
    audit.record('mic_activated');
    audit.record('buffer_cleared');

    const json = audit.exportJSON();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
  });

  it('clear removes all events', () => {
    const audit = new PrivacyAudit();
    audit.record('mic_activated');
    audit.record('mic_deactivated');
    audit.clear();
    expect(audit.getCount()).toBe(0);
  });
});
