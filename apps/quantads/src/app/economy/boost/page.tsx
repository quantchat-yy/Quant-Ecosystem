'use client';

import { motion } from 'framer-motion';
import { Card, Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { BoostPack, BoostAnalytics } from '@quant/quant-economy';

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

const boostPacks: BoostPack[] = [
  { id: 'basic', name: 'Basic', multiplier: 2, costCoins: 100 },
  { id: 'standard', name: 'Standard', multiplier: 5, costCoins: 250 },
  { id: 'premium', name: 'Premium', multiplier: 10, costCoins: 500 },
];

const mockActiveBoosts: (BoostAnalytics & { postTitle: string })[] = [
  {
    boostId: 'boost-1',
    impressions: 1200,
    reachMultiplier: 2,
    organicReach: 600,
    postTitle: 'My Weekend Travel Vlog',
  },
  {
    boostId: 'boost-2',
    impressions: 4500,
    reachMultiplier: 5,
    organicReach: 900,
    postTitle: 'Product Launch Announcement',
  },
];

const mockPosts = [
  { id: 'post-1', title: 'New Photography Series' },
  { id: 'post-2', title: 'Behind the Scenes' },
  { id: 'post-3', title: 'Tutorial: Getting Started' },
];

export default function BoostPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Self-Boost</h1>

      {/* Clear distinction from ads */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-blue-800">Organic Boost - NOT an advertisement</p>
        <p className="text-xs text-blue-700 mt-1">
          Boost amplifies your organic reach. Your content will not carry a sponsored label and will
          appear as natural content in feeds. This is purely a reach multiplier for your own posts
          and reels.
        </p>
      </div>

      {/* Boost Pack Tiers */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Boost Packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {boostPacks.map((pack) => (
            <motion.div key={pack.id} variants={staggerItem}>
              <Card className="p-5 text-center">
                <h3 className="font-bold text-lg">{pack.name}</h3>
                <p className="text-3xl font-bold mt-2 text-[var(--quant-primary)]">
                  {pack.multiplier}x
                </p>
                <p className="text-xs text-[var(--quant-muted-foreground)] mt-1">
                  reach multiplier
                </p>
                <p className="text-sm font-medium mt-3">{pack.costCoins} coins</p>
                <Button variant="primary" size="sm" className="mt-3 w-full">
                  Select
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Post/Reel Selector */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Select Post or Reel</h2>
        <Card className="p-4">
          <div className="space-y-2">
            {mockPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-3 border border-[var(--quant-border)] rounded-md hover:bg-[var(--quant-muted)] transition-colors cursor-pointer"
              >
                <span className="text-sm">{post.title}</span>
                <Button variant="secondary" size="sm">
                  Boost This
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Active Boosts with Analytics */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <h2 className="text-lg font-semibold mb-3">Active Boosts</h2>
        {mockActiveBoosts.map((boost) => (
          <motion.div key={boost.boostId} variants={staggerItem}>
            <Card className="p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-sm">{boost.postTitle}</h3>
                  <p className="text-xs text-[var(--quant-muted-foreground)] mt-1">
                    Reach multiplier: {boost.reachMultiplier}x
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {boost.impressions.toLocaleString()} impressions
                  </p>
                  <p className="text-xs text-[var(--quant-muted-foreground)]">
                    Organic reach: {boost.organicReach.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
