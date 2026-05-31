'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '@quant/brand';
import type { CalendarEvent } from '../hooks/useEvents';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';

export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda';

interface CalendarGridProps {
  view: CalendarViewType;
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarGrid({ view, events, currentDate, onEventClick }: CalendarGridProps) {
  const renderView = () => {
    switch (view) {
      case 'month':
        return <MonthView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
      case 'week':
        return <WeekView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
      case 'day':
        return <DayView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
      case 'agenda':
        return <AgendaView events={events} currentDate={currentDate} onEventClick={onEventClick} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', ...spring.snappy }}
        className="h-full"
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
}
