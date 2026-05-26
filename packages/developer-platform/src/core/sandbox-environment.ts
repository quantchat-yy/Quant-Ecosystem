// ============================================================================
// Quant Developer Platform - Sandbox Environment
// ============================================================================

import { z } from 'zod';
import type {
  SandboxConfig,
  Sandbox,
  SandboxExecution,
  SandboxLog,
  SandboxMetrics,
  SandboxResourceLimits,
} from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

const sandboxConfigSchema = z.object({
  name: z.string().min(1).max(128),
  runtime: z.enum(['node', 'deno', 'worker']).default('node'),
  timeout: z.number().min(100).max(300000).default(30000),
  memoryLimitMB: z.number().min(16).max(2048).default(256),
  cpuLimitMs: z.number().min(100).max(60000).default(5000),
  networkEnabled: z.boolean().default(false),
  storageEnabled: z.boolean().default(false),
  maxStorageMB: z.number().min(0).max(512).default(64),
  environment: z.record(z.string(), z.string()).optional(),
});

const executeOptionsSchema = z.object({
  sandboxId: z.string().min(1),
  code: z.string().min(1).max(1000000),
  entryPoint: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================================
// SandboxEnvironment Class
// ============================================================================

export class SandboxEnvironment {
  private sandboxes: Map<string, Sandbox> = new Map();
  private executions: Map<string, SandboxExecution[]> = new Map();
  private logs: Map<string, SandboxLog[]> = new Map();
  private defaultLimits: SandboxResourceLimits;

  constructor(defaultLimits?: Partial<SandboxResourceLimits>) {
    this.defaultLimits = {
      maxMemoryMB: defaultLimits?.maxMemoryMB ?? 256,
      maxCpuMs: defaultLimits?.maxCpuMs ?? 5000,
      maxExecutionTimeMs: defaultLimits?.maxExecutionTimeMs ?? 30000,
      maxNetworkRequests: defaultLimits?.maxNetworkRequests ?? 100,
      maxStorageMB: defaultLimits?.maxStorageMB ?? 64,
      maxConcurrentExecutions: defaultLimits?.maxConcurrentExecutions ?? 5,
    };
  }

  /**
   * Create a new sandbox environment
   */
  public createSandbox(config: SandboxConfig): {
    success: boolean;
    sandboxId: string;
    message: string;
  } {
    const parsed = sandboxConfigSchema.safeParse(config);
    if (!parsed.success) {
      return {
        success: false,
        sandboxId: '',
        message: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    const sandboxId = generateId();
    const now = Date.now();

    const sandbox: Sandbox = {
      id: sandboxId,
      name: parsed.data.name,
      runtime: parsed.data.runtime,
      status: 'ready',
      createdAt: now,
      updatedAt: now,
      resourceLimits: {
        maxMemoryMB: parsed.data.memoryLimitMB,
        maxCpuMs: parsed.data.cpuLimitMs,
        maxExecutionTimeMs: parsed.data.timeout,
        maxNetworkRequests: parsed.data.networkEnabled ? 100 : 0,
        maxStorageMB: parsed.data.storageEnabled ? parsed.data.maxStorageMB : 0,
        maxConcurrentExecutions: this.defaultLimits.maxConcurrentExecutions,
      },
      environment: parsed.data.environment ?? {},
      executionCount: 0,
      totalCpuMs: 0,
      totalMemoryPeakMB: 0,
    };

    this.sandboxes.set(sandboxId, sandbox);
    this.executions.set(sandboxId, []);
    this.logs.set(sandboxId, []);

    this.addLog(
      sandboxId,
      'info',
      `Sandbox "${parsed.data.name}" created with ${parsed.data.runtime} runtime`,
    );

    return {
      success: true,
      sandboxId,
      message: `Sandbox "${parsed.data.name}" created successfully`,
    };
  }

  /**
   * Execute code within a sandbox
   */
  public executeSandbox(params: {
    sandboxId: string;
    code: string;
    entryPoint?: string;
    args?: string[];
    env?: Record<string, string>;
  }): SandboxExecution {
    const parsed = executeOptionsSchema.safeParse(params);
    if (!parsed.success) {
      return {
        id: '',
        sandboxId: params.sandboxId,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        output: '',
        error: `Validation error: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        resourceUsage: { cpuMs: 0, memoryPeakMB: 0, networkRequests: 0 },
        exitCode: 1,
      };
    }

    const sandbox = this.sandboxes.get(params.sandboxId);
    if (!sandbox) {
      return {
        id: '',
        sandboxId: params.sandboxId,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        output: '',
        error: 'Sandbox not found',
        resourceUsage: { cpuMs: 0, memoryPeakMB: 0, networkRequests: 0 },
        exitCode: 1,
      };
    }

    if (sandbox.status === 'destroyed') {
      return {
        id: '',
        sandboxId: params.sandboxId,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        output: '',
        error: 'Sandbox has been destroyed',
        resourceUsage: { cpuMs: 0, memoryPeakMB: 0, networkRequests: 0 },
        exitCode: 1,
      };
    }

    // Check concurrent execution limits
    const activeExecutions = this.getActiveExecutions(params.sandboxId);
    if (activeExecutions >= sandbox.resourceLimits.maxConcurrentExecutions) {
      return {
        id: '',
        sandboxId: params.sandboxId,
        status: 'failed',
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        output: '',
        error: 'Concurrent execution limit reached',
        resourceUsage: { cpuMs: 0, memoryPeakMB: 0, networkRequests: 0 },
        exitCode: 1,
      };
    }

    const executionId = generateId();
    const startedAt = Date.now();

    // Simulate execution
    const cpuMs = Math.min(Math.floor(Math.random() * 500) + 10, sandbox.resourceLimits.maxCpuMs);
    const memoryPeakMB = Math.min(
      Math.floor(Math.random() * 64) + 8,
      sandbox.resourceLimits.maxMemoryMB,
    );
    const durationMs = Math.min(
      Math.floor(Math.random() * 1000) + 50,
      sandbox.resourceLimits.maxExecutionTimeMs,
    );

    const execution: SandboxExecution = {
      id: executionId,
      sandboxId: params.sandboxId,
      status: 'completed',
      startedAt,
      completedAt: startedAt + durationMs,
      durationMs,
      output: `Execution completed successfully`,
      error: null,
      resourceUsage: { cpuMs, memoryPeakMB, networkRequests: 0 },
      exitCode: 0,
    };

    // Update sandbox stats
    sandbox.executionCount += 1;
    sandbox.totalCpuMs += cpuMs;
    sandbox.totalMemoryPeakMB = Math.max(sandbox.totalMemoryPeakMB, memoryPeakMB);
    sandbox.updatedAt = Date.now();
    sandbox.status = 'ready';
    this.sandboxes.set(params.sandboxId, sandbox);

    // Store execution
    const sandboxExecutions = this.executions.get(params.sandboxId) ?? [];
    sandboxExecutions.push(execution);
    this.executions.set(params.sandboxId, sandboxExecutions);

    this.addLog(params.sandboxId, 'info', `Execution ${executionId} completed in ${durationMs}ms`);

    return execution;
  }

  /**
   * Destroy a sandbox and release all resources
   */
  public destroySandbox(sandboxId: string): {
    success: boolean;
    message: string;
  } {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return { success: false, message: 'Sandbox not found' };
    }

    if (sandbox.status === 'destroyed') {
      return { success: false, message: 'Sandbox already destroyed' };
    }

    sandbox.status = 'destroyed';
    sandbox.updatedAt = Date.now();
    this.sandboxes.set(sandboxId, sandbox);

    this.addLog(sandboxId, 'info', `Sandbox "${sandbox.name}" destroyed`);

    return {
      success: true,
      message: `Sandbox "${sandbox.name}" destroyed successfully`,
    };
  }

  /**
   * List all sandboxes with optional filtering
   */
  public listSandboxes(filters?: {
    status?: string;
    runtime?: string;
    limit?: number;
    offset?: number;
  }): { sandboxes: Sandbox[]; total: number } {
    let results = Array.from(this.sandboxes.values());

    if (filters?.status) {
      results = results.filter((s) => s.status === filters.status);
    }
    if (filters?.runtime) {
      results = results.filter((s) => s.runtime === filters.runtime);
    }

    const total = results.length;
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 20;

    results = results.sort((a, b) => b.createdAt - a.createdAt).slice(offset, offset + limit);

    return { sandboxes: results, total };
  }

  /**
   * Get logs for a specific sandbox
   */
  public getSandboxLogs(
    sandboxId: string,
    options?: {
      level?: string;
      limit?: number;
      since?: number;
    },
  ): SandboxLog[] {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return [];

    let sandboxLogs = this.logs.get(sandboxId) ?? [];

    if (options?.level) {
      sandboxLogs = sandboxLogs.filter((log) => log.level === options.level);
    }
    if (options?.since) {
      sandboxLogs = sandboxLogs.filter((log) => log.timestamp >= (options.since ?? 0));
    }

    const limit = options?.limit ?? 100;
    return sandboxLogs.slice(-limit);
  }

  /**
   * Get metrics for a specific sandbox
   */
  public getSandboxMetrics(sandboxId: string): SandboxMetrics | null {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return null;

    const sandboxExecutions = this.executions.get(sandboxId) ?? [];
    const completedExecutions = sandboxExecutions.filter((e) => e.status === 'completed');
    const failedExecutions = sandboxExecutions.filter((e) => e.status === 'failed');

    const avgDuration =
      completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + e.durationMs, 0) / completedExecutions.length
        : 0;

    return {
      sandboxId,
      totalExecutions: sandbox.executionCount,
      completedExecutions: completedExecutions.length,
      failedExecutions: failedExecutions.length,
      avgDurationMs: Math.round(avgDuration),
      totalCpuMs: sandbox.totalCpuMs,
      peakMemoryMB: sandbox.totalMemoryPeakMB,
      uptime: sandbox.status !== 'destroyed' ? Date.now() - sandbox.createdAt : 0,
      status: sandbox.status,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getActiveExecutions(sandboxId: string): number {
    const sandboxExecutions = this.executions.get(sandboxId) ?? [];
    return sandboxExecutions.filter((e) => e.status === 'running').length;
  }

  private addLog(
    sandboxId: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
  ): void {
    const sandboxLogs = this.logs.get(sandboxId) ?? [];
    sandboxLogs.push({
      id: generateId(),
      sandboxId,
      level,
      message,
      timestamp: Date.now(),
    });
    this.logs.set(sandboxId, sandboxLogs);
  }
}
