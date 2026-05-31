'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { Dialog, FormField, Input, TextArea, Select, Button } from '@quant/shared-ui';
import type { SelectOption } from '@quant/shared-ui';
import type { CalendarEvent } from '../hooks/useEvents';
import type { Calendar } from '../hooks/useCalendars';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CalendarEvent>) => void;
  event?: CalendarEvent | null;
  calendars: Calendar[];
}

const RECURRENCE_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function EventForm({ open, onClose, onSubmit, event, calendars }: EventFormProps) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [start, setStart] = useState(event?.start ?? '');
  const [end, setEnd] = useState(event?.end ?? '');
  const [calendarId, setCalendarId] = useState(event?.calendarId ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [recurrence, setRecurrence] = useState(event?.isRecurring ? 'weekly' : 'none');

  useEffect(() => {
    setTitle(event?.title ?? '');
    setDescription(event?.description ?? '');
    setStart(event?.start ?? '');
    setEnd(event?.end ?? '');
    setCalendarId(event?.calendarId ?? '');
    setLocation(event?.location ?? '');
    setRecurrence(event?.isRecurring ? 'weekly' : 'none');
  }, [event]);

  const calendarOptions: SelectOption[] = calendars.map((cal) => ({
    value: cal.id,
    label: cal.name,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...(event?.id ? { id: event.id } : {}),
      title,
      description,
      start,
      end,
      calendarId,
      location,
      isRecurring: recurrence !== 'none',
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={event ? 'Edit Event' : 'New Event'} size="lg">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', ...spring.gentle }}
          >
            <form onSubmit={handleSubmit} className="space-y-4" aria-label="Event form">
              <FormField label="Title" required htmlFor="event-title">
                <Input
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  required
                  className="min-h-[44px]"
                />
              </FormField>

              <FormField label="Description" htmlFor="event-description">
                <TextArea
                  id="event-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description"
                  rows={3}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Start" required htmlFor="event-start">
                  <Input
                    id="event-start"
                    type="text"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:MM"
                    required
                    className="min-h-[44px]"
                  />
                </FormField>

                <FormField label="End" required htmlFor="event-end">
                  <Input
                    id="event-end"
                    type="text"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:MM"
                    required
                    className="min-h-[44px]"
                  />
                </FormField>
              </div>

              <FormField label="Calendar" htmlFor="event-calendar">
                <Select
                  id="event-calendar"
                  options={calendarOptions}
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  placeholder="Select a calendar"
                />
              </FormField>

              <FormField label="Location" htmlFor="event-location">
                <Input
                  id="event-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add a location"
                  className="min-h-[44px]"
                />
              </FormField>

              <FormField label="Recurrence" htmlFor="event-recurrence">
                <Select
                  id="event-recurrence"
                  options={RECURRENCE_OPTIONS}
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                />
              </FormField>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
                >
                  {event ? 'Save Changes' : 'Create Event'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
