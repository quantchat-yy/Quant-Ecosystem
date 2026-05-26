import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import {
  TeamAnalyticsService,
  GenerateReportSchema,
  CustomReportSchema,
} from '../services/team-analytics.service';
import type { ReportConfig } from '../services/team-analytics.service';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  const service = new TeamAnalyticsService();

  fastify.get<{ Params: { teamId: string } }>('/:teamId/productivity', async (request, reply) => {
    const query = request.query as { period?: string };
    const period = query.period ?? 'weekly';
    const metrics = service.getProductivity(request.params.teamId, period);
    return reply.send({ success: true, data: metrics });
  });

  fastify.get<{ Params: { teamId: string } }>('/:teamId/resources', async (request, reply) => {
    const allocation = service.getResourceAllocation(request.params.teamId);
    return reply.send({ success: true, data: allocation });
  });

  fastify.post<{ Params: { teamId: string } }>('/:teamId/reports', async (request, reply) => {
    const body = request.body as { type: string; period: string };
    const parseResult = GenerateReportSchema.safeParse({ teamId: request.params.teamId, ...body });
    if (!parseResult.success) {
      throw createAppError('Invalid report parameters', 400, 'VALIDATION_ERROR');
    }
    const report = service.generateReport(
      parseResult.data.teamId,
      parseResult.data.type,
      parseResult.data.period,
    );
    return reply.status(201).send({ success: true, data: report });
  });

  fastify.get<{ Params: { teamId: string } }>('/:teamId/velocity', async (request, reply) => {
    const query = request.query as { sprintCount?: string };
    const sprintCount = Number(query.sprintCount ?? '5');
    const velocity = service.getTeamVelocity(request.params.teamId, sprintCount);
    return reply.send({ success: true, data: velocity });
  });

  fastify.get<{ Params: { sprintId: string } }>(
    '/sprints/:sprintId/burndown',
    async (request, reply) => {
      const burndown = service.getBurndownChart(request.params.sprintId);
      return reply.send({ success: true, data: burndown });
    },
  );

  fastify.post<{ Params: { teamId: string } }>('/:teamId/custom-report', async (request, reply) => {
    const body = request.body as { config: ReportConfig };
    const parseResult = CustomReportSchema.safeParse({ teamId: request.params.teamId, ...body });
    if (!parseResult.success) {
      throw createAppError('Invalid custom report config', 400, 'VALIDATION_ERROR');
    }
    const report = service.getCustomReport(parseResult.data.teamId, parseResult.data.config);
    return reply.status(201).send({ success: true, data: report });
  });
}
