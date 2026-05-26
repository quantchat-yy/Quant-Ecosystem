import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  ProjectManagementService,
  CreateProjectSchema,
  CreateSprintSchema,
  AddTaskSchema,
  TrackTimeSchema,
} from '../services/project.service';

const idParamSchema = z.object({ id: z.string().min(1) });
const taskIdParamSchema = z.object({ taskId: z.string().min(1) });

export default async function projectsRoutes(fastify: FastifyInstance) {
  const service = new ProjectManagementService();

  fastify.post('/', async (request, reply) => {
    const parseResult = CreateProjectSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid project data', 400, 'VALIDATION_ERROR');
    }
    const project = service.createProject(
      parseResult.data.name,
      parseResult.data.ownerId,
      parseResult.data.description,
    );
    return reply.status(201).send({ success: true, data: project });
  });

  fastify.get('/', async (request, reply) => {
    const query = request.query as { ownerId?: string };
    const projects = service.listProjects(query.ownerId);
    return reply.send({ success: true, data: projects });
  });

  fastify.post<{ Params: { id: string } }>('/:id/sprints', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }
    const body = request.body as { name: string; startDate: string; endDate: string };
    const parseResult = CreateSprintSchema.safeParse({ projectId: paramResult.data.id, ...body });
    if (!parseResult.success) {
      throw createAppError('Invalid sprint data', 400, 'VALIDATION_ERROR');
    }
    const sprint = service.createSprint(
      parseResult.data.projectId,
      parseResult.data.name,
      parseResult.data.startDate,
      parseResult.data.endDate,
    );
    return reply.status(201).send({ success: true, data: sprint });
  });

  fastify.post<{ Params: { id: string } }>('/:id/tasks', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }
    const body = request.body as {
      title: string;
      description?: string;
      assigneeId?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    };
    const parseResult = AddTaskSchema.safeParse({ projectId: paramResult.data.id, ...body });
    if (!parseResult.success) {
      throw createAppError('Invalid task data', 400, 'VALIDATION_ERROR');
    }
    const task = service.addTask(
      parseResult.data.projectId,
      parseResult.data.title,
      parseResult.data.description,
      parseResult.data.assigneeId,
      parseResult.data.priority,
    );
    return reply.status(201).send({ success: true, data: task });
  });

  fastify.patch<{ Params: { taskId: string } }>('/tasks/:taskId/assign', async (request, reply) => {
    const paramResult = taskIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid task ID', 400, 'VALIDATION_ERROR');
    }
    const body = request.body as { assigneeId: string };
    const task = service.assignTask(paramResult.data.taskId, body.assigneeId);
    return reply.send({ success: true, data: task });
  });

  fastify.patch<{ Params: { taskId: string } }>('/tasks/:taskId/status', async (request, reply) => {
    const paramResult = taskIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid task ID', 400, 'VALIDATION_ERROR');
    }
    const body = request.body as { status: 'todo' | 'in_progress' | 'review' | 'done' };
    const task = service.updateTaskStatus(paramResult.data.taskId, body.status);
    return reply.send({ success: true, data: task });
  });

  fastify.get<{ Params: { id: string } }>('/:id/kanban', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }
    const board = service.getKanbanBoard(paramResult.data.id);
    return reply.send({ success: true, data: board });
  });

  fastify.post<{ Params: { taskId: string } }>('/tasks/:taskId/time', async (request, reply) => {
    const paramResult = taskIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid task ID', 400, 'VALIDATION_ERROR');
    }
    const body = request.body as { userId: string; minutes: number };
    const parseResult = TrackTimeSchema.safeParse({ taskId: paramResult.data.taskId, ...body });
    if (!parseResult.success) {
      throw createAppError('Invalid time entry data', 400, 'VALIDATION_ERROR');
    }
    const entry = service.trackTime(
      parseResult.data.taskId,
      parseResult.data.userId,
      parseResult.data.minutes,
    );
    return reply.status(201).send({ success: true, data: entry });
  });

  fastify.get<{ Params: { id: string } }>('/:id/metrics', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }
    const metrics = service.getProjectMetrics(paramResult.data.id);
    return reply.send({ success: true, data: metrics });
  });

  fastify.get<{ Params: { id: string } }>('/:id/gantt', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }
    const gantt = service.getGanttChart(paramResult.data.id);
    return reply.send({ success: true, data: gantt });
  });
}
