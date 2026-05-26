import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface WalletBalance {
  currency: string;
  amount: number;
}

export interface Wallet {
  id: string;
  userId: string;
  balances: WalletBalance[];
  isActive: boolean;
  createdAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'conversion';
  amount: number;
  currency: string;
  description: string;
  balanceAfter: number;
  createdAt: Date;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updatedAt: Date;
}

export const CreateWalletSchema = z.object({
  userId: z.string().min(1),
  defaultCurrency: z.string().min(3).max(3).default('USD'),
});

export type CreateWalletInput = z.infer<typeof CreateWalletSchema>;

export const AddFundsSchema = z.object({
  walletId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  description: z.string().max(500).default('Funds added'),
});

export type AddFundsInput = z.infer<typeof AddFundsSchema>;

export const WithdrawFundsSchema = z.object({
  walletId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3).default('USD'),
  description: z.string().max(500).default('Funds withdrawn'),
});

export type WithdrawFundsInput = z.infer<typeof WithdrawFundsSchema>;

export const ConvertCurrencySchema = z.object({
  walletId: z.string().min(1),
  fromCurrency: z.string().min(3).max(3),
  toCurrency: z.string().min(3).max(3),
  amount: z.number().positive(),
});

export type ConvertCurrencyInput = z.infer<typeof ConvertCurrencySchema>;

const DEFAULT_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.85, GBP: 0.73, JPY: 110.0, CAD: 1.25 },
  EUR: { USD: 1.18, GBP: 0.86, JPY: 129.5, CAD: 1.47 },
  GBP: { USD: 1.37, EUR: 1.16, JPY: 150.7, CAD: 1.71 },
  JPY: { USD: 0.0091, EUR: 0.0077, GBP: 0.0066, CAD: 0.011 },
  CAD: { USD: 0.8, EUR: 0.68, GBP: 0.58, JPY: 88.0 },
};

export class WalletService {
  private readonly wallets = new Map<string, Wallet>();
  private readonly transactions = new Map<string, WalletTransaction[]>();
  private readonly exchangeRates: Record<string, Record<string, number>> = DEFAULT_EXCHANGE_RATES;

  createWallet(input: CreateWalletInput): Wallet {
    const parsed = CreateWalletSchema.parse(input);

    for (const wallet of this.wallets.values()) {
      if (wallet.userId === parsed.userId) {
        throw createAppError('User already has a wallet', 409, 'WALLET_EXISTS');
      }
    }

    const wallet: Wallet = {
      id: randomUUID(),
      userId: parsed.userId,
      balances: [{ currency: parsed.defaultCurrency, amount: 0 }],
      isActive: true,
      createdAt: new Date(),
    };

    this.wallets.set(wallet.id, wallet);
    this.transactions.set(wallet.id, []);
    return wallet;
  }

  getBalance(walletId: string): WalletBalance[] {
    const wallet = this.getWallet(walletId);
    return wallet.balances;
  }

  addFunds(input: AddFundsInput): Wallet {
    const parsed = AddFundsSchema.parse(input);
    const wallet = this.getWallet(parsed.walletId);

    let balance = wallet.balances.find((b) => b.currency === parsed.currency);
    if (!balance) {
      balance = { currency: parsed.currency, amount: 0 };
      wallet.balances.push(balance);
    }

    balance.amount += parsed.amount;
    balance.amount = Math.round(balance.amount * 100) / 100;

    const transaction: WalletTransaction = {
      id: randomUUID(),
      walletId: wallet.id,
      type: 'credit',
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      balanceAfter: balance.amount,
      createdAt: new Date(),
    };

    const txList = this.transactions.get(wallet.id) ?? [];
    txList.push(transaction);
    this.transactions.set(wallet.id, txList);

    return wallet;
  }

  withdrawFunds(input: WithdrawFundsInput): Wallet {
    const parsed = WithdrawFundsSchema.parse(input);
    const wallet = this.getWallet(parsed.walletId);

    const balance = wallet.balances.find((b) => b.currency === parsed.currency);
    if (!balance || balance.amount < parsed.amount) {
      throw createAppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');
    }

    balance.amount -= parsed.amount;
    balance.amount = Math.round(balance.amount * 100) / 100;

    const transaction: WalletTransaction = {
      id: randomUUID(),
      walletId: wallet.id,
      type: 'debit',
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      balanceAfter: balance.amount,
      createdAt: new Date(),
    };

    const txList = this.transactions.get(wallet.id) ?? [];
    txList.push(transaction);
    this.transactions.set(wallet.id, txList);

    return wallet;
  }

  getTransactionHistory(walletId: string): WalletTransaction[] {
    this.getWallet(walletId);
    const txList = this.transactions.get(walletId) ?? [];
    return txList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  convertCurrency(input: ConvertCurrencyInput): Wallet {
    const parsed = ConvertCurrencySchema.parse(input);
    const wallet = this.getWallet(parsed.walletId);

    if (parsed.fromCurrency === parsed.toCurrency) {
      throw createAppError('Cannot convert to the same currency', 400, 'SAME_CURRENCY');
    }

    const rate = this.getExchangeRate(parsed.fromCurrency, parsed.toCurrency);

    const fromBalance = wallet.balances.find((b) => b.currency === parsed.fromCurrency);
    if (!fromBalance || fromBalance.amount < parsed.amount) {
      throw createAppError('Insufficient funds for conversion', 400, 'INSUFFICIENT_FUNDS');
    }

    const convertedAmount = Math.round(parsed.amount * rate * 100) / 100;

    fromBalance.amount -= parsed.amount;
    fromBalance.amount = Math.round(fromBalance.amount * 100) / 100;

    let toBalance = wallet.balances.find((b) => b.currency === parsed.toCurrency);
    if (!toBalance) {
      toBalance = { currency: parsed.toCurrency, amount: 0 };
      wallet.balances.push(toBalance);
    }
    toBalance.amount += convertedAmount;
    toBalance.amount = Math.round(toBalance.amount * 100) / 100;

    const transaction: WalletTransaction = {
      id: randomUUID(),
      walletId: wallet.id,
      type: 'conversion',
      amount: parsed.amount,
      currency: parsed.fromCurrency,
      description: `Converted ${parsed.amount} ${parsed.fromCurrency} to ${convertedAmount} ${parsed.toCurrency}`,
      balanceAfter: fromBalance.amount,
      createdAt: new Date(),
    };

    const txList = this.transactions.get(wallet.id) ?? [];
    txList.push(transaction);
    this.transactions.set(wallet.id, txList);

    return wallet;
  }

  getExchangeRates(): ExchangeRate[] {
    const rates: ExchangeRate[] = [];
    const now = new Date();
    for (const [from, toRates] of Object.entries(this.exchangeRates)) {
      for (const [to, rate] of Object.entries(toRates)) {
        rates.push({ from, to, rate, updatedAt: now });
      }
    }
    return rates;
  }

  private getExchangeRate(from: string, to: string): number {
    const fromRates = this.exchangeRates[from];
    if (!fromRates) {
      throw createAppError(`Unsupported currency: ${from}`, 400, 'UNSUPPORTED_CURRENCY');
    }
    const rate = fromRates[to];
    if (rate === undefined) {
      throw createAppError(`No exchange rate for ${from} to ${to}`, 400, 'NO_EXCHANGE_RATE');
    }
    return rate;
  }

  private getWallet(walletId: string): Wallet {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw createAppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
    }
    if (!wallet.isActive) {
      throw createAppError('Wallet is not active', 400, 'WALLET_INACTIVE');
    }
    return wallet;
  }
}
