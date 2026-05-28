import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceActionAudit, type DeviceAuditEntry } from '../audit/action-audit.js';

describe('DeviceActionAudit', () => {
  let audit: DeviceActionAudit;

  const entry1: DeviceAuditEntry = {
    id: '1',
    timestamp: 1000,
    capability: 'phone',
    action: 'placeCall',
    params: { number: '+1234' },
    result: 'success',
  };

  const entry2: DeviceAuditEntry = {
    id: '2',
    timestamp: 2000,
    capability: 'sms',
    action: 'sendSMS',
    result: 'success',
  };

  const entry3: DeviceAuditEntry = {
    id: '3',
    timestamp: 3000,
    capability: 'phone',
    action: 'endCall',
    result: 'failure',
    undoRecipe: 'reconnect',
  };

  beforeEach(() => {
    audit = new DeviceActionAudit();
    audit.log(entry1);
    audit.log(entry2);
    audit.log(entry3);
  });

  it('logs and returns history', () => {
    expect(audit.getHistory()).toHaveLength(3);
  });

  it('queries by capability', () => {
    const results = audit.query({ capability: 'phone' });
    expect(results).toHaveLength(2);
  });

  it('queries by action', () => {
    const results = audit.query({ action: 'sendSMS' });
    expect(results).toHaveLength(1);
    expect(results[0]!.capability).toBe('sms');
  });

  it('queries by time range', () => {
    const results = audit.query({ timeRange: { start: 1500, end: 2500 } });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('2');
  });

  it('export returns a copy', () => {
    const exported = audit.export();
    expect(exported).toHaveLength(3);
    exported.pop();
    expect(audit.getHistory()).toHaveLength(3);
  });
});
