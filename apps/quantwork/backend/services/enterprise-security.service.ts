import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface SAMLConfig {
  id: string;
  orgId: string;
  idpUrl: string;
  cert: string;
  entityId: string;
  enabled: boolean;
  createdAt: Date;
}

export interface SCIMConfig {
  id: string;
  orgId: string;
  endpoint: string;
  token: string;
  enabled: boolean;
  createdAt: Date;
}

export interface ProvisionedUser {
  id: string;
  orgId: string;
  email: string;
  role: string;
  groups: string[];
  status: 'active' | 'deprovisioned';
  provisionedAt: Date;
}

export interface AuditEntry {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface DLPPolicy {
  id: string;
  orgId: string;
  rules: DLPRule[];
  enabled: boolean;
  createdAt: Date;
}

export interface DLPRule {
  id: string;
  pattern: string;
  action: 'block' | 'warn' | 'log';
  description: string;
}

export interface DLPResult {
  compliant: boolean;
  violations: Array<{
    ruleId: string;
    action: string;
    description: string;
  }>;
}

export const ConfigureSAMLSchema = z.object({
  orgId: z.string().min(1),
  idpUrl: z.string().url(),
  cert: z.string().min(1),
  entityId: z.string().min(1),
});

export type ConfigureSAMLInput = z.infer<typeof ConfigureSAMLSchema>;

export const ConfigureSCIMSchema = z.object({
  orgId: z.string().min(1),
  endpoint: z.string().url(),
  token: z.string().min(1),
});

export type ConfigureSCIMInput = z.infer<typeof ConfigureSCIMSchema>;

export const ProvisionUserSchema = z.object({
  orgId: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  groups: z.array(z.string().min(1)),
});

export type ProvisionUserInput = z.infer<typeof ProvisionUserSchema>;

export const LogAuditEventSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
  action: z.string().min(1),
  resource: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional().default({}),
});

export type LogAuditEventInput = z.infer<typeof LogAuditEventSchema>;

export const SetDLPPolicySchema = z.object({
  orgId: z.string().min(1),
  rules: z.array(
    z.object({
      pattern: z.string().min(1),
      action: z.enum(['block', 'warn', 'log']),
      description: z.string().min(1),
    }),
  ),
});

export type SetDLPPolicyInput = z.infer<typeof SetDLPPolicySchema>;

export class EnterpriseSecurityService {
  private readonly samlConfigs = new Map<string, SAMLConfig>();
  private readonly scimConfigs = new Map<string, SCIMConfig>();
  private readonly provisionedUsers = new Map<string, ProvisionedUser>();
  private readonly auditLog: AuditEntry[] = [];
  private readonly dlpPolicies = new Map<string, DLPPolicy>();

  configureSAML(orgId: string, idpUrl: string, cert: string, entityId: string): SAMLConfig {
    const parsed = ConfigureSAMLSchema.parse({ orgId, idpUrl, cert, entityId });

    const config: SAMLConfig = {
      id: randomUUID(),
      orgId: parsed.orgId,
      idpUrl: parsed.idpUrl,
      cert: parsed.cert,
      entityId: parsed.entityId,
      enabled: true,
      createdAt: new Date(),
    };

    this.samlConfigs.set(parsed.orgId, config);
    return config;
  }

  configureSCIM(orgId: string, endpoint: string, token: string): SCIMConfig {
    const parsed = ConfigureSCIMSchema.parse({ orgId, endpoint, token });

    const config: SCIMConfig = {
      id: randomUUID(),
      orgId: parsed.orgId,
      endpoint: parsed.endpoint,
      token: parsed.token,
      enabled: true,
      createdAt: new Date(),
    };

    this.scimConfigs.set(parsed.orgId, config);
    return config;
  }

  provisionUser(orgId: string, email: string, role: string, groups: string[]): ProvisionedUser {
    const parsed = ProvisionUserSchema.parse({ orgId, email, role, groups });

    const user: ProvisionedUser = {
      id: randomUUID(),
      orgId: parsed.orgId,
      email: parsed.email,
      role: parsed.role,
      groups: parsed.groups,
      status: 'active',
      provisionedAt: new Date(),
    };

    this.provisionedUsers.set(user.id, user);
    return user;
  }

  deprovisionUser(orgId: string, userId: string): void {
    const user = this.provisionedUsers.get(userId);
    if (!user) {
      throw createAppError('Provisioned user not found', 404, 'USER_NOT_FOUND');
    }
    if (user.orgId !== orgId) {
      throw createAppError('User does not belong to organization', 403, 'FORBIDDEN');
    }
    user.status = 'deprovisioned';
  }

  getAuditLog(orgId: string, filters?: { userId?: string; action?: string }): AuditEntry[] {
    let entries = this.auditLog.filter((e) => e.orgId === orgId);

    if (filters?.userId) {
      entries = entries.filter((e) => e.userId === filters.userId);
    }
    if (filters?.action) {
      entries = entries.filter((e) => e.action === filters.action);
    }

    return entries;
  }

  logAuditEvent(
    orgId: string,
    userId: string,
    action: string,
    resource: string,
    details?: Record<string, unknown>,
  ): AuditEntry {
    const parsed = LogAuditEventSchema.parse({ orgId, userId, action, resource, details });

    const entry: AuditEntry = {
      id: randomUUID(),
      orgId: parsed.orgId,
      userId: parsed.userId,
      action: parsed.action,
      resource: parsed.resource,
      details: parsed.details,
      timestamp: new Date(),
    };

    this.auditLog.push(entry);
    return entry;
  }

  setDLPPolicy(
    orgId: string,
    rules: Array<{ pattern: string; action: 'block' | 'warn' | 'log'; description: string }>,
  ): DLPPolicy {
    const parsed = SetDLPPolicySchema.parse({ orgId, rules });

    const policy: DLPPolicy = {
      id: randomUUID(),
      orgId: parsed.orgId,
      rules: parsed.rules.map((r) => ({
        id: randomUUID(),
        pattern: r.pattern,
        action: r.action,
        description: r.description,
      })),
      enabled: true,
      createdAt: new Date(),
    };

    this.dlpPolicies.set(parsed.orgId, policy);
    return policy;
  }

  checkDLPCompliance(content: string, orgId: string): DLPResult {
    const policy = this.dlpPolicies.get(orgId);
    if (!policy || !policy.enabled) {
      return { compliant: true, violations: [] };
    }

    const violations: DLPResult['violations'] = [];

    for (const rule of policy.rules) {
      const regex = new RegExp(rule.pattern, 'gi');
      if (regex.test(content)) {
        violations.push({
          ruleId: rule.id,
          action: rule.action,
          description: rule.description,
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  enforcePolicy(orgId: string, policyId: string): void {
    const policy = this.dlpPolicies.get(orgId);
    if (!policy || policy.id !== policyId) {
      throw createAppError('DLP policy not found', 404, 'POLICY_NOT_FOUND');
    }
    policy.enabled = true;
  }
}
