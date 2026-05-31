'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { Button, Sidebar } from '@quant/shared-ui';
import type { SidebarItem } from '@quant/shared-ui';
import { MiniCalendar } from './MiniCalendar';
import type { Calendar } from '../hooks/useCalendars';
import type { CalendarEvent } from '../hooks/useEvents';

interface CalendarSidebarProps {
  calendars: Calendar[];
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onNewEvent: () => void;
  onToggleCalendarVisibility?: (calendarId: string) => void;
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarSidebar({
  calendars,
  currentDate,
  selectedDate,
  onDateSelect,
  onMonthChange,
  onNewEvent,
  onToggleCalendarVisibility,
  events = [],
  onEventClick,
}: CalendarSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  }, [events]);

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
                {upcomingEvents.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-[var(--quant-border)]">
                    <p className="text-xs font-medium text-[var(--quant-muted-foreground)]">
                      Upcoming
                    </p>
                    <ul className="space-y-1" aria-label="Upcoming events">
                      {upcomingEvents.map((event) => (
                        <li key={event.id}>
                          <button
                            onClick={() => onEventClick?.(event)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-[var(--quant-muted)] transition-colors text-xs min-h-[32px]"
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: event.color || '#4285F4' }}
                              aria-hidden="true"
                            />
                            <span className="truncate flex-1">{event.title}</span>
                            <span className="text-[var(--quant-muted-foreground)] flex-shrink-0">
                              {new Date(event.start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
