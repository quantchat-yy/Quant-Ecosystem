export interface SandboxConfig {
  maxExecutionTime: number;
  maxMemoryMB: number;
  allowedTools: string[];
  networkAccess: boolean;
}

export class AgentSandbox {
  private config: SandboxConfig;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = {
      maxExecutionTime: 30000, // 30 seconds
      maxMemoryMB: 256,
      allowedTools: [],
      networkAccess: false,
      ...config,
    };
  }

  async executeInSandbox<T>(fn: () => Promise<T>, agentId: string): Promise<T> {
    const startTime = Date.now();

    // Simple sandboxing (in production, use proper isolation)
    const timeout = setTimeout(() => {
      throw new Error(`Agent ${agentId} exceeded max execution time`);
    }, this.config.maxExecutionTime);

    try {
      const result = await fn();
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  isToolAllowed(toolName: string): boolean {
    if (this.config.allowedTools.length === 0) return true;
    return this.config.allowedTools.includes(toolName);
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}

export const defaultSandbox = new AgentSandbox();
