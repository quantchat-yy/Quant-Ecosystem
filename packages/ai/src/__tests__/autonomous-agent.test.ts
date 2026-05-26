import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousAgent } from '../advanced/autonomous-agent';
import type { AgentTool } from '../advanced/types';

describe('AutonomousAgent', () => {
  let agent: AutonomousAgent;

  beforeEach(() => {
    agent = new AutonomousAgent({ agentId: 'test-agent' });
  });

  describe('planTask', () => {
    it('creates a plan for a given goal', async () => {
      const plan = await agent.planTask('Write a report');

      expect(plan.id).toBeDefined();
      expect(plan.goal).toBe('Write a report');
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.status).toBe('executing');
      expect(plan.createdAt).toBeGreaterThan(0);
    });

    it('accepts context for planning', async () => {
      const plan = await agent.planTask('Analyze data', { source: 'database' });

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.goal).toBe('Analyze data');
    });

    it('creates unique plan IDs', async () => {
      const plan1 = await agent.planTask('Task 1');
      const plan2 = await agent.planTask('Task 2');

      expect(plan1.id).not.toBe(plan2.id);
    });
  });

  describe('executePlan', () => {
    it('executes all steps in a plan', async () => {
      const plan = await agent.planTask('Simple task');
      const result = await agent.executePlan(plan.id);

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(result.steps.every((s) => s.status === 'completed')).toBe(true);
    });

    it('throws for non-existent plan', async () => {
      await expect(agent.executePlan('non_existent')).rejects.toThrow(
        "Plan 'non_existent' not found",
      );
    });
  });

  describe('executeStep', () => {
    it('executes a single step', async () => {
      const plan = await agent.planTask('Multi-step task');
      const step = await agent.executeStep(plan.id, 0);

      expect(step.status).toBe('completed');
      expect(step.result).toBeDefined();
    });

    it('throws for invalid step index', async () => {
      const plan = await agent.planTask('Task');

      await expect(agent.executeStep(plan.id, 99)).rejects.toThrow('Step 99 not found');
    });
  });

  describe('useTools', () => {
    it('executes a registered tool', async () => {
      const tool: AgentTool = {
        name: 'calculator',
        description: 'Performs math calculations',
        parameters: { expression: { type: 'string', description: 'Math expression' } },
        execute: async (args) => ({ result: `Computed: ${args['expression'] as string}` }),
      };

      agent.registerTool(tool);
      const plan = await agent.planTask('Calculate something');
      const result = await agent.useTools(plan.id, 0, 'calculator', { expression: '2+2' });

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 'Computed: 2+2' });
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('returns error for unregistered tool', async () => {
      const plan = await agent.planTask('Task');
      const result = await agent.useTools(plan.id, 0, 'nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('handles tool execution errors', async () => {
      const failingTool: AgentTool = {
        name: 'failing',
        description: 'Always fails',
        parameters: {},
        execute: async () => {
          throw new Error('Tool crashed');
        },
      };

      agent.registerTool(failingTool);
      const plan = await agent.planTask('Task');
      const result = await agent.useTools(plan.id, 0, 'failing', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool crashed');
    });
  });

  describe('browseWeb', () => {
    it('returns web page content', async () => {
      const result = await agent.browseWeb('https://example.com');

      expect(result.url).toBe('https://example.com');
      expect(result.title).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.statusCode).toBe(200);
    });
  });

  describe('executeCode', () => {
    it('executes code and returns result', async () => {
      const result = await agent.executeCode('console.log("hello")', 'javascript');

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.exitCode).toBe(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });
  });

  describe('reflectOnResult', () => {
    it('assesses completed plan positively', async () => {
      const plan = await agent.planTask('Task');
      await agent.executePlan(plan.id);
      const reflection = await agent.reflectOnResult(plan.id);

      expect(reflection.planId).toBe(plan.id);
      expect(reflection.assessment).toContain('successfully');
      expect(reflection.confidence).toBeGreaterThan(0.5);
      expect(reflection.shouldContinue).toBe(false);
    });

    it('suggests improvements for incomplete plans', async () => {
      const plan = await agent.planTask('Task');
      // Don't execute - steps remain pending
      const reflection = await agent.reflectOnResult(plan.id);

      expect(reflection.confidence).toBe(0);
      expect(reflection.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('adjustPlan', () => {
    it('adds adjustment step to plan', async () => {
      const plan = await agent.planTask('Original task');
      const originalStepCount = plan.steps.length;

      const adjusted = await agent.adjustPlan(plan.id, 'Try a different approach');

      expect(adjusted.steps.length).toBe(originalStepCount + 1);
      expect(adjusted.status).toBe('executing');
    });
  });

  describe('reportProgress', () => {
    it('reports progress on a plan', async () => {
      const plan = await agent.planTask('Task');
      const progress = await agent.reportProgress(plan.id);

      expect(progress.planId).toBe(plan.id);
      expect(progress.totalSteps).toBe(plan.steps.length);
      expect(progress.completedSteps).toBe(0);
      expect(progress.estimatedRemainingMs).toBeGreaterThan(0);
    });
  });

  describe('getCapabilities', () => {
    it('returns list of agent capabilities', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities.find((c) => c.name === 'planning')).toBeDefined();
      expect(capabilities.find((c) => c.name === 'tool_use')).toBeDefined();
      expect(capabilities.find((c) => c.name === 'web_browsing')).toBeDefined();
      expect(capabilities.find((c) => c.name === 'code_execution')).toBeDefined();
    });
  });

  describe('registerTool', () => {
    it('registers a tool successfully', async () => {
      const tool: AgentTool = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {},
        execute: async () => 'result',
      };

      agent.registerTool(tool);
      const plan = await agent.planTask('Use tool');
      const result = await agent.useTools(plan.id, 0, 'test_tool', {});

      expect(result.success).toBe(true);
    });
  });
});
