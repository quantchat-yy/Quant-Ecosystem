'use client';

import { useMemo } from 'react';

interface MiniCalendarProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function MiniCalendar({
  currentDate,
  selectedDate,
  onDateSelect,
  onMonthChange,
}: MiniCalendarProps) {
  const today = useMemo(() => new Date(), []);

  const daysInMonth = useMemo(() => {
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
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isSelected = (date: Date) =>
    date.getDate() === selectedDate.getDate() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear();

  const handlePrevMonth = () => {
    const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    onMonthChange(next);
  };

  const monthLabel = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="w-full" role="grid" aria-label={`Calendar for ${monthLabel}`}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handlePrevMonth}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-[var(--quant-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
          aria-label="Previous month"
        >
          &#9664;
        </button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <button
          onClick={handleNextMonth}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-[var(--quant-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
          aria-label="Next month"
        >
          &#9654;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-xs font-medium text-[var(--quant-muted-foreground)] py-1"
            role="columnheader"
          >
            {day}
          </div>
        ))}
        {daysInMonth.map(({ date, isCurrentMonth }, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(date)}
            className={`text-xs p-1 rounded-full w-7 h-7 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)] ${
              !isCurrentMonth ? 'text-[var(--quant-muted-foreground)] opacity-50' : ''
            } ${isToday(date) ? 'bg-[var(--quant-primary)] text-white font-bold' : ''} ${
              isSelected(date) && !isToday(date)
                ? 'bg-[var(--quant-muted)] font-semibold ring-1 ring-[var(--quant-primary)]'
                : ''
            } ${!isToday(date) && !isSelected(date) ? 'hover:bg-[var(--quant-muted)]' : ''}`}
            aria-label={date.toLocaleDateString()}
            aria-current={isToday(date) ? 'date' : undefined}
            aria-selected={isSelected(date)}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
