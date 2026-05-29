import { describe, it, expect, beforeEach } from 'vitest';
import { HandoffManager } from '../handoff/handoff-manager.js';

describe('HandoffManager', () => {
  let manager: HandoffManager;

  beforeEach(() => {
    manager = new HandoffManager();
  });

  it('initiates a handoff session', () => {
    const session = manager.initiateHandoff('phone-1', 'glasses-1', { app: 'navigation' });
    expect(session.sourceDevice).toBe('phone-1');
    expect(session.targetDevice).toBe('glasses-1');
    expect(session.state).toBe('pending');
    expect(session.context).toEqual({ app: 'navigation' });
  });

  it('accepts a pending handoff', () => {
    const session = manager.initiateHandoff('phone-1', 'glasses-1', {});
    const accepted = manager.acceptHandoff(session.id);
    expect(accepted).not.toBeNull();
    expect(accepted!.state).toBe('accepted');
  });

  it('rejects a pending handoff', () => {
    const session = manager.initiateHandoff('phone-1', 'glasses-1', {});
    const rejected = manager.rejectHandoff(session.id);
    expect(rejected).not.toBeNull();
    expect(rejected!.state).toBe('rejected');
  });

  it('returns null when accepting non-pending session', () => {
    const session = manager.initiateHandoff('phone-1', 'glasses-1', {});
    manager.acceptHandoff(session.id);
    const result = manager.acceptHandoff(session.id);
    expect(result).toBeNull();
  });

  it('gets active sessions', () => {
    manager.initiateHandoff('phone-1', 'glasses-1', {});
    manager.initiateHandoff('glasses-1', 'watch-1', {});
    const active = manager.getActiveSessions();
    expect(active).toHaveLength(2);
  });

  it('transfers state for accepted session', () => {
    const session = manager.initiateHandoff('phone-1', 'glasses-1', { data: 'test' });
    manager.acceptHandoff(session.id);
    const completed = manager.transferState(session.id);
    expect(completed).not.toBeNull();
    expect(completed!.state).toBe('completed');
  });

  it('returns null transferring state of non-accepted session', () => {
    const session = manager.initiateHandoff('phone-1', 'glasses-1', {});
    expect(manager.transferState(session.id)).toBeNull();
  });
});
