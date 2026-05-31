'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { Modal, Button, Badge, Avatar } from '@quant/shared-ui';
import type { CalendarEvent } from '../hooks/useEvents';

type RsvpStatus = 'yes' | 'no' | 'maybe' | null;
type ReminderOption = '5min' | '15min' | '30min' | '1hr' | '1day';

interface Attendee {
  id: string;
  name: string;
  avatarUrl?: string;
  status: 'accepted' | 'declined' | 'maybe' | 'pending';
}

const EVENT_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#8E24AA', '#F4511E'];

const REMINDER_OPTIONS: { value: ReminderOption; label: string }[] = [
  { value: '5min', label: '5 minutes before' },
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hr', label: '1 hour before' },
  { value: '1day', label: '1 day before' },
];

const MOCK_ATTENDEES: Attendee[] = [
  { id: '1', name: 'Alice Chen', status: 'accepted' },
  { id: '2', name: 'Bob Smith', status: 'maybe' },
  { id: '3', name: 'Carol Davis', status: 'pending' },
];

interface EventDetailModalProps {
  open: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

function getStatusColor(status: Attendee['status']): string {
  switch (status) {
    case 'accepted':
      return 'bg-green-500';
    case 'declined':
      return 'bg-red-500';
    case 'maybe':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
}

export function EventDetailModal({
  open,
  event,
  onClose,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  const [rsvp, setRsvp] = useState<RsvpStatus>(null);
  const [reminder, setReminder] = useState<ReminderOption>('15min');
  const [selectedColor, setSelectedColor] = useState<string>(event?.color ?? EVENT_COLORS[0]);

  if (!event) return null;

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const timeDisplay = `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const dateDisplay = startDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal isOpen={open} onClose={onClose} title={event.title} size="lg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', ...spring.snappy }}
        className="space-y-5"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{event.title}</h2>
            <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">{dateDisplay}</p>
            <p className="text-sm text-[var(--quant-muted-foreground)]">{timeDisplay}</p>
          </div>
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedColor }}
            aria-label={`Event color: ${selectedColor}`}
          />
        </div>

        {event.description && (
          <p className="text-sm text-[var(--quant-foreground)]">{event.description}</p>
        )}

        {event.location && (
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden="true">
              &#x1F4CD;
            </span>
            <span className="text-sm">{event.location}</span>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--quant-primary)] hover:underline"
              aria-label={`Open ${event.location} in maps`}
            >
              Map
            </a>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm" aria-hidden="true">
            &#x1F4F9;
          </span>
          <Button variant="ghost" size="sm" aria-label="Join video call" className="min-h-[36px]">
            Join Video Call
          </Button>
        </div>

        {/* RSVP */}
        <div className="space-y-2">
          <p className="text-sm font-medium">RSVP</p>
          <div className="flex gap-2">
            {(['yes', 'no', 'maybe'] as const).map((status) => (
              <motion.div
                key={status}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', ...spring.snappy }}
              >
                <Button
                  variant={rsvp === status ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setRsvp(status)}
                  aria-pressed={rsvp === status}
                  aria-label={`RSVP ${status}`}
                  className="min-h-[36px] capitalize"
                >
                  {status}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Reminder */}
        <div className="space-y-2">
          <label htmlFor="event-reminder" className="text-sm font-medium block">
            Reminder
          </label>
          <select
            id="event-reminder"
            value={reminder}
            onChange={(e) => setReminder(e.target.value as ReminderOption)}
            className="w-full rounded-md border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm min-h-[36px]"
            aria-label="Set reminder time"
          >
            {REMINDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Attendees */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Attendees ({MOCK_ATTENDEES.length})</p>
          <ul className="space-y-2" aria-label="Attendee list">
            {MOCK_ATTENDEES.map((attendee) => (
              <li key={attendee.id} className="flex items-center gap-2">
                <Avatar name={attendee.name} src={attendee.avatarUrl} size="xs" />
                <span className="text-sm flex-1">{attendee.name}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${getStatusColor(attendee.status)}`}
                  aria-label={`Status: ${attendee.status}`}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Color Category */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Color Category</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Select event color">
            {EVENT_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  selectedColor === color
                    ? 'border-[var(--quant-foreground)] scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Color ${color}`}
                aria-pressed={selectedColor === color}
                role="radio"
                aria-checked={selectedColor === color}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-[var(--quant-border)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit?.(event)}
            className="min-h-[44px] flex-1"
            aria-label="Edit event"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete?.(event.id)}
            className="min-h-[44px] flex-1 bg-[var(--quant-destructive)] hover:bg-[var(--quant-destructive)]/90 text-white"
            aria-label="Delete event"
          >
            Delete
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
}
