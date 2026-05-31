'use client';

import { motion } from 'framer-motion';
import { Card, Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { CreatorListing, PayoutRequest } from '@quant/quant-economy';

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

const mockListings: CreatorListing[] = [
  {
    id: 'listing-1',
    creatorId: 'creator-1',
    title: 'Pixel Art Avatar Pack',
    description: 'Hand-crafted pixel art avatars for your profile.',
    type: 'virtual_good',
    priceCoins: 300,
    active: true,
    createdAt: new Date('2024-05-15'),
  },
  {
    id: 'listing-2',
    creatorId: 'creator-1',
    title: 'Speed Run Game Pass',
    description: 'Unlock exclusive game pass with special perks.',
    type: 'game_pass',
    priceCoins: 500,
    active: true,
    createdAt: new Date('2024-05-20'),
  },
  {
    id: 'listing-3',
    creatorId: 'creator-1',
    title: 'Vintage Chat Theme',
    description: 'Retro style chat theme with aged paper textures.',
    type: 'virtual_good',
    priceCoins: 150,
    active: false,
    createdAt: new Date('2024-04-10'),
  },
];

const mockPayouts: PayoutRequest[] = [
  {
    id: 'payout-1',
    creatorId: 'creator-1',
    amount: 5000,
    method: 'Bank Transfer',
    status: 'completed',
    requestedAt: new Date('2024-05-01'),
    processedAt: new Date('2024-05-03'),
  },
  {
    id: 'payout-2',
    creatorId: 'creator-1',
    amount: 3200,
    method: 'UPI',
    status: 'pending',
    requestedAt: new Date('2024-06-01'),
  },
];

const totalEarnings = 14500;
const creatorShare = Math.round(totalEarnings * 0.7);
const platformShare = Math.round(totalEarnings * 0.3);

export default function CreatorPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Creator Marketplace</h1>

      {/* Earnings Overview */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Earnings Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={staggerItem}>
            <Card className="p-5">
              <p className="text-xs text-[var(--quant-muted-foreground)] uppercase tracking-wide">
                Total Sales
              </p>
              <p className="text-2xl font-bold mt-2">{totalEarnings.toLocaleString()} coins</p>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="p-5">
              <p className="text-xs text-[var(--quant-muted-foreground)] uppercase tracking-wide">
                Your Share (70%)
              </p>
              <p className="text-2xl font-bold mt-2 text-[var(--quant-success)]">
                {creatorShare.toLocaleString()} coins
              </p>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card className="p-5">
              <p className="text-xs text-[var(--quant-muted-foreground)] uppercase tracking-wide">
                Platform Fee (30%)
              </p>
              <p className="text-2xl font-bold mt-2">{platformShare.toLocaleString()} coins</p>
            </Card>
          </motion.div>
        </div>

        {/* Revenue Split Visualization */}
        <motion.div variants={staggerItem} className="mt-4">
          <Card className="p-4">
            <p className="text-xs text-[var(--quant-muted-foreground)] mb-2">Revenue Split</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              <div
                className="bg-[var(--quant-success)]"
                style={{ width: '70%' }}
                title="Creator 70%"
              />
              <div
                className="bg-[var(--quant-muted)]"
                style={{ width: '30%' }}
                title="Platform 30%"
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-[var(--quant-muted-foreground)]">
              <span>Creator: 70%</span>
              <span>Platform: 30%</span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* My Listings */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Listings</h2>
          <Button variant="primary" size="sm">
            Create Listing
          </Button>
        </div>
        {mockListings.map((listing) => (
          <motion.div key={listing.id} variants={staggerItem}>
            <Card className="p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{listing.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        listing.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {listing.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--quant-muted-foreground)] mt-1">
                    {listing.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{listing.priceCoins} coins</p>
                  <p className="text-xs text-[var(--quant-muted-foreground)]">{listing.type}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Payout History */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Payout History</h2>
          <Button variant="secondary" size="sm">
            Request Cash-Out
          </Button>
        </div>
        {mockPayouts.map((payout) => (
          <motion.div key={payout.id} variants={staggerItem}>
            <Card className="p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{payout.amount.toLocaleString()} coins</p>
                  <p className="text-xs text-[var(--quant-muted-foreground)]">
                    via {payout.method} - {payout.requestedAt.toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    payout.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : payout.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : payout.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                  }`}
                >
                  {payout.status}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Marketplace Browse */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Browse Marketplace</h2>
        <div className="text-center py-8">
          <p className="text-[var(--quant-muted-foreground)]">
            Discover items from other creators in the marketplace.
          </p>
          <Button variant="secondary" size="sm" className="mt-3">
            Explore Marketplace
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
