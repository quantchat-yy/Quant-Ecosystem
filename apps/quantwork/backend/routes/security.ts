import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import {
  EnterpriseSecurityService,
  ConfigureSAMLSchema,
  ConfigureSCIMSchema,
  ProvisionUserSchema,
  LogAuditEventSchema,
  SetDLPPolicySchema,
} from '../services/enterprise-security.service';

export default async function securityRoutes(fastify: FastifyInstance) {
  const service = new EnterpriseSecurityService();

  fastify.post('/saml', async (request, reply) => {
    const parseResult = ConfigureSAMLSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid SAML configuration', 400, 'VALIDATION_ERROR');
    }
    const config = service.configureSAML(
      parseResult.data.orgId,
      parseResult.data.idpUrl,
      parseResult.data.cert,
      parseResult.data.entityId,
    );
    return reply.status(201).send({ success: true, data: config });
  });

  fastify.post('/scim', async (request, reply) => {
    const parseResult = ConfigureSCIMSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid SCIM configuration', 400, 'VALIDATION_ERROR');
    }
    const config = service.configureSCIM(
      parseResult.data.orgId,
      parseResult.data.endpoint,
      parseResult.data.token,
    );
    return reply.status(201).send({ success: true, data: config });
  });

  fastify.post('/provision', async (request, reply) => {
    const parseResult = ProvisionUserSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid provisioning data', 400, 'VALIDATION_ERROR');
    }
    const user = service.provisionUser(
      parseResult.data.orgId,
      parseResult.data.email,
      parseResult.data.role,
      parseResult.data.groups,
    );
    return reply.status(201).send({ success: true, data: user });
  });

  fastify.delete<{ Params: { orgId: string; userId: string } }>(
    '/:orgId/users/:userId',
    async (request, reply) => {
      service.deprovisionUser(request.params.orgId, request.params.userId);
      return reply.send({ success: true, data: null });
    },
  );

  fastify.get<{ Params: { orgId: string } }>('/:orgId/audit', async (request, reply) => {
    const query = request.query as { userId?: string; action?: string };
    const entries = service.getAuditLog(request.params.orgId, query);
    return reply.send({ success: true, data: entries });
  });

  fastify.post('/audit', async (request, reply) => {
    const parseResult = LogAuditEventSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid audit event data', 400, 'VALIDATION_ERROR');
    }
    const entry = service.logAuditEvent(
      parseResult.data.orgId,
      parseResult.data.userId,
      parseResult.data.action,
      parseResult.data.resource,
      parseResult.data.details,
    );
    return reply.status(201).send({ success: true, data: entry });
  });

  fastify.post('/dlp', async (request, reply) => {
    const parseResult = SetDLPPolicySchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid DLP policy data', 400, 'VALIDATION_ERROR');
    }
    const policy = service.setDLPPolicy(parseResult.data.orgId, parseResult.data.rules);
    return reply.status(201).send({ success: true, data: policy });
  });

  fastify.post('/dlp/check', async (request, reply) => {
    const body = request.body as { content: string; orgId: string };
    if (!body.content || !body.orgId) {
      throw createAppError('Content and orgId are required', 400, 'VALIDATION_ERROR');
    }
    const result = service.checkDLPCompliance(body.content, body.orgId);
    return reply.send({ success: true, data: result });
  });

  fastify.post<{ Params: { orgId: string } }>(
    '/:orgId/dlp/:policyId/enforce',
    async (request, reply) => {
      const { orgId } = request.params;
      const { policyId } = request.params as unknown as { policyId: string };
      service.enforcePolicy(orgId, policyId);
      return reply.send({ success: true, data: null });
    },
  );
}
