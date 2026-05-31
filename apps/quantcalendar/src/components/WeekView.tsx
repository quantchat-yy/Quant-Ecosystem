'use client';

import { useMemo, useState, useCallback } from 'react';
import type { CalendarEvent } from '../hooks/useEvents';
import { EventCard } from './EventCard';

interface WeekViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: (start: Date, end: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({ events, currentDate, onEventClick, onCreateEvent }: WeekViewProps) {
  const today = useMemo(() => new Date(), []);
  const [dragStart, setDragStart] = useState<{ day: number; hour: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number } | null>(null);

  const handleCellMouseDown = useCallback((dayIndex: number, hour: number) => {
    setDragStart({ day: dayIndex, hour });
    setDragEnd({ day: dayIndex, hour });
  }, []);

  const handleCellMouseEnter = useCallback(
    (dayIndex: number, hour: number) => {
      if (dragStart && dayIndex === dragStart.day) {
        setDragEnd({ day: dayIndex, hour });
      }
    },
    [dragStart],
  );

  const handleMouseUp = useCallback(() => {
    if (dragStart && dragEnd && onCreateEvent) {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + dragStart.day);

      const startHour = Math.min(dragStart.hour, dragEnd.hour);
      const endHour = Math.max(dragStart.hour, dragEnd.hour) + 1;

      const start = new Date(day);
      start.setHours(startHour, 0, 0, 0);
      const end = new Date(day);
      end.setHours(endHour, 0, 0, 0);

      onCreateEvent(start, end);
    }
    setDragStart(null);
    setDragEnd(null);
  }, [dragStart, dragEnd, onCreateEvent, currentDate]);

  const isInDragRange = useCallback(
    (dayIndex: number, hour: number) => {
      if (!dragStart || !dragEnd) return false;
      if (dayIndex !== dragStart.day) return false;
      const minHour = Math.min(dragStart.hour, dragEnd.hour);
      const maxHour = Math.max(dragStart.hour, dragEnd.hour);
      return hour >= minHour && hour <= maxHour;
    },
    [dragStart, dragEnd],
  );

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const getEventsForDayAndHour = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.start);
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear() &&
        eventStart.getHours() === hour
      );
    });
  };

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  return (
    <div
      className="flex flex-col h-full overflow-auto"
      role="grid"
      aria-label="Week calendar view"
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setDragStart(null);
        setDragEnd(null);
      }}
    >
      <div className="sticky top-0 z-10 bg-[var(--quant-background)] border-b border-[var(--quant-border)]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          <div className="p-2" aria-hidden="true" />
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-2 text-center border-l border-[var(--quant-border)] ${
                isToday(day) ? 'bg-blue-50 dark:bg-blue-950' : ''
              }`}
              role="columnheader"
            >
              <div className="text-xs text-[var(--quant-muted-foreground)]">
                {day.toLocaleString('default', { weekday: 'short' })}
              </div>
              <div
                className={`text-lg font-semibold ${
                  isToday(day)
                    ? 'bg-quant-primary text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto'
                    : ''
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1">
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[48px]" role="row">
            <div className="text-xs text-[var(--quant-muted-foreground)] p-1 text-right pr-2 border-r border-[var(--quant-border)]">
              {formatHour(hour)}
            </div>
            {weekDays.map((day, dayIndex) => {
              const hourEvents = getEventsForDayAndHour(day, hour);
              return (
                <div
                  key={dayIndex}
                  className={`border-l border-b border-[var(--quant-border)] p-0.5 relative ${
                    isInDragRange(dayIndex, hour) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                  }`}
                  role="gridcell"
                  aria-label={`${day.toLocaleDateString()} ${formatHour(hour)}`}
                  onMouseDown={() => handleCellMouseDown(dayIndex, hour)}
                  onMouseEnter={() => handleCellMouseEnter(dayIndex, hour)}
                >
                  {hourEvents.map((event) => (
                    <EventCard key={event.id} event={event} onClick={onEventClick} compact />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
