import { describe, it, expect, beforeEach } from 'vitest';
import { ConsentManager } from '../core/consent-manager.js';

describe('ConsentManager', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = new ConsentManager();
  });

  describe('requestConsent', () => {
    it('creates a consent prompt and returns id', () => {
      const id = manager.requestConsent('user-1', 'agent-1', 'email', 'Need email access');
      expect(id).toBeDefined();
      expect(id.startsWith('consent-')).toBe(true);
    });
  });

  describe('recordResponse', () => {
    it('records a granted response', () => {
      const id = manager.requestConsent('user-1', 'agent-1', 'email', 'Need access');
      expect(manager.recordResponse(id, 'user-1', true)).toBe(true);
      expect(manager.hasConsent('user-1', 'agent-1', 'email')).toBe(true);
    });

    it('records a denied response', () => {
      const id = manager.requestConsent('user-1', 'agent-1', 'email', 'Need access');
      expect(manager.recordResponse(id, 'user-1', false)).toBe(true);
      expect(manager.hasConsent('user-1', 'agent-1', 'email')).toBe(false);
    });

    it('returns false for invalid prompt', () => {
      expect(manager.recordResponse('invalid', 'user-1', true)).toBe(false);
    });

    it('returns false if userId does not match', () => {
      const id = manager.requestConsent('user-1', 'agent-1', 'email', 'Reason');
      expect(manager.recordResponse(id, 'user-2', true)).toBe(false);
    });
  });

  describe('hasConsent', () => {
    it('returns false if no consent prompt exists', () => {
      expect(manager.hasConsent('user-1', 'agent-1', 'email')).toBe(false);
    });

    it('returns true only for granted consent', () => {
      const id = manager.requestConsent('user-1', 'agent-1', 'email', 'Reason');
      manager.recordResponse(id, 'user-1', true);
      expect(manager.hasConsent('user-1', 'agent-1', 'email')).toBe(true);
    });
  });

  describe('revokeConsent', () => {
    it('revokes a granted consent', () => {
      const id = manager.requestConsent('user-1', 'agent-1', 'email', 'Reason');
      manager.recordResponse(id, 'user-1', true);
      expect(manager.revokeConsent(id)).toBe(true);
      expect(manager.hasConsent('user-1', 'agent-1', 'email')).toBe(false);
    });

    it('returns false if no response exists', () => {
      expect(manager.revokeConsent('unknown')).toBe(false);
    });
  });

  describe('getActiveConsents', () => {
    it('returns all granted consents for a user', () => {
      const id1 = manager.requestConsent('user-1', 'agent-1', 'email', 'R1');
      const id2 = manager.requestConsent('user-1', 'agent-2', 'doc', 'R2');
      manager.requestConsent('user-1', 'agent-3', 'file', 'R3');
      manager.recordResponse(id1, 'user-1', true);
      manager.recordResponse(id2, 'user-1', true);

      const consents = manager.getActiveConsents('user-1');
      expect(consents).toHaveLength(2);
    });
  });

  describe('data usage', () => {
    it('logs and retrieves data usage explanation', () => {
      manager.logDataUsage('sugg-1', 'agent-1', ['res-1', 'res-2'], 'Used for recommendation');
      const explanation = manager.getDataUsageExplanation('sugg-1');
      expect(explanation).toHaveLength(1);
      expect(explanation?.[0]?.agentId).toBe('agent-1');
      expect(explanation?.[0]?.resourceIds).toEqual(['res-1', 'res-2']);
    });

    it('returns undefined for unknown suggestion', () => {
      expect(manager.getDataUsageExplanation('unknown')).toBeUndefined();
    });

    it('getAIDataUsagePanel returns panel data', () => {
      const id = manager.requestConsent('user-1', 'agent-1', 'email', 'Reason');
      manager.recordResponse(id, 'user-1', true);
      manager.logDataUsage('sugg-1', 'agent-1', ['res-1'], 'Used data');

      const panel = manager.getAIDataUsagePanel('user-1');
      expect(panel).toHaveLength(1);
      expect(panel[0]?.usage).toHaveLength(1);
    });
  });
});
