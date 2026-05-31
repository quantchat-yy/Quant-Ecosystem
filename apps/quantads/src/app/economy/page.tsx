'use client';

import { motion } from 'framer-motion';
import { Card, Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { CoinTransaction, SubscriptionTier } from '@quant/quant-economy';

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

// Mock data for the economy overview
const mockBalance = 2450;
const mockTier: SubscriptionTier = 'Pro';
const mockRecentTransactions: (CoinTransaction & { id: string })[] = [
  {
    id: 'tx-1',
    userId: 'user-1',
    amount: 500,
    direction: 'credit',
    reason: 'Purchased coins',
    idempotencyKey: 'buy-1',
    timestamp: new Date('2024-06-01'),
  },
  {
    id: 'tx-2',
    userId: 'user-1',
    amount: 100,
    direction: 'debit',
    reason: 'Boost: Basic Pack',
    idempotencyKey: 'boost-1',
    timestamp: new Date('2024-06-02'),
  },
  {
    id: 'tx-3',
    userId: 'user-1',
    amount: 50,
    direction: 'credit',
    reason: 'Daily login reward',
    idempotencyKey: 'daily-1',
    timestamp: new Date('2024-06-03'),
  },
];

export default function EconomyOverviewPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Economy Overview</h1>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Wallet Balance Card */}
        <motion.div variants={staggerItem}>
          <Card className="p-5">
            <p className="text-xs text-[var(--quant-muted-foreground)] uppercase tracking-wide">
              Wallet Balance
            </p>
            <p className="text-3xl font-bold mt-2">{mockBalance.toLocaleString()} coins</p>
          </Card>
        </motion.div>

        {/* Subscription Tier Card */}
        <motion.div variants={staggerItem}>
          <Card className="p-5">
            <p className="text-xs text-[var(--quant-muted-foreground)] uppercase tracking-wide">
              Current Plan
            </p>
            <p className="text-3xl font-bold mt-2">{mockTier}</p>
          </Card>
        </motion.div>

        {/* Quick Stats Card */}
        <motion.div variants={staggerItem}>
          <Card className="p-5">
            <p className="text-xs text-[var(--quant-muted-foreground)] uppercase tracking-wide">
              Active Boosts
            </p>
            <p className="text-3xl font-bold mt-2">2</p>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <motion.div variants={staggerItem} className="flex flex-wrap gap-3">
          <Button variant="primary" size="sm">
            Buy Coins
          </Button>
          <Button variant="secondary" size="sm">
            Visit Store
          </Button>
          <Button variant="secondary" size="sm">
            Boost a Post
          </Button>
        </motion.div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
        {mockRecentTransactions.map((tx) => (
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
