export interface FederatedAgent {
  id: string;
  endpoint: string;
  capabilities: string[];
  trustLevel: number;
}

export class AgentFederation {
  private federatedAgents: Map<string, FederatedAgent> = new Map();

  registerFederatedAgent(agent: FederatedAgent) {
    this.federatedAgents.set(agent.id, agent);
  }

  async callFederatedAgent(agentId: string, input: string): Promise<any> {
    const agent = this.federatedAgents.get(agentId);
    if (!agent) {
      throw new Error(`Federated agent ${agentId} not found`);
    }

    // In production, make actual HTTP call to agent.endpoint
    console.log(`Calling federated agent ${agentId} at ${agent.endpoint}`);

    return {
      response: `Response from federated agent ${agentId}`,
      source: 'federated',
    };
  }

  getFederatedAgents(): FederatedAgent[] {
    return Array.from(this.federatedAgents.values());
  }
}

export const federation = new AgentFederation();
