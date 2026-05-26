import { describe, it, expect, beforeEach } from 'vitest';
import { EnterpriseSecurityService } from '../services/enterprise-security.service';

describe('EnterpriseSecurityService', () => {
  let service: EnterpriseSecurityService;

  beforeEach(() => {
    service = new EnterpriseSecurityService();
  });

  describe('SAML configuration', () => {
    it('configures SAML for an organization', () => {
      const config = service.configureSAML(
        'org-1',
        'https://idp.example.com/sso',
        'MIIC...cert...',
        'urn:quantwork:sp',
      );

      expect(config.id).toBeDefined();
      expect(config.orgId).toBe('org-1');
      expect(config.idpUrl).toBe('https://idp.example.com/sso');
      expect(config.cert).toBe('MIIC...cert...');
      expect(config.entityId).toBe('urn:quantwork:sp');
      expect(config.enabled).toBe(true);
      expect(config.createdAt).toBeInstanceOf(Date);
    });

    it('overwrites existing SAML config for same org', () => {
      service.configureSAML('org-1', 'https://old.example.com/sso', 'old-cert', 'old-entity');
      const config = service.configureSAML(
        'org-1',
        'https://new.example.com/sso',
        'new-cert',
        'new-entity',
      );

      expect(config.idpUrl).toBe('https://new.example.com/sso');
      expect(config.cert).toBe('new-cert');
    });
  });

  describe('SCIM provisioning', () => {
    it('configures SCIM endpoint', () => {
      const config = service.configureSCIM(
        'org-1',
        'https://scim.example.com/v2',
        'bearer-token-123',
      );

      expect(config.id).toBeDefined();
      expect(config.orgId).toBe('org-1');
      expect(config.endpoint).toBe('https://scim.example.com/v2');
      expect(config.token).toBe('bearer-token-123');
      expect(config.enabled).toBe(true);
    });

    it('provisions a user', () => {
      const user = service.provisionUser('org-1', 'alice@example.com', 'admin', [
        'engineering',
        'platform',
      ]);

      expect(user.id).toBeDefined();
      expect(user.orgId).toBe('org-1');
      expect(user.email).toBe('alice@example.com');
      expect(user.role).toBe('admin');
      expect(user.groups).toEqual(['engineering', 'platform']);
      expect(user.status).toBe('active');
    });

    it('deprovisions a user', () => {
      const user = service.provisionUser('org-1', 'bob@example.com', 'member', ['sales']);
      service.deprovisionUser('org-1', user.id);

      // User should be deprovisioned - verify via audit or re-provision
      expect(user.status).toBe('deprovisioned');
    });

    it('throws when deprovisioning non-existent user', () => {
      expect(() => service.deprovisionUser('org-1', 'bad-id')).toThrow(
        'Provisioned user not found',
      );
    });

    it('throws when org does not match', () => {
      const user = service.provisionUser('org-1', 'charlie@example.com', 'member', []);
      expect(() => service.deprovisionUser('org-2', user.id)).toThrow(
        'User does not belong to organization',
      );
    });
  });

  describe('audit logging', () => {
    it('logs an audit event', () => {
      const entry = service.logAuditEvent('org-1', 'user-1', 'login', 'session', {
        ip: '127.0.0.1',
      });

      expect(entry.id).toBeDefined();
      expect(entry.orgId).toBe('org-1');
      expect(entry.userId).toBe('user-1');
      expect(entry.action).toBe('login');
      expect(entry.resource).toBe('session');
      expect(entry.details).toEqual({ ip: '127.0.0.1' });
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it('retrieves audit log filtered by org', () => {
      service.logAuditEvent('org-1', 'user-1', 'login', 'session');
      service.logAuditEvent('org-2', 'user-2', 'login', 'session');
      service.logAuditEvent('org-1', 'user-3', 'logout', 'session');

      const log = service.getAuditLog('org-1');
      expect(log).toHaveLength(2);
    });

    it('filters audit log by action', () => {
      service.logAuditEvent('org-1', 'user-1', 'login', 'session');
      service.logAuditEvent('org-1', 'user-1', 'logout', 'session');
      service.logAuditEvent('org-1', 'user-1', 'login', 'session');

      const log = service.getAuditLog('org-1', { action: 'login' });
      expect(log).toHaveLength(2);
    });
  });

  describe('DLP policies', () => {
    it('sets a DLP policy with rules', () => {
      const policy = service.setDLPPolicy('org-1', [
        { pattern: '\\d{3}-\\d{2}-\\d{4}', action: 'block', description: 'Block SSN patterns' },
        { pattern: 'confidential', action: 'warn', description: 'Warn on confidential content' },
      ]);

      expect(policy.id).toBeDefined();
      expect(policy.orgId).toBe('org-1');
      expect(policy.rules).toHaveLength(2);
      expect(policy.rules[0]!.action).toBe('block');
      expect(policy.enabled).toBe(true);
    });

    it('checks content compliance - clean content', () => {
      service.setDLPPolicy('org-1', [
        { pattern: '\\d{3}-\\d{2}-\\d{4}', action: 'block', description: 'Block SSN' },
      ]);

      const result = service.checkDLPCompliance('Hello world, no sensitive data here', 'org-1');
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('checks content compliance - violation found', () => {
      service.setDLPPolicy('org-1', [
        { pattern: '\\d{3}-\\d{2}-\\d{4}', action: 'block', description: 'Block SSN' },
      ]);

      const result = service.checkDLPCompliance('My SSN is 123-45-6789', 'org-1');
      expect(result.compliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.action).toBe('block');
      expect(result.violations[0]!.description).toBe('Block SSN');
    });

    it('returns compliant when no policy exists', () => {
      const result = service.checkDLPCompliance('anything', 'org-no-policy');
      expect(result.compliant).toBe(true);
    });

    it('enforces a DLP policy', () => {
      const policy = service.setDLPPolicy('org-1', [
        { pattern: 'secret', action: 'block', description: 'Block secrets' },
      ]);

      // enforcing an already enabled policy should not throw
      expect(() => service.enforcePolicy('org-1', policy.id)).not.toThrow();
    });

    it('throws when enforcing non-existent policy', () => {
      expect(() => service.enforcePolicy('org-1', 'bad-id')).toThrow('DLP policy not found');
    });
  });
});
