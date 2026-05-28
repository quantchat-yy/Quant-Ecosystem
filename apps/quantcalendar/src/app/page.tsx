'use client';

import { useState, useCallback } from 'react';
import { AnimatedPage, AppShell, Button, LoadingState, ErrorState } from '@quant/shared-ui';
import { useEvents } from '../hooks/useEvents';
import { useCalendars } from '../hooks/useCalendars';
import { CalendarSidebar } from '../components/CalendarSidebar';
import { CalendarGrid } from '../components/CalendarGrid';
import type { CalendarViewType } from '../components/CalendarGrid';
import { EventForm } from '../components/EventForm';
import type { CalendarEvent } from '../hooks/useEvents';

const VIEW_TABS: { id: CalendarViewType; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<CalendarViewType>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);

  const { data: events, isLoading: eventsLoading, error: eventsError, refetch } = useEvents();
  const { data: calendars, isLoading: calendarsLoading } = useCalendars();

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (currentView === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (currentView === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  }, [currentView]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (currentView === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else if (currentView === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  }, [currentView]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleMonthChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventFormOpen(true);
  }, []);

  const handleNewEvent = useCallback(() => {
    setSelectedEvent(null);
    setIsEventFormOpen(true);
  }, []);

  const handleEventFormClose = useCallback(() => {
    setIsEventFormOpen(false);
    setSelectedEvent(null);
  }, []);

  const handleEventSubmit = useCallback(() => {
    setIsEventFormOpen(false);
    setSelectedEvent(null);
  }, []);

  const getDateRangeLabel = () => {
    if (currentView === 'month') {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (currentView === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('default', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (eventsLoading || calendarsLoading) {
    return <LoadingState text="Loading calendar..." />;
  }

  if (eventsError) {
    return <ErrorState message={eventsError.message} onRetry={() => void refetch()} />;
  }

  return (
    <AppShell
      sidebar={
        <CalendarSidebar
          calendars={calendars ?? []}
          currentDate={currentDate}
          selectedDate={currentDate}
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
          onNewEvent={handleNewEvent}
        />
      }
      aria-label="QuantCalendar application"
    >
      <AnimatedPage>
        <div className="flex flex-col h-full">
          <header className="flex flex-wrap items-center gap-2 p-3 border-b border-[var(--quant-border)]">
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handlePrev} aria-label="Previous">
                &#9664;
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} aria-label="Next">
                &#9654;
              </Button>
            </div>
            <h1 className="text-lg font-semibold flex-1 min-w-0">{getDateRangeLabel()}</h1>
            <nav
              className="flex rounded-lg border border-[var(--quant-border)] overflow-hidden"
              role="tablist"
              aria-label="Calendar view"
            >
              {VIEW_TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={currentView === tab.id}
                  onClick={() => setCurrentView(tab.id)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    currentView === tab.id
                      ? 'bg-quant-primary text-white'
                      : 'hover:bg-[var(--quant-muted)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </header>
          <div className="flex-1 overflow-hidden">
            <CalendarGrid
              view={currentView}
              events={events ?? []}
              currentDate={currentDate}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
      </AnimatedPage>

      <EventForm
        open={isEventFormOpen}
        onClose={handleEventFormClose}
        onSubmit={handleEventSubmit}
        event={selectedEvent}
        calendars={calendars ?? []}
      />
    </AppShell>
  );
}
