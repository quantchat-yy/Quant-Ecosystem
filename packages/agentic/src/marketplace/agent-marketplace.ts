export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  rating: number;
  downloads: number;
  author: string;
  price: number; // 0 for free
}

export class AgentMarketplace {
  private agents: MarketplaceAgent[] = [
    {
      id: 'productivity-agent',
      name: 'Productivity Agent',
      description: 'Helps you manage tasks, emails, and calendar efficiently',
      capabilities: ['task_management', 'email', 'calendar'],
      rating: 4.8,
      downloads: 12400,
      author: 'Quant Team',
      price: 0,
    },
    {
      id: 'research-agent',
      name: 'Research Agent',
      description: 'Deep research and information synthesis across the web',
      capabilities: ['web_search', 'summarization', 'fact_checking'],
      rating: 4.9,
      downloads: 8900,
      author: 'Quant Team',
      price: 9.99,
    },
    {
      id: 'social-agent',
      name: 'Social Media Agent',
      description: 'Manages your social presence across all platforms',
      capabilities: ['posting', 'engagement', 'analytics'],
      rating: 4.6,
      downloads: 15600,
      author: 'Quant Team',
      price: 4.99,
    },
  ];

  async getAllAgents(): Promise<MarketplaceAgent[]> {
    return this.agents;
  }

  async getAgent(id: string): Promise<MarketplaceAgent | undefined> {
    return this.agents.find((a) => a.id === id);
  }

  async searchAgents(query: string): Promise<MarketplaceAgent[]> {
    const q = query.toLowerCase();
    return this.agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.capabilities.some((c) => c.toLowerCase().includes(q)),
    );
  }

  async installAgent(userId: string, agentId: string): Promise<boolean> {
    // TODO: Implement actual installation logic
    console.log(`Installing agent ${agentId} for user ${userId}`);
    return true;
  }
}

export const marketplace = new AgentMarketplace();
