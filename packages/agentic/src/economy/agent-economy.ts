import { EventEmitter } from 'events';
import { AgentMarketplaceV2 } from '../marketplace/agent-marketplace-v2';
import { IntelligentOrchestrator } from '../orchestrator/intelligent-orchestrator';

export interface AgentTransaction {
  id: string;
  listingId: string;
  buyer: string;
  amount: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export class AgentEconomy extends EventEmitter {
  private marketplace: AgentMarketplaceV2;
  private orchestrator: IntelligentOrchestrator;
  private transactions: AgentTransaction[] = [];
  private totalRevenue: number = 0;

  constructor(marketplace: AgentMarketplaceV2, orchestrator: IntelligentOrchestrator) {
    super();
    this.marketplace = marketplace;
    this.orchestrator = orchestrator;
  }

  async purchaseAgent(listingId: string, buyer: string): Promise<AgentTransaction> {
    const result = await this.marketplace.purchaseAndIntegrate(listingId);

    const transaction: AgentTransaction = {
      id: `tx-${Date.now()}`,
      listingId,
      buyer,
      amount: result.listing.price,
      timestamp: new Date(),
      status: 'completed',
    };

    this.transactions.push(transaction);
    this.totalRevenue += transaction.amount;

    this.emit('economy:transaction', transaction);

    // Use orchestrator for post-purchase optimization
    await this.orchestrator.runIntelligentTask(
      `Optimize newly purchased agent ${listingId} for ${buyer}`,
    );

    return transaction;
  }

  getEconomyStats() {
    return {
      totalTransactions: this.transactions.length,
      totalRevenue: this.totalRevenue,
      avgTransaction: this.totalRevenue / this.transactions.length || 0,
      topAgents: this.transactions.slice(-5),
    };
  }

  async runEconomySimulation() {
    // Simulate market activity
    const listings = await this.marketplace.discoverAgents('ai');
    for (const listing of listings.slice(0, 3)) {
      await this.purchaseAgent(listing.id, 'simulation-user');
    }
    return this.getEconomyStats();
  }
}
