'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { Button, Input, Badge } from '@quant/shared-ui';

interface Participant {
  id: string;
  name: string;
}

interface TimeSlot {
  time: string;
  availability: Record<string, 'available' | 'busy'>;
}

const SAMPLE_SLOTS: TimeSlot[] = [
  { time: '9:00 AM', availability: { '1': 'available', '2': 'available', '3': 'busy' } },
  { time: '10:00 AM', availability: { '1': 'available', '2': 'busy', '3': 'available' } },
  { time: '11:00 AM', availability: { '1': 'available', '2': 'available', '3': 'available' } },
  { time: '12:00 PM', availability: { '1': 'busy', '2': 'available', '3': 'busy' } },
  { time: '1:00 PM', availability: { '1': 'available', '2': 'available', '3': 'available' } },
  { time: '2:00 PM', availability: { '1': 'busy', '2': 'busy', '3': 'available' } },
  { time: '3:00 PM', availability: { '1': 'available', '2': 'available', '3': 'busy' } },
  { time: '4:00 PM', availability: { '1': 'available', '2': 'available', '3': 'available' } },
];

interface SchedulingAssistantProps {
  onClose?: () => void;
  onSelectTime?: (time: string) => void;
}

export function SchedulingAssistant({ onClose, onSelectTime }: SchedulingAssistantProps) {
  const [participants, setParticipants] = useState<Participant[]>([{ id: '1', name: 'You' }]);
  const [newParticipant, setNewParticipant] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSlots, setShowSlots] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState<string | null>(null);

  const addParticipant = () => {
    if (newParticipant.trim()) {
      setParticipants((prev) => [
        ...prev,
        { id: String(prev.length + 1), name: newParticipant.trim() },
      ]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const findSlots = () => {
    setShowSlots(true);
    setSuggestedTime(null);
  };

  const suggestBestTime = () => {
    const bestSlot = SAMPLE_SLOTS.find((slot) =>
      Object.values(slot.availability).every((s) => s === 'available'),
    );
    setSuggestedTime(bestSlot?.time ?? SAMPLE_SLOTS[0].time);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', ...spring.gentle }}
      className="bg-[var(--quant-card)] border border-[var(--quant-border)] rounded-xl p-5 space-y-4 w-full max-w-2xl"
      aria-label="Scheduling assistant"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Find Available Times</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--quant-muted)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close scheduling assistant"
          >
            &#10005;
          </button>
        )}
      </div>

      {/* Participants */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Participants</p>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <Badge key={p.id} variant="default">
              {p.name}
              {p.id !== '1' && (
                <button
                  onClick={() => removeParticipant(p.id)}
                  className="ml-1 text-xs"
                  aria-label={`Remove ${p.name}`}
                >
                  &#10005;
                </button>
              )}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            placeholder="Add participant email"
            aria-label="Participant email"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addParticipant();
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={addParticipant}
            className="min-h-[44px]"
            aria-label="Add participant"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="sched-start" className="text-sm font-medium block mb-1">
            Start Date
          </label>
          <input
            id="sched-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm min-h-[44px]"
          />
        </div>
        <div>
          <label htmlFor="sched-end" className="text-sm font-medium block mb-1">
            End Date
          </label>
          <input
            id="sched-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-[var(--quant-border)] bg-[var(--quant-background)] px-3 py-2 text-sm min-h-[44px]"
          />
        </div>
      </div>

      <Button variant="primary" size="sm" onClick={findSlots} className="min-h-[44px]">
        Find Available Times
      </Button>

      {/* Time Slots Grid */}
      {showSlots && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ type: 'spring', ...spring.gentle }}
          className="space-y-3"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Availability grid">
              <thead>
                <tr>
                  <th className="text-left p-2 text-[var(--quant-muted-foreground)]">Time</th>
                  {participants.map((p) => (
                    <th key={p.id} className="p-2 text-center text-[var(--quant-muted-foreground)]">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_SLOTS.map((slot) => (
                  <tr
                    key={slot.time}
                    className={`border-t border-[var(--quant-border)] ${
                      suggestedTime === slot.time ? 'bg-green-50 dark:bg-green-950' : ''
                    }`}
                  >
                    <td className="p-2 font-medium">{slot.time}</td>
                    {participants.map((p) => {
                      const status = slot.availability[p.id] ?? 'available';
                      return (
                        <td key={p.id} className="p-2 text-center">
                          <span
                            className={`inline-block w-4 h-4 rounded-sm ${
                              status === 'available' ? 'bg-green-500' : 'bg-red-400'
                            }`}
                            aria-label={status}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={suggestBestTime}
              className="min-h-[44px]"
            >
              Suggest Best Time
            </Button>
            {suggestedTime && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onSelectTime?.(suggestedTime)}
                className="min-h-[44px]"
              >
                Select {suggestedTime}
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
