'use client';

import { motion } from 'framer-motion';
import { Card, Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { CoinTransaction } from '@quant/quant-economy';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', ...spring.gentle } },
};

const mockBalance = 2450;

const mockTransactions: CoinTransaction[] = [
  {
    id: 'tx-1',
    userId: 'user-1',
    amount: 500,
    direction: 'credit',
    reason: 'Purchased coins via Stripe',
    idempotencyKey: 'buy-stripe-1',
    timestamp: new Date('2024-06-10'),
  },
  {
    id: 'tx-2',
    userId: 'user-1',
    amount: 250,
    direction: 'debit',
    reason: 'Boost: Standard Pack',
    idempotencyKey: 'boost-2',
    timestamp: new Date('2024-06-09'),
  },
  {
    id: 'tx-3',
    userId: 'user-1',
    amount: 50,
    direction: 'credit',
    reason: 'Daily login reward',
    idempotencyKey: 'daily-3',
    timestamp: new Date('2024-06-08'),
  },
  {
    id: 'tx-4',
    userId: 'user-1',
    amount: 200,
    direction: 'credit',
    reason: 'Referral bonus',
    idempotencyKey: 'referral-1',
    timestamp: new Date('2024-06-07'),
  },
  {
    id: 'tx-5',
    userId: 'user-1',
    amount: 75,
    direction: 'debit',
    reason: 'Store purchase: Neon Avatar',
    idempotencyKey: 'store-1',
    timestamp: new Date('2024-06-06'),
  },
];

const coinPacks = [
  { amount: 100, price: '$0.99' },
  { amount: 500, price: '$4.49' },
  { amount: 1200, price: '$9.99' },
  { amount: 5000, price: '$39.99' },
];

export default function WalletPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Coin Wallet</h1>

      {/* Balance Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', ...spring.gentle }}
      >
        <Card className="p-8 mb-8 text-center">
          <p className="text-sm text-[var(--quant-muted-foreground)] uppercase tracking-wide">
            Your Balance
          </p>
          <p className="text-5xl font-bold mt-2">{mockBalance.toLocaleString()}</p>
          <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">Quant Coins</p>
        </Card>
      </motion.div>

      {/* Buy Coins Section */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Buy Coins</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {coinPacks.map((pack) => (
            <motion.div key={pack.amount} variants={staggerItem}>
              <Card className="p-4 text-center">
                <p className="text-xl font-bold">{pack.amount}</p>
                <p className="text-xs text-[var(--quant-muted-foreground)]">coins</p>
                <p className="text-sm font-medium mt-2">{pack.price}</p>
              </Card>
            </motion.div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="sm">
            Pay with Stripe
          </Button>
          <Button variant="secondary" size="sm">
            Pay with Razorpay
          </Button>
          <Button variant="secondary" size="sm">
            Pay with UPI
          </Button>
        </div>
      </motion.div>

      {/* Earn Coins Section */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Earn Coins</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div variants={staggerItem}>
            <Card className="p-4">
              <h3 className="font-medium text-sm mb-2">Daily Login Reward</h3>
              <p className="text-xs text-[var(--quant-muted-foreground)] mb-3">
                Claim 50 coins every day just for logging in.
              </p>
              <Button variant="primary" size="sm">
                Claim Daily Login
              </Button>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="p-4">
              <h3 className="font-medium text-sm mb-2">Referral Program</h3>
              <p className="text-xs text-[var(--quant-muted-foreground)] mb-3">
                Earn 200 coins for each friend who joins.
              </p>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-[var(--quant-muted)] rounded text-xs">REF-ABCDE</code>
                <Button variant="secondary" size="sm">
                  Copy Link
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <h2 className="text-lg font-semibold mb-3">Transaction History</h2>
        {mockTransactions.map((tx) => (
          <motion.div key={tx.id} variants={staggerItem}>
            <Card className="p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{tx.reason}</p>
                  <p className="text-xs text-[var(--quant-muted-foreground)]">
                    {tx.timestamp.toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    tx.direction === 'credit'
                      ? 'text-[var(--quant-success)]'
                      : 'text-[var(--quant-warning)]'
                  }`}
                >
                  {tx.direction === 'credit' ? '+' : '-'}
                  {tx.amount} coins
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
