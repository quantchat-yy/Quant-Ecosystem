import { describe, it, expect, beforeEach } from 'vitest';
import { CallSessionManager } from '../providers/call-session.js';

describe('CallSessionManager', () => {
  let manager: CallSessionManager;

  beforeEach(() => {
    manager = new CallSessionManager();
  });

  it('creates a session with idle state', () => {
    const session = manager.create('CA1', '+1111', '+2222', 'outbound');
    expect(session.status).toBe('idle');
    expect(session.callSid).toBe('CA1');
    expect(session.fromNumber).toBe('+1111');
    expect(session.toNumber).toBe('+2222');
    expect(session.direction).toBe('outbound');
  });

  it('transitions through valid states', () => {
    manager.create('CA1', '+1111', '+2222', 'outbound');
    manager.transition('CA1', 'dialing');
    expect(manager.get('CA1')?.status).toBe('dialing');
    manager.transition('CA1', 'ringing');
    expect(manager.get('CA1')?.status).toBe('ringing');
    manager.transition('CA1', 'connected');
    expect(manager.get('CA1')?.status).toBe('connected');
    manager.transition('CA1', 'on-hold');
    expect(manager.get('CA1')?.status).toBe('on-hold');
    manager.transition('CA1', 'connected');
    expect(manager.get('CA1')?.status).toBe('connected');
    manager.transition('CA1', 'ended');
    expect(manager.get('CA1')?.status).toBe('ended');
  });

  it('throws on invalid transitions', () => {
    manager.create('CA1', '+1111', '+2222', 'outbound');
    expect(() => manager.transition('CA1', 'connected')).toThrow('Invalid transition');
  });

  it('throws for unknown session', () => {
    expect(() => manager.transition('nope', 'dialing')).toThrow('Session not found');
  });

  it('allows any state to transition to failed', () => {
    manager.create('CA1', '+1111', '+2222', 'outbound');
    manager.transition('CA1', 'failed');
    expect(manager.get('CA1')?.status).toBe('failed');
  });

  it('getActive excludes ended and failed sessions', () => {
    manager.create('CA1', '+1', '+2', 'outbound');
    manager.create('CA2', '+1', '+3', 'outbound');
    manager.transition('CA1', 'dialing');
    manager.transition('CA2', 'failed');
    const active = manager.getActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.callSid).toBe('CA1');
  });

  it('end() transitions to ended', () => {
    manager.create('CA1', '+1', '+2', 'outbound');
    manager.transition('CA1', 'dialing');
    manager.end('CA1');
    expect(manager.get('CA1')?.status).toBe('ended');
  });

  it('fires onStateChange callbacks', () => {
    const events: unknown[] = [];
    manager.onStateChange((e) => events.push(e));
    manager.create('CA1', '+1', '+2', 'outbound');
    manager.transition('CA1', 'dialing');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'state-change', callSid: 'CA1' });
  });

  it('removeStateChangeListener stops delivering events', () => {
    const events: unknown[] = [];
    const callback = (e: unknown) => events.push(e);
    manager.onStateChange(callback);
    manager.create('CA1', '+1', '+2', 'outbound');
    manager.transition('CA1', 'dialing');
    expect(events).toHaveLength(1);
    manager.removeStateChangeListener(callback);
    manager.transition('CA1', 'ringing');
    expect(events).toHaveLength(1);
  });
});
