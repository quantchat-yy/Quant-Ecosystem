import { EventEmitter } from 'events';
import { AgentEconomy } from '../economy/agent-economy';

export interface PaymentTransaction {
  id: string;
  buyer: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  listingId: string;
}

export class AgentEconomyPayments extends EventEmitter {
  private transactions: PaymentTransaction[] = [];
  private totalProcessed: number = 0;

  constructor(_economy: AgentEconomy) {
    super();
  }

  async processPayment(
    buyer: string,
    amount: number,
    listingId: string,
    currency: string = 'USD',
  ): Promise<PaymentTransaction> {
    const transaction: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      buyer,
      amount,
      currency,
      status: 'pending',
      timestamp: new Date(),
      listingId,
    };

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (amount > 0) {
      transaction.status = 'completed';
      this.totalProcessed += amount;
      this.transactions.push(transaction);
      this.emit('payment:completed', transaction);
    } else {
      transaction.status = 'failed';
      this.emit('payment:failed', transaction);
    }

    return transaction;
  }

  getPaymentStats() {
    return {
      totalTransactions: this.transactions.length,
      totalProcessed: this.totalProcessed,
      successRate:
        this.transactions.filter((t) => t.status === 'completed').length /
          this.transactions.length || 0,
    };
  }
}
