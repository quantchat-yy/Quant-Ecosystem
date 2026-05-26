import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  store: string;
  rating: number;
  inStock: boolean;
}

export interface ShoppingResult {
  query: string;
  products: Product[];
  bestDeal: Product | null;
  comparison: Array<{ store: string; price: number; savings: number }>;
}

export class ShoppingPilot extends WorkerAgent {
  private lastResult: ShoppingResult | null = null;

  constructor() {
    super({
      id: 'shopping-pilot',
      name: 'Shopping Pilot',
      icon: 'shopping-cart',
      defaultPermission: PermissionLevel.ACT_HIGH,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const query = (task.params?.['query'] as string) ?? '';
      const products = (task.params?.['products'] as Product[] | undefined) ?? [];

      const inStockProducts = products.filter((p) => p.inStock);
      const sortedByPrice = [...inStockProducts].sort((a, b) => a.price - b.price);
      const bestDeal = sortedByPrice.length > 0 ? sortedByPrice[0]! : null;

      const maxPrice =
        sortedByPrice.length > 0 ? sortedByPrice[sortedByPrice.length - 1]!.price : 0;
      const comparison = inStockProducts.map((p) => ({
        store: p.store,
        price: p.price,
        savings: maxPrice - p.price,
      }));

      this.lastResult = { query, products: inStockProducts, bestDeal, comparison };

      this.logAction(`shopping-research:${query}`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getShoppingResult(): ShoppingResult | null {
    return this.lastResult;
  }
}
