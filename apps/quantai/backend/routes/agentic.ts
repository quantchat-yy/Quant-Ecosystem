import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { orchestrator, WorkflowEngine } from '@quant/agentic';

const workflowSchema = z.object({
  name: z.string(),
  goal: z.string(),
});

const runAgentSchema = z.object({
  agentId: z.string(),
  input: z.string(),
  context: z.record(z.unknown()).optional(),
});

export default async function agenticRoutes(fastify: FastifyInstance) {
  const workflowEngine = new WorkflowEngine(orchestrator);

  // Run a specific agent
  fastify.post('/agents/run', async (request, reply) => {
    const parseResult = runAgentSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { agentId, input, context } = parseResult.data;

    try {
      const result = await orchestrator.runAgent(agentId, input, {
        ...context,
        userId,
      });

      return reply.send({ success: true, result });
    } catch (error: any) {
      throw createAppError(error.message, 500, 'AGENT_ERROR');
    }
  });

  // Create and execute a workflow
  fastify.post('/workflows', async (request, reply) => {
    const parseResult = workflowSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { name, goal } = parseResult.data;

    try {
      const workflow = await workflowEngine.createWorkflow(userId, name, goal);
      const results = await workflowEngine.executeWorkflow(workflow.id);

      return reply.send({
        success: true,
        workflow,
        results,
      });
    } catch (error: any) {
      throw createAppError(error.message, 500, 'WORKFLOW_ERROR');
    }
  });

  // Get user's workflows
  fastify.get('/workflows', async (request, reply) => {
    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const workflows = workflowEngine.getUserWorkflows(userId);
    return reply.send(workflows);
  });
}
