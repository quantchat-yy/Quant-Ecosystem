import { describe, it, expect, vi } from 'vitest';
import { ToolBridge } from '../llm/tool-bridge.js';

function createMockRegistry(
  tools: Record<
    string,
    {
      requiredTier: number;
      handler: (
        args: Record<string, unknown>,
      ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    }
  >,
) {
  return {
    getTool(name: string) {
      return tools[name];
    },
    validateArgs(_name: string, _args: Record<string, unknown>) {
      return { valid: true, errors: [] };
    },
  };
}

describe('ToolBridge', () => {
  it('executes a tool successfully', async () => {
    const registry = createMockRegistry({
      search: {
        requiredTier: 0,
        handler: vi.fn().mockResolvedValue({ success: true, data: { results: ['a', 'b'] } }),
      },
    });

    const bridge = new ToolBridge(registry);
    const result = await bridge.executeTool({
      id: 'call-1',
      name: 'search',
      args: { query: 'test' },
    });

    expect(result.id).toBe('call-1');
    expect(result.result).toEqual({ results: ['a', 'b'] });
    expect(result.error).toBeUndefined();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns error when tool not found', async () => {
    const registry = createMockRegistry({});
    const bridge = new ToolBridge(registry);
    const result = await bridge.executeTool({ id: 'call-2', name: 'missing', args: {} });

    expect(result.error).toContain('not found');
    expect(result.result).toBeNull();
  });

  it('returns error when tool requires higher tier', async () => {
    const registry = createMockRegistry({
      admin: {
        requiredTier: 4,
        handler: vi.fn().mockResolvedValue({ success: true, data: null }),
      },
    });

    const bridge = new ToolBridge(registry, { maxTier: 2 });
    const result = await bridge.executeTool({ id: 'call-3', name: 'admin', args: {} });

    expect(result.error).toContain('tier');
    expect(result.result).toBeNull();
  });

  it('returns error when validation fails', async () => {
    const registry = {
      getTool(name: string) {
        if (name === 'tool') return { requiredTier: 0, handler: vi.fn() };
        return undefined;
      },
      validateArgs(_name: string, _args: Record<string, unknown>) {
        return { valid: false, errors: ['Missing required parameter: query'] };
      },
    };

    const bridge = new ToolBridge(registry);
    const result = await bridge.executeTool({ id: 'call-4', name: 'tool', args: {} });

    expect(result.error).toContain('Validation failed');
  });

  it('returns error on timeout', async () => {
    const registry = createMockRegistry({
      slow: {
        requiredTier: 0,
        handler: () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, data: 'done' }), 5000),
          ),
      },
    });

    const bridge = new ToolBridge(registry, { timeoutMs: 50 });
    const result = await bridge.executeTool({ id: 'call-5', name: 'slow', args: {} });

    expect(result.error).toContain('timed out');
  });
});
