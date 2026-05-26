import { describe, it, expect, beforeEach } from 'vitest';
import { WalletService } from '../services/wallet.service';
import type { CreateWalletInput } from '../services/wallet.service';

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    service = new WalletService();
  });

  describe('createWallet', () => {
    it('creates a wallet with default currency and zero balance', () => {
      const input: CreateWalletInput = {
        userId: 'user-1',
        defaultCurrency: 'USD',
      };

      const wallet = service.createWallet(input);

      expect(wallet.id).toBeDefined();
      expect(wallet.userId).toBe('user-1');
      expect(wallet.isActive).toBe(true);
      expect(wallet.balances).toHaveLength(1);
      expect(wallet.balances[0]!.currency).toBe('USD');
      expect(wallet.balances[0]!.amount).toBe(0);
      expect(wallet.createdAt).toBeInstanceOf(Date);
    });

    it('throws WALLET_EXISTS if user already has a wallet', () => {
      service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });

      expect(() => service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' })).toThrow(
        'User already has a wallet',
      );
    });

    it('generates unique wallet IDs', () => {
      const w1 = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      const w2 = service.createWallet({ userId: 'user-2', defaultCurrency: 'USD' });

      expect(w1.id).not.toBe(w2.id);
    });
  });

  describe('getBalance', () => {
    it('returns balance for an existing wallet', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });

      const balances = service.getBalance(wallet.id);

      expect(balances).toHaveLength(1);
      expect(balances[0]!.currency).toBe('USD');
      expect(balances[0]!.amount).toBe(0);
    });

    it('throws WALLET_NOT_FOUND for non-existent wallet', () => {
      expect(() => service.getBalance('non-existent')).toThrow('Wallet not found');
    });
  });

  describe('addFunds', () => {
    it('adds funds to wallet in existing currency', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });

      const updated = service.addFunds({
        walletId: wallet.id,
        amount: 100,
        currency: 'USD',
        description: 'Initial deposit',
      });

      expect(updated.balances[0]!.amount).toBe(100);
    });

    it('creates new currency balance when adding funds in new currency', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });

      const updated = service.addFunds({
        walletId: wallet.id,
        amount: 50,
        currency: 'EUR',
        description: 'EUR deposit',
      });

      expect(updated.balances).toHaveLength(2);
      const eurBalance = updated.balances.find((b) => b.currency === 'EUR');
      expect(eurBalance!.amount).toBe(50);
    });

    it('adds multiple deposits correctly', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });

      service.addFunds({ walletId: wallet.id, amount: 50, currency: 'USD', description: 'First' });
      const updated = service.addFunds({
        walletId: wallet.id,
        amount: 30,
        currency: 'USD',
        description: 'Second',
      });

      expect(updated.balances[0]!.amount).toBe(80);
    });
  });

  describe('withdrawFunds', () => {
    it('withdraws funds from wallet', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      service.addFunds({
        walletId: wallet.id,
        amount: 100,
        currency: 'USD',
        description: 'Deposit',
      });

      const updated = service.withdrawFunds({
        walletId: wallet.id,
        amount: 30,
        currency: 'USD',
        description: 'Withdrawal',
      });

      expect(updated.balances[0]!.amount).toBe(70);
    });

    it('throws INSUFFICIENT_FUNDS when withdrawing more than balance', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      service.addFunds({
        walletId: wallet.id,
        amount: 50,
        currency: 'USD',
        description: 'Deposit',
      });

      expect(() =>
        service.withdrawFunds({
          walletId: wallet.id,
          amount: 100,
          currency: 'USD',
          description: 'Too much',
        }),
      ).toThrow('Insufficient funds');
    });

    it('throws INSUFFICIENT_FUNDS when currency has no balance', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });

      expect(() =>
        service.withdrawFunds({
          walletId: wallet.id,
          amount: 10,
          currency: 'EUR',
          description: 'No EUR',
        }),
      ).toThrow('Insufficient funds');
    });
  });

  describe('getTransactionHistory', () => {
    it('returns all transactions for a wallet sorted by date', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      service.addFunds({ walletId: wallet.id, amount: 100, currency: 'USD', description: 'First' });
      service.addFunds({ walletId: wallet.id, amount: 50, currency: 'USD', description: 'Second' });
      service.withdrawFunds({
        walletId: wallet.id,
        amount: 25,
        currency: 'USD',
        description: 'Third',
      });

      const history = service.getTransactionHistory(wallet.id);

      expect(history).toHaveLength(3);
      const types = history.map((t) => t.type);
      expect(types).toContain('debit');
      expect(types.filter((t) => t === 'credit')).toHaveLength(2);
    });

    it('returns empty array for wallet with no transactions', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });

      const history = service.getTransactionHistory(wallet.id);

      expect(history).toEqual([]);
    });

    it('throws WALLET_NOT_FOUND for non-existent wallet', () => {
      expect(() => service.getTransactionHistory('non-existent')).toThrow('Wallet not found');
    });
  });

  describe('convertCurrency', () => {
    it('converts between supported currencies', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      service.addFunds({
        walletId: wallet.id,
        amount: 100,
        currency: 'USD',
        description: 'Deposit',
      });

      const updated = service.convertCurrency({
        walletId: wallet.id,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        amount: 50,
      });

      const usdBalance = updated.balances.find((b) => b.currency === 'USD');
      const eurBalance = updated.balances.find((b) => b.currency === 'EUR');

      expect(usdBalance!.amount).toBe(50);
      expect(eurBalance!.amount).toBe(42.5); // 50 * 0.85
    });

    it('throws SAME_CURRENCY when converting to same currency', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      service.addFunds({
        walletId: wallet.id,
        amount: 100,
        currency: 'USD',
        description: 'Deposit',
      });

      expect(() =>
        service.convertCurrency({
          walletId: wallet.id,
          fromCurrency: 'USD',
          toCurrency: 'USD',
          amount: 50,
        }),
      ).toThrow('Cannot convert to the same currency');
    });

    it('throws INSUFFICIENT_FUNDS when not enough balance for conversion', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      service.addFunds({
        walletId: wallet.id,
        amount: 20,
        currency: 'USD',
        description: 'Deposit',
      });

      expect(() =>
        service.convertCurrency({
          walletId: wallet.id,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          amount: 50,
        }),
      ).toThrow('Insufficient funds for conversion');
    });

    it('throws UNSUPPORTED_CURRENCY for unknown currency', () => {
      const wallet = service.createWallet({ userId: 'user-1', defaultCurrency: 'USD' });
      service.addFunds({
        walletId: wallet.id,
        amount: 100,
        currency: 'USD',
        description: 'Deposit',
      });

      expect(() =>
        service.convertCurrency({
          walletId: wallet.id,
          fromCurrency: 'XYZ',
          toCurrency: 'USD',
          amount: 50,
        }),
      ).toThrow('Unsupported currency: XYZ');
    });
  });

  describe('getExchangeRates', () => {
    it('returns all available exchange rates', () => {
      const rates = service.getExchangeRates();

      expect(rates.length).toBeGreaterThan(0);
      expect(rates[0]!.from).toBeDefined();
      expect(rates[0]!.to).toBeDefined();
      expect(rates[0]!.rate).toBeGreaterThan(0);
      expect(rates[0]!.updatedAt).toBeInstanceOf(Date);
    });

    it('includes common currency pairs', () => {
      const rates = service.getExchangeRates();

      const usdToEur = rates.find((r) => r.from === 'USD' && r.to === 'EUR');
      expect(usdToEur).toBeDefined();
      expect(usdToEur!.rate).toBe(0.85);
    });
  });
});
