interface ToolRegistry {
  getTool(name: string):
    | {
        requiredTier: number;
        handler: (
          args: Record<string, unknown>,
        ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
      }
    | undefined;
  validateArgs(name: string, args: Record<string, unknown>): { valid: boolean; errors: string[] };
}

interface ToolBridgeOptions {
  maxTier?: number;
  timeoutMs?: number;
}

export interface ToolExecutionResult {
  id: string;
  result: unknown;
  latencyMs: number;
  error?: string;
}

export class ToolBridge {
  private registry: ToolRegistry;
  private maxTier: number;
  private timeoutMs: number;

  constructor(toolRegistry: ToolRegistry, options?: ToolBridgeOptions) {
    this.registry = toolRegistry;
    this.maxTier = options?.maxTier ?? 2;
    this.timeoutMs = options?.timeoutMs ?? 10000;
  }

  async executeTool(toolCall: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  }): Promise<ToolExecutionResult> {
    const start = performance.now();

    const tool = this.registry.getTool(toolCall.name);
    if (!tool) {
      return {
        id: toolCall.id,
        result: null,
        latencyMs: performance.now() - start,
        error: `Tool '${toolCall.name}' not found`,
      };
    }

    if (tool.requiredTier > this.maxTier) {
      return {
        id: toolCall.id,
        result: null,
        latencyMs: performance.now() - start,
        error: `Tool '${toolCall.name}' requires tier ${tool.requiredTier} but max allowed is ${this.maxTier}`,
      };
    }

    const validation = this.registry.validateArgs(toolCall.name, toolCall.args);
    if (!validation.valid) {
      return {
        id: toolCall.id,
        result: null,
        latencyMs: performance.now() - start,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    try {
      let timeoutId: ReturnType<typeof setTimeout>;
      const result = await Promise.race([
        tool.handler(toolCall.args),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Tool execution timed out')),
            this.timeoutMs,
          );
        }),
      ]);
      clearTimeout(timeoutId!);
      return { id: toolCall.id, result: result.data ?? null, latencyMs: performance.now() - start };
    } catch (err) {
      return {
        id: toolCall.id,
        result: null,
        latencyMs: performance.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
