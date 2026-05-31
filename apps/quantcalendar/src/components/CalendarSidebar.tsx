'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { Button, Sidebar } from '@quant/shared-ui';
import type { SidebarItem } from '@quant/shared-ui';
import { MiniCalendar } from './MiniCalendar';
import type { Calendar } from '../hooks/useCalendars';

interface CalendarSidebarProps {
  calendars: Calendar[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onNewEvent: () => void;
  onToggleCalendarVisibility?: (calendarId: string) => void;
}

export function CalendarSidebar({
  calendars,
  currentDate,
  selectedDate,
  onDateSelect,
  onMonthChange,
  onNewEvent,
  onToggleCalendarVisibility,
}: CalendarSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sidebarItems: SidebarItem[] = calendars.map((cal) => ({
    id: cal.id,
    label: cal.name,
    icon: (
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{ backgroundColor: cal.color }}
        aria-hidden="true"
      />
    ),
    active: cal.isVisible,
    onClick: () => onToggleCalendarVisibility?.(cal.id),
  }));

  return (
    <AnimatePresence initial={false}>
      {!collapsed ? (
        <motion.div
          key="sidebar-expanded"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', ...spring.gentle }}
          className="overflow-hidden"
        >
          <Sidebar
            items={sidebarItems}
            header={
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">QuantCalendar</h2>
                  <button
                    onClick={() => setCollapsed(true)}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--quant-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)] md:hidden"
                    aria-label="Collapse sidebar"
                  >
                    &#x2190;
                  </button>
                </div>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={onNewEvent}
                  aria-label="Create new event"
                  className="min-h-[44px]"
                >
                  New Event
                </Button>
                <MiniCalendar
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  onDateSelect={onDateSelect}
                  onMonthChange={onMonthChange}
                />
              </div>
            }
            footer={
              <Button
                variant="secondary"
                fullWidth
                aria-label="Smart schedule with AI"
                className="min-h-[44px]"
              >
                Smart Schedule
              </Button>
            }
            aria-label="Calendar navigation"
          />
        </motion.div>
      ) : (
        <motion.div
          key="sidebar-collapsed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', ...spring.snappy }}
          className="flex flex-col items-center p-2 border-r border-[var(--quant-border)]"
        >
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--quant-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
            aria-label="Expand sidebar"
          >
            &#x2192;
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
