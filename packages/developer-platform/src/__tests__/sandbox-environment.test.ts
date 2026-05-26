import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxEnvironment } from '../core/sandbox-environment';

describe('SandboxEnvironment', () => {
  let env: SandboxEnvironment;

  beforeEach(() => {
    env = new SandboxEnvironment({
      maxMemoryMB: 256,
      maxCpuMs: 5000,
      maxExecutionTimeMs: 30000,
      maxConcurrentExecutions: 5,
    });
  });

  describe('createSandbox', () => {
    it('should create a sandbox with default settings', () => {
      const result = env.createSandbox({ name: 'test-sandbox' });

      expect(result.success).toBe(true);
      expect(result.sandboxId).toBeTruthy();
      expect(result.message).toContain('test-sandbox');
    });

    it('should create a sandbox with custom runtime', () => {
      const result = env.createSandbox({
        name: 'deno-sandbox',
        runtime: 'deno',
        timeout: 10000,
        memoryLimitMB: 128,
      });

      expect(result.success).toBe(true);
      expect(result.sandboxId).toBeTruthy();
    });

    it('should create a sandbox with network enabled', () => {
      const result = env.createSandbox({
        name: 'network-sandbox',
        networkEnabled: true,
        storageEnabled: true,
        maxStorageMB: 100,
      });

      expect(result.success).toBe(true);
    });

    it('should fail with empty name', () => {
      const result = env.createSandbox({ name: '' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation error');
    });

    it('should fail with excessive memory limit', () => {
      const result = env.createSandbox({
        name: 'big-sandbox',
        memoryLimitMB: 99999,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation error');
    });
  });

  describe('executeSandbox', () => {
    it('should execute code in a sandbox', () => {
      const sandbox = env.createSandbox({ name: 'exec-sandbox' });
      const result = env.executeSandbox({
        sandboxId: sandbox.sandboxId,
        code: 'console.log("hello")',
      });

      expect(result.status).toBe('completed');
      expect(result.exitCode).toBe(0);
      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.resourceUsage.cpuMs).toBeGreaterThan(0);
    });

    it('should fail for non-existent sandbox', () => {
      const result = env.executeSandbox({
        sandboxId: 'non-existent',
        code: 'console.log("hello")',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Sandbox not found');
    });

    it('should fail for destroyed sandbox', () => {
      const sandbox = env.createSandbox({ name: 'destroyed-sandbox' });
      env.destroySandbox(sandbox.sandboxId);

      const result = env.executeSandbox({
        sandboxId: sandbox.sandboxId,
        code: 'console.log("hello")',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Sandbox has been destroyed');
    });

    it('should fail with empty code', () => {
      const sandbox = env.createSandbox({ name: 'empty-code-sandbox' });
      const result = env.executeSandbox({
        sandboxId: sandbox.sandboxId,
        code: '',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Validation error');
    });

    it('should track execution count', () => {
      const sandbox = env.createSandbox({ name: 'count-sandbox' });

      env.executeSandbox({ sandboxId: sandbox.sandboxId, code: 'code1' });
      env.executeSandbox({ sandboxId: sandbox.sandboxId, code: 'code2' });
      env.executeSandbox({ sandboxId: sandbox.sandboxId, code: 'code3' });

      const metrics = env.getSandboxMetrics(sandbox.sandboxId);
      expect(metrics?.totalExecutions).toBe(3);
    });
  });

  describe('destroySandbox', () => {
    it('should destroy an existing sandbox', () => {
      const sandbox = env.createSandbox({ name: 'to-destroy' });
      const result = env.destroySandbox(sandbox.sandboxId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('to-destroy');
    });

    it('should fail for non-existent sandbox', () => {
      const result = env.destroySandbox('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sandbox not found');
    });

    it('should fail for already destroyed sandbox', () => {
      const sandbox = env.createSandbox({ name: 'double-destroy' });
      env.destroySandbox(sandbox.sandboxId);
      const result = env.destroySandbox(sandbox.sandboxId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sandbox already destroyed');
    });
  });

  describe('listSandboxes', () => {
    it('should list all sandboxes', () => {
      env.createSandbox({ name: 'sandbox-1' });
      env.createSandbox({ name: 'sandbox-2' });
      env.createSandbox({ name: 'sandbox-3' });

      const result = env.listSandboxes();

      expect(result.sandboxes).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by status', () => {
      const sb = env.createSandbox({ name: 'active-sandbox' });
      env.createSandbox({ name: 'destroyed-sandbox' });
      env.destroySandbox(
        env.listSandboxes().sandboxes.find((s) => s.name === 'destroyed-sandbox')?.id ?? '',
      );

      const result = env.listSandboxes({ status: 'ready' });

      expect(result.sandboxes).toHaveLength(1);
      expect(result.sandboxes[0]?.id).toBe(sb.sandboxId);
    });

    it('should filter by runtime', () => {
      env.createSandbox({ name: 'node-sb', runtime: 'node' });
      env.createSandbox({ name: 'deno-sb', runtime: 'deno' });

      const result = env.listSandboxes({ runtime: 'deno' });

      expect(result.sandboxes).toHaveLength(1);
      expect(result.sandboxes[0]?.name).toBe('deno-sb');
    });

    it('should return empty when no sandboxes exist', () => {
      const result = env.listSandboxes();

      expect(result.sandboxes).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getSandboxLogs', () => {
    it('should return logs for a sandbox', () => {
      const sandbox = env.createSandbox({ name: 'log-sandbox' });
      env.executeSandbox({ sandboxId: sandbox.sandboxId, code: 'test' });

      const logs = env.getSandboxLogs(sandbox.sandboxId);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.level).toBe('info');
    });

    it('should filter logs by level', () => {
      const sandbox = env.createSandbox({ name: 'filter-log-sandbox' });
      env.executeSandbox({ sandboxId: sandbox.sandboxId, code: 'test' });

      const logs = env.getSandboxLogs(sandbox.sandboxId, { level: 'error' });

      expect(logs).toHaveLength(0);
    });

    it('should return empty array for non-existent sandbox', () => {
      const logs = env.getSandboxLogs('non-existent');

      expect(logs).toHaveLength(0);
    });

    it('should limit log count', () => {
      const sandbox = env.createSandbox({ name: 'many-log-sandbox' });

      for (let i = 0; i < 5; i++) {
        env.executeSandbox({ sandboxId: sandbox.sandboxId, code: `code ${i}` });
      }

      const logs = env.getSandboxLogs(sandbox.sandboxId, { limit: 2 });

      expect(logs).toHaveLength(2);
    });
  });

  describe('getSandboxMetrics', () => {
    it('should return metrics for a sandbox', () => {
      const sandbox = env.createSandbox({ name: 'metrics-sandbox' });
      env.executeSandbox({ sandboxId: sandbox.sandboxId, code: 'test' });

      const metrics = env.getSandboxMetrics(sandbox.sandboxId);

      expect(metrics).not.toBeNull();
      expect(metrics?.sandboxId).toBe(sandbox.sandboxId);
      expect(metrics?.totalExecutions).toBe(1);
      expect(metrics?.completedExecutions).toBe(1);
      expect(metrics?.failedExecutions).toBe(0);
      expect(metrics?.totalCpuMs).toBeGreaterThan(0);
    });

    it('should return null for non-existent sandbox', () => {
      const metrics = env.getSandboxMetrics('non-existent');

      expect(metrics).toBeNull();
    });

    it('should track uptime for active sandbox', () => {
      const sandbox = env.createSandbox({ name: 'uptime-sandbox' });
      const metrics = env.getSandboxMetrics(sandbox.sandboxId);

      expect(metrics?.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics?.status).toBe('ready');
    });

    it('should show zero uptime for destroyed sandbox', () => {
      const sandbox = env.createSandbox({ name: 'dead-sandbox' });
      env.destroySandbox(sandbox.sandboxId);
      const metrics = env.getSandboxMetrics(sandbox.sandboxId);

      expect(metrics?.uptime).toBe(0);
      expect(metrics?.status).toBe('destroyed');
    });
  });
});
