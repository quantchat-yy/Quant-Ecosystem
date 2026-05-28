import { describe, it, expect, beforeEach } from 'vitest';
import { CallAgent } from '../agents/call-agent.js';
import { PermissionManager } from '../permissions/permission-manager.js';
import type { PhoneCapability } from '../capabilities/phone.js';

function createMockPhone(): PhoneCapability {
  return {
    capability: 'phone',
    isAvailable: async () => true,
    initialize: async () => {},
    dispose: () => {},
    placeCall: async (n: string) => `call_${n}`,
    answerCall: async () => {},
    endCall: async () => {},
    holdCall: async () => {},
    transferCall: async () => {},
  };
}

describe('CallAgent', () => {
  let agent: CallAgent;
  let permissions: PermissionManager;
  let phone: PhoneCapability;

  beforeEach(() => {
    permissions = new PermissionManager();
    phone = createMockPhone();
    permissions.setState('phone', 'granted');
    agent = new CallAgent({
      phoneProvider: phone,
      permissionManager: permissions,
      allowedContacts: ['+15551111111'],
    });
  });

  it('blocks calls when permission is denied', async () => {
    permissions.setState('phone', 'denied');
    const result = await agent.handleIntent({ action: 'place', target: '+15551111111' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('denied');
  });

  it('places a call to an allowed contact', async () => {
    const result = await agent.handleIntent({ action: 'place', target: '+15551111111' });
    expect(result.success).toBe(true);
    expect(result.callSid).toBe('call_+15551111111');
  });

  it('places a call to an unknown number (tier 3 required)', async () => {
    const result = await agent.handleIntent({ action: 'place', target: '+19999999999' });
    expect(result.success).toBe(true);
  });

  it('returns error when no target specified for place', async () => {
    const result = await agent.handleIntent({ action: 'place' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('No target');
  });

  it('handles answer intent', async () => {
    const result = await agent.handleIntent({ action: 'answer', callId: 'CA1' });
    expect(result.success).toBe(true);
    expect(result.callSid).toBe('CA1');
  });

  it('handles end intent', async () => {
    const result = await agent.handleIntent({ action: 'end', callId: 'CA1' });
    expect(result.success).toBe(true);
  });

  it('handles hold intent', async () => {
    const result = await agent.handleIntent({ action: 'hold', callId: 'CA1' });
    expect(result.success).toBe(true);
  });

  it('handles transfer intent', async () => {
    const result = await agent.handleIntent({ action: 'transfer', callId: 'CA1', target: '+1555' });
    expect(result.success).toBe(true);
  });

  it('requires callId for end/hold/transfer', async () => {
    const r1 = await agent.handleIntent({ action: 'end' });
    expect(r1.success).toBe(false);
    const r2 = await agent.handleIntent({ action: 'hold' });
    expect(r2.success).toBe(false);
    const r3 = await agent.handleIntent({ action: 'transfer', target: '+1' });
    expect(r3.success).toBe(false);
  });
});
