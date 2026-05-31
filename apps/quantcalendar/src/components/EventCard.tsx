'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import type { CalendarEvent } from '../hooks/useEvents';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

export const EventCard = memo(function EventCard({
  event,
  onClick,
  compact = false,
}: EventCardProps) {
  const startTime = new Date(event.start).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(event.end).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (compact) {
    return (
      <motion.button
        onClick={() => onClick?.(event)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', ...spring.snappy }}
        className="w-full text-left text-xs px-1.5 py-1 rounded truncate min-h-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
        style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
        aria-label={`${event.title} at ${startTime}`}
      >
        <span className="font-medium">{event.title}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={() => onClick?.(event)}
      whileHover={{ scale: 1.01, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', ...spring.snappy }}
      className="w-full text-left p-3 rounded-lg border border-[var(--quant-border)] min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
      style={{ borderLeftWidth: '4px', borderLeftColor: event.color }}
      aria-label={`${event.title}, ${startTime} to ${endTime}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{event.title}</p>
          <p className="text-xs text-[var(--quant-muted-foreground)]">
            {startTime} - {endTime}
          </p>
          {event.location && (
            <p className="text-xs text-[var(--quant-muted-foreground)] truncate mt-0.5">
              {event.location}
            </p>
          )}
        </div>
        {event.isRecurring && (
          <span
            className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0"
            aria-label="Recurring event"
          >
            &#x1F501;
          </span>
        )}
      </div>
    </motion.button>
  );
});
