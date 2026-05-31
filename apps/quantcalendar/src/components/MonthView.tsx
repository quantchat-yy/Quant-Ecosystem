'use client';

import { useMemo, useState, useCallback } from 'react';
import type { CalendarEvent } from '../hooks/useEvents';
import { EventCard } from './EventCard';

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: (start: Date, end: Date) => void;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MAX_VISIBLE_EVENTS = 3;

export function MonthView({ events, currentDate, onEventClick, onCreateEvent }: MonthViewProps) {
  const today = useMemo(() => new Date(), []);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

  const handleMouseDown = useCallback((date: Date) => {
    setDragStart(date);
    setDragEnd(date);
  }, []);

  const handleMouseEnter = useCallback(
    (date: Date) => {
      if (dragStart) {
        setDragEnd(date);
      }
    },
    [dragStart],
  );

  const handleMouseUp = useCallback(() => {
    if (dragStart && dragEnd && onCreateEvent) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      const endWithTime = new Date(end);
      endWithTime.setHours(23, 59, 59);
      onCreateEvent(start, endWithTime);
    }
    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, onCreateEvent]);

  const isInDragRange = useCallback(
    (date: Date) => {
      if (!dragStart || !dragEnd) return false;
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      return date >= start && date <= end;
    },
    [dragStart, dragEnd],
  );

  const weeks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    const weeksArr: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeksArr.push(days.slice(i, i + 7));
    }
    return weeksArr;
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  return (
    <div
      className="flex flex-col h-full"
      role="grid"
      aria-label="Month calendar view"
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setDragStart(null);
        setDragEnd(null);
      }}
    >
      <div className="grid grid-cols-7 border-b border-[var(--quant-border)]" role="row">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-[var(--quant-muted-foreground)] p-2 text-center border-r border-[var(--quant-border)] last:border-r-0"
            role="columnheader"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 3)}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 border-b border-[var(--quant-border)] last:border-b-0 min-h-[80px]"
            role="row"
          >
            {week.map(({ date, isCurrentMonth }, dayIndex) => {
              const dayEvents = getEventsForDate(date);
              const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;

              return (
                <div
                  key={dayIndex}
                  className={`p-1 border-r border-[var(--quant-border)] last:border-r-0 overflow-hidden ${
                    !isCurrentMonth ? 'bg-[var(--quant-muted)] opacity-60' : ''
                  } ${isInDragRange(date) ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  role="gridcell"
                  aria-label={date.toLocaleDateString()}
                  onMouseDown={() => handleMouseDown(date)}
                  onMouseEnter={() => handleMouseEnter(date)}
                >
                  <div className="flex justify-center mb-0.5">
                    <span
                      className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday(date) ? 'bg-quant-primary text-white font-bold' : ''
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {visibleEvents.map((event) => (
                      <EventCard key={event.id} event={event} onClick={onEventClick} compact />
                    ))}
                    {hiddenCount > 0 && (
                      <p className="text-xs text-[var(--quant-muted-foreground)] px-1">
                        +{hiddenCount} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
