import { PublishedAgentSpec } from './agent-spec.js';
import { AgentPublisher } from './publisher.js';

export interface InstalledAgent {
  spec: PublishedAgentSpec;
  installedAt: number;
  sandboxed: boolean;
  enabled: boolean;
}

export interface InstallResult {
  success: boolean;
  agentId: string;
  sandboxed: boolean;
  error?: string;
}

export class AgentInstaller {
  private readonly installed: Map<string, InstalledAgent> = new Map();
  private readonly publisher: AgentPublisher;

  constructor(publisher: AgentPublisher) {
    this.publisher = publisher;
  }

  install(specId: string): InstallResult {
    const spec = this.publisher.getById(specId);
    if (!spec) {
      return {
        success: false,
        agentId: specId,
        sandboxed: false,
        error: `Agent not found in marketplace: ${specId}`,
      };
    }

    if (this.installed.has(specId)) {
      return {
        success: false,
        agentId: specId,
        sandboxed: false,
        error: `Agent already installed: ${specId}`,
      };
    }

    const installedAgent: InstalledAgent = {
      spec,
      installedAt: Date.now(),
      sandboxed: true, // Always sandbox first
      enabled: true,
    };

    this.installed.set(specId, installedAgent);

    return {
      success: true,
      agentId: specId,
      sandboxed: true,
    };
  }

  uninstall(agentId: string): boolean {
    return this.installed.delete(agentId);
  }

  getInstalled(): InstalledAgent[] {
    return [...this.installed.values()];
  }

  promoteFromSandbox(agentId: string): boolean {
    const agent = this.installed.get(agentId);
    if (!agent) {
      return false;
    }
    if (!agent.sandboxed) {
      return false;
    }
    agent.sandboxed = false;
    return true;
  }

  isSandboxed(agentId: string): boolean {
    const agent = this.installed.get(agentId);
    return agent?.sandboxed ?? false;
  }

  getInstalledById(agentId: string): InstalledAgent | undefined {
    return this.installed.get(agentId);
  }
}
