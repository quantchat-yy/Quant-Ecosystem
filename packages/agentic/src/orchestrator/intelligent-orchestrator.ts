import { EventEmitter } from 'events';
import { Agent } from '../core/agent';
import { MemoryStore } from '../memory/memory-store';

export interface OrchestratorConfig {
  maxConcurrentAgents?: number;
  defaultModel?: string;
  enableSelfHealing?: boolean;
  enableFederation?: boolean;
}

export interface TaskDecomposition {
  subtasks: Array<{
    id: string;
    description: string;
    requiredCapabilities: string[];
    priority: number;
  }>;
  strategy: 'parallel' | 'sequential' | 'hybrid';
}

export class IntelligentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private globalMemory: MemoryStore;
  private config: OrchestratorConfig;
  private performanceMetrics: Map<string, number> = new Map();

  constructor(config: OrchestratorConfig = {}) {
    super();
    this.config = {
      maxConcurrentAgents: 25,
      defaultModel: 'gpt-4o',
      enableSelfHealing: true,
      enableFederation: true,
      ...config,
    };
    this.globalMemory = new MemoryStore('intelligent-orchestrator');
  }

  registerAgent(agent: Agent, capabilities: string[] = []): void {
    this.agents.set(agent.id, agent);
    this.performanceMetrics.set(agent.id, 0.85);
    this.emit('agent:registered', { agentId: agent.id, capabilities });
  }

  async decomposeTask(task: string): Promise<TaskDecomposition> {
    return {
      subtasks: [
        {
          id: 'analyze',
          description: `Deep analysis: ${task}`,
          requiredCapabilities: ['analysis'],
          priority: 1,
        },
        {
          id: 'execute',
          description: `Core execution: ${task}`,
          requiredCapabilities: ['execution'],
          priority: 2,
        },
        {
          id: 'validate',
          description: `Validation & optimization: ${task}`,
          requiredCapabilities: ['validation'],
          priority: 3,
        },
      ],
      strategy: 'parallel',
    };
  }

  async selectBestAgents(capabilities: string[], count: number = 3): Promise<string[]> {
    return Array.from(this.agents.keys()).slice(0, count);
  }

  async runIntelligentTask(task: string): Promise<any> {
    const decomp = await this.decomposeTask(task);
    const selected = await this.selectBestAgents(['execution'], decomp.subtasks.length);

    const results = await Promise.all(
      decomp.subtasks.map(
        (sub, i) => this.agents.get(selected[i % selected.length])?.run(sub.description) || null,
      ),
    );

    const final = { task, decomposition: decomp, results, version: '2.1' };
    await this.globalMemory.store({ type: 'intelligent_result', content: final });
    return final;
  }

  getPerformanceReport() {
    return {
      agents: this.agents.size,
      avgPerformance:
        Array.from(this.performanceMetrics.values()).reduce((a, b) => a + b, 0) /
        this.performanceMetrics.size,
    };
  }
}
