'use client';

import { useState } from 'react';

/**
 * AR Lens configuration type.
 * Each lens has an id, name, display info, and rendering metadata.
 */
export interface ARLensConfig {
  id: string;
  name: string;
  type: 'face_distortion' | 'color_overlay' | 'particle' | 'alien_theme' | 'beauty';
  emoji: string;
  color: string;
  requiresFaceTracking: boolean;
  fallbackPosition: { x: number; y: number; scale: number };
}

/**
 * The 7 built-in AR lenses available in QuantChat.
 */
export const AR_LENSES: ARLensConfig[] = [
  {
    id: 'face-warp',
    name: 'Face Warp',
    type: 'face_distortion',
    emoji: '\uD83E\uDD2A',
    color: '#FF6B6B',
    requiresFaceTracking: true,
    fallbackPosition: { x: 0.5, y: 0.4, scale: 0.6 },
  },
  {
    id: 'color-pop',
    name: 'Color Pop',
    type: 'color_overlay',
    emoji: '\uD83C\uDF08',
    color: '#FF9F43',
    requiresFaceTracking: false,
    fallbackPosition: { x: 0.5, y: 0.5, scale: 1.0 },
  },
  {
    id: 'alien-glow',
    name: 'Alien Glow',
    type: 'alien_theme',
    emoji: '\uD83D\uDC7D',
    color: '#2ED573',
    requiresFaceTracking: true,
    fallbackPosition: { x: 0.5, y: 0.4, scale: 0.6 },
  },
  {
    id: 'particle-stars',
    name: 'Particle Stars',
    type: 'particle',
    emoji: '\u2728',
    color: '#FFD700',
    requiresFaceTracking: false,
    fallbackPosition: { x: 0.5, y: 0.5, scale: 1.0 },
  },
  {
    id: 'beauty',
    name: 'Beauty',
    type: 'beauty',
    emoji: '\uD83D\uDC8E',
    color: '#FF6EB4',
    requiresFaceTracking: true,
    fallbackPosition: { x: 0.5, y: 0.4, scale: 0.6 },
  },
  {
    id: 'neon-outline',
    name: 'Neon Outline',
    type: 'color_overlay',
    emoji: '\uD83D\uDD25',
    color: '#00D2FF',
    requiresFaceTracking: true,
    fallbackPosition: { x: 0.5, y: 0.4, scale: 0.6 },
  },
  {
    id: 'cybernetic-mask',
    name: 'Cybernetic Mask',
    type: 'alien_theme',
    emoji: '\uD83E\uDD16',
    color: '#A855F7',
    requiresFaceTracking: true,
    fallbackPosition: { x: 0.5, y: 0.4, scale: 0.6 },
  },
];

interface ARLensCarouselProps {
  activeLens: ARLensConfig | null;
  onLensSelect: (lens: ARLensConfig | null) => void;
}

/**
 * ARLensCarousel — horizontally scrollable lens picker with 7 lens options.
 * Uses Tailwind overflow-x-auto with scroll-snap for smooth scrolling.
 * Tapping a lens selects it; tapping again deselects.
 */
export function ARLensCarousel({ activeLens, onLensSelect }: ARLensCarouselProps) {
  return (
    <div className="w-full px-2">
      <div
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-2 no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {AR_LENSES.map((lens) => {
          const isActive = activeLens?.id === lens.id;
          return (
            <button
              key={lens.id}
              onClick={() => onLensSelect(isActive ? null : lens)}
              className={`
                flex-shrink-0 snap-center flex flex-col items-center gap-1
                transition-all duration-200
              `}
              aria-label={`Select ${lens.name} lens`}
              aria-pressed={isActive}
            >
              {/* Thumbnail circle */}
              <div
                className={`
                  w-14 h-14 rounded-full flex items-center justify-center text-2xl
                  border-2 transition-all duration-200
                  ${
                    isActive
                      ? 'border-white scale-110 shadow-lg shadow-white/30'
                      : 'border-white/30 hover:border-white/60'
                  }
                `}
                style={{
                  backgroundColor: isActive ? lens.color : `${lens.color}44`,
                }}
              >
                {lens.emoji}
              </div>
              {/* Lens name */}
              <span
                className={`
                  text-[10px] font-medium text-center w-16 truncate
                  ${isActive ? 'text-white' : 'text-white/60'}
                `}
              >
                {lens.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
