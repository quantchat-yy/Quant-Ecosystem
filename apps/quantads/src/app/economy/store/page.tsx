'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { VirtualGood, GoodCategory } from '@quant/quant-economy';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', ...spring.gentle } },
};

const CATEGORIES: { key: GoodCategory; label: string }[] = [
  { key: 'avatar_item', label: 'Avatars' },
  { key: 'outfit', label: 'Outfits' },
  { key: 'skin', label: 'Skins' },
  { key: 'chat_theme', label: 'Themes' },
  { key: 'sticker_pack', label: 'Stickers' },
  { key: 'gift_item', label: 'Gifts' },
];

const mockItems: VirtualGood[] = [
  {
    id: 'item-1',
    name: 'Neon Glow Avatar',
    description: 'A vibrant neon avatar',
    category: 'avatar_item',
    priceCoins: 150,
    crossApp: true,
  },
  {
    id: 'item-2',
    name: 'Cyber Punk Avatar',
    description: 'Futuristic cyber look',
    category: 'avatar_item',
    priceCoins: 200,
    crossApp: true,
  },
  {
    id: 'item-3',
    name: 'Space Explorer',
    description: 'Galactic themed avatar',
    category: 'avatar_item',
    priceCoins: 300,
    crossApp: true,
  },
  {
    id: 'item-4',
    name: 'Midnight Jacket',
    description: 'Dark-themed outfit',
    category: 'outfit',
    priceCoins: 350,
    crossApp: true,
  },
  {
    id: 'item-5',
    name: 'Summer Vibes',
    description: 'Tropical outfit set',
    category: 'outfit',
    priceCoins: 250,
    crossApp: true,
  },
  {
    id: 'item-6',
    name: 'Gold Rush Skin',
    description: 'Shimmering gold skin',
    category: 'skin',
    priceCoins: 500,
    crossApp: true,
  },
  {
    id: 'item-7',
    name: 'Arctic Frost',
    description: 'Ice-blue skin tone',
    category: 'skin',
    priceCoins: 400,
    crossApp: true,
  },
  {
    id: 'item-8',
    name: 'Dark Mode Pro',
    description: 'Premium dark chat theme',
    category: 'chat_theme',
    priceCoins: 100,
    crossApp: true,
  },
  {
    id: 'item-9',
    name: 'Ocean Breeze',
    description: 'Calm blue gradients',
    category: 'chat_theme',
    priceCoins: 120,
    crossApp: true,
  },
  {
    id: 'item-10',
    name: 'Emoji Mega Pack',
    description: '50+ custom stickers',
    category: 'sticker_pack',
    priceCoins: 180,
    crossApp: true,
  },
  {
    id: 'item-11',
    name: 'Love Reactions',
    description: 'Animated hearts pack',
    category: 'sticker_pack',
    priceCoins: 80,
    crossApp: true,
  },
  {
    id: 'item-12',
    name: 'Birthday Surprise',
    description: 'Animated birthday gift',
    category: 'gift_item',
    priceCoins: 250,
    crossApp: true,
  },
];

export default function StorePage() {
  const [activeCategory, setActiveCategory] = useState<GoodCategory>('avatar_item');

  const filteredItems = mockItems.filter((item) => item.category === activeCategory);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Virtual Goods Store</h1>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-[var(--quant-primary)] text-white'
                : 'bg-[var(--quant-muted)] text-[var(--quant-foreground)] hover:bg-[var(--quant-border)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      <motion.div
        key={activeCategory}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {filteredItems.map((item) => (
          <motion.div key={item.id} variants={staggerItem}>
            <Card className="p-4 flex flex-col h-full">
              {/* Image Placeholder */}
              <div className="w-full h-32 bg-[var(--quant-muted)] rounded-md mb-3 flex items-center justify-center">
                <span className="text-[var(--quant-muted-foreground)] text-xs">Preview</span>
              </div>
              <h3 className="font-medium text-sm">{item.name}</h3>
              <p className="text-xs text-[var(--quant-muted-foreground)] mt-1 flex-1">
                {item.description}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-bold">{item.priceCoins} coins</span>
                <Button variant="primary" size="sm">
                  Purchase
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[var(--quant-muted-foreground)]">
            No items available in this category yet.
          </p>
        </div>
      )}
    </div>
  );
}
