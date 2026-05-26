import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface VirtualCard {
  id: string;
  userId: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  status: 'active' | 'frozen' | 'cancelled';
  spendingLimit: number;
  currency: string;
  totalSpent: number;
  createdAt: Date;
}

export interface CardTransaction {
  id: string;
  cardId: string;
  amount: number;
  currency: string;
  merchantName: string;
  category: string;
  status: 'completed' | 'declined' | 'pending';
  createdAt: Date;
}

export const IssueCardSchema = z.object({
  userId: z.string().min(1),
  currency: z.string().min(3).max(3).default('USD'),
  spendingLimit: z.number().positive().default(1000),
});

export type IssueCardInput = z.infer<typeof IssueCardSchema>;

export const SetSpendingLimitsSchema = z.object({
  cardId: z.string().min(1),
  spendingLimit: z.number().positive(),
});

export type SetSpendingLimitsInput = z.infer<typeof SetSpendingLimitsSchema>;

const TRANSACTION_CATEGORIES: Record<string, string> = {
  grocery: 'Groceries',
  restaurant: 'Dining',
  gas: 'Transportation',
  online: 'Online Shopping',
  entertainment: 'Entertainment',
  travel: 'Travel',
  utilities: 'Utilities',
  healthcare: 'Healthcare',
  other: 'Other',
};

export class VirtualCardService {
  private readonly cards = new Map<string, VirtualCard>();
  private readonly cardTransactions = new Map<string, CardTransaction[]>();

  issueCard(input: IssueCardInput): VirtualCard {
    const parsed = IssueCardSchema.parse(input);

    const now = new Date();
    const expiryYear = now.getFullYear() + 3;
    const expiryMonth = now.getMonth() + 1;

    const card: VirtualCard = {
      id: randomUUID(),
      userId: parsed.userId,
      cardNumber: this.generateCardNumber(),
      expiryMonth,
      expiryYear,
      cvv: this.generateCVV(),
      status: 'active',
      spendingLimit: parsed.spendingLimit,
      currency: parsed.currency,
      totalSpent: 0,
      createdAt: new Date(),
    };

    this.cards.set(card.id, card);
    this.cardTransactions.set(card.id, []);
    return card;
  }

  freezeCard(cardId: string): VirtualCard {
    const card = this.getCard(cardId);

    if (card.status === 'cancelled') {
      throw createAppError('Cannot freeze a cancelled card', 400, 'CARD_CANCELLED');
    }

    if (card.status === 'frozen') {
      throw createAppError('Card is already frozen', 400, 'CARD_ALREADY_FROZEN');
    }

    card.status = 'frozen';
    return card;
  }

  unfreezeCard(cardId: string): VirtualCard {
    const card = this.getCard(cardId);

    if (card.status !== 'frozen') {
      throw createAppError('Card is not frozen', 400, 'CARD_NOT_FROZEN');
    }

    card.status = 'active';
    return card;
  }

  setSpendingLimits(input: SetSpendingLimitsInput): VirtualCard {
    const parsed = SetSpendingLimitsSchema.parse(input);
    const card = this.getCard(parsed.cardId);

    if (card.status === 'cancelled') {
      throw createAppError('Cannot set limits on a cancelled card', 400, 'CARD_CANCELLED');
    }

    card.spendingLimit = parsed.spendingLimit;
    return card;
  }

  getCardTransactions(cardId: string): CardTransaction[] {
    this.getCard(cardId);
    const txList = this.cardTransactions.get(cardId) ?? [];
    return txList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  categorizeTransaction(merchantName: string): string {
    const lower = merchantName.toLowerCase();
    if (lower.includes('grocery') || lower.includes('market') || lower.includes('food')) {
      return TRANSACTION_CATEGORIES['grocery'] ?? 'Other';
    }
    if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('diner')) {
      return TRANSACTION_CATEGORIES['restaurant'] ?? 'Other';
    }
    if (
      lower.includes('gas') ||
      lower.includes('fuel') ||
      lower.includes('uber') ||
      lower.includes('lyft')
    ) {
      return TRANSACTION_CATEGORIES['gas'] ?? 'Other';
    }
    if (lower.includes('amazon') || lower.includes('ebay') || lower.includes('shop')) {
      return TRANSACTION_CATEGORIES['online'] ?? 'Other';
    }
    if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('cinema')) {
      return TRANSACTION_CATEGORIES['entertainment'] ?? 'Other';
    }
    if (lower.includes('airline') || lower.includes('hotel') || lower.includes('booking')) {
      return TRANSACTION_CATEGORIES['travel'] ?? 'Other';
    }
    return TRANSACTION_CATEGORIES['other'] ?? 'Other';
  }

  getCard(cardId: string): VirtualCard {
    const card = this.cards.get(cardId);
    if (!card) {
      throw createAppError('Card not found', 404, 'CARD_NOT_FOUND');
    }
    return card;
  }

  private generateCardNumber(): string {
    const segments: string[] = [];
    for (let i = 0; i < 4; i++) {
      segments.push(String(Math.floor(1000 + Math.random() * 9000)));
    }
    return segments.join(' ');
  }

  private generateCVV(): string {
    return String(Math.floor(100 + Math.random() * 900));
  }
}
