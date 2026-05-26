import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import {
  HRService,
  RequestLeaveSchema,
  CreateReviewSchema,
  SubmitReviewSchema,
  CreateJobPostingSchema,
  TrackCandidateSchema,
  ScheduleInterviewSchema,
  OnboardEmployeeSchema,
} from '../services/hr.service';

export default async function hrRoutes(fastify: FastifyInstance) {
  const service = new HRService();

  fastify.get<{ Params: { orgId: string } }>('/org/:orgId/chart', async (request, reply) => {
    const orgId = request.params.orgId;
    const chart = service.getOrgChart(orgId);
    return reply.send({ success: true, data: chart });
  });

  fastify.post('/leave', async (request, reply) => {
    const parseResult = RequestLeaveSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid leave request data', 400, 'VALIDATION_ERROR');
    }
    const leave = service.requestLeave(
      parseResult.data.userId,
      parseResult.data.type,
      parseResult.data.startDate,
      parseResult.data.endDate,
    );
    return reply.status(201).send({ success: true, data: leave });
  });

  fastify.post<{ Params: { id: string } }>('/leave/:id/approve', async (request, reply) => {
    const body = request.body as { approverId: string };
    const leave = service.approveLeave(request.params.id, body.approverId);
    return reply.send({ success: true, data: leave });
  });

  fastify.post<{ Params: { id: string } }>('/leave/:id/reject', async (request, reply) => {
    const body = request.body as { approverId: string; reason: string };
    const leave = service.rejectLeave(request.params.id, body.approverId, body.reason);
    return reply.send({ success: true, data: leave });
  });

  fastify.post('/reviews', async (request, reply) => {
    const parseResult = CreateReviewSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid review data', 400, 'VALIDATION_ERROR');
    }
    const review = service.createReview(
      parseResult.data.employeeId,
      parseResult.data.reviewerId,
      parseResult.data.cycle,
    );
    return reply.status(201).send({ success: true, data: review });
  });

  fastify.post<{ Params: { id: string } }>('/reviews/:id/submit', async (request, reply) => {
    const body = request.body as { ratings: Record<string, number>; feedback: string };
    const parseResult = SubmitReviewSchema.safeParse({ reviewId: request.params.id, ...body });
    if (!parseResult.success) {
      throw createAppError('Invalid review submission', 400, 'VALIDATION_ERROR');
    }
    const review = service.submitReview(
      parseResult.data.reviewId,
      parseResult.data.ratings,
      parseResult.data.feedback,
    );
    return reply.send({ success: true, data: review });
  });

  fastify.post('/job-postings', async (request, reply) => {
    const parseResult = CreateJobPostingSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid job posting data', 400, 'VALIDATION_ERROR');
    }
    const posting = service.createJobPosting(
      parseResult.data.title,
      parseResult.data.department,
      parseResult.data.requirements,
    );
    return reply.status(201).send({ success: true, data: posting });
  });

  fastify.post('/candidates', async (request, reply) => {
    const parseResult = TrackCandidateSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid candidate data', 400, 'VALIDATION_ERROR');
    }
    const candidate = service.trackCandidate(
      parseResult.data.postingId,
      parseResult.data.name,
      parseResult.data.email,
      parseResult.data.stage,
    );
    return reply.status(201).send({ success: true, data: candidate });
  });

  fastify.post('/interviews', async (request, reply) => {
    const parseResult = ScheduleInterviewSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid interview data', 400, 'VALIDATION_ERROR');
    }
    const interview = service.scheduleInterview(
      parseResult.data.candidateId,
      parseResult.data.interviewers,
      parseResult.data.dateTime,
    );
    return reply.status(201).send({ success: true, data: interview });
  });

  fastify.post('/onboard', async (request, reply) => {
    const parseResult = OnboardEmployeeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid onboarding data', 400, 'VALIDATION_ERROR');
    }
    const employee = service.onboardEmployee(
      parseResult.data.name,
      parseResult.data.email,
      parseResult.data.department,
      parseResult.data.role,
      parseResult.data.managerId,
    );
    return reply.status(201).send({ success: true, data: employee });
  });
}
