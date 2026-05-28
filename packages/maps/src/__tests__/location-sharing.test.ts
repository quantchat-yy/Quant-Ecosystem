import { describe, it, expect } from 'vitest';
import { LocationSharingService } from '../sharing/location-sharing.js';

describe('LocationSharingService', () => {
  it('createSession generates valid session', () => {
    const svc = new LocationSharingService();
    const session = svc.createSession('user1', ['friend1', 'friend2']);
    expect(session.id).toContain('share_');
    expect(session.sharedWith).toEqual(['friend1', 'friend2']);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('expired sessions are cleaned up', () => {
    const svc = new LocationSharingService();
    const session = svc.createSession('user1', ['f1'], { duration: -1 });
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    expect(svc.getSession(session.id)).not.toBeNull();
  });

  it('updatePosition calculates ETA when destination provided', () => {
    const svc = new LocationSharingService();
    const session = svc.createSession('user1', ['f1']);
    const updated = svc.updatePosition(session.id, { lat: 19.0, lng: 72.8 }, 10, {
      lat: 19.1,
      lng: 72.9,
    });
    expect(updated).not.toBeNull();
    expect(updated!.eta).toBeGreaterThan(Date.now());
  });

  it('getSession enforces privacy for non-participants', () => {
    const svc = new LocationSharingService();
    const session = svc.createSession('user1', ['friend1']);
    expect(svc.getSession(session.id, 'friend1')).not.toBeNull();
    expect(svc.getSession(session.id, 'stranger')).toBeNull();
  });

  it('endSession removes the session', () => {
    const svc = new LocationSharingService();
    const session = svc.createSession('user1', ['f1']);
    svc.endSession(session.id);
    expect(svc.getSession(session.id)).toBeNull();
  });
});
