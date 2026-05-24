// ============================================================================
// QuantMail - Calendar Page (Full Rewrite)
// Month/week/day views, event creation, recurring events, drag-to-reschedule
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  attendees: { email: string; name: string; status: 'accepted' | 'declined' | 'tentative' | 'pending' }[];
  category: 'meeting' | 'personal' | 'travel' | 'deadline' | 'reminder' | 'social';
  color: string;
  isAllDay: boolean;
  recurrence?: { pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'; interval: number; endDate?: string; daysOfWeek?: number[] };
  videoCallUrl?: string;
  reminders: { type: 'email' | 'notification'; minutes: number }[];
  isRecurring: boolean;
  organizer: { name: string; email: string };
}

interface CreateEventForm {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  attendees: string;
  category: string;
  isAllDay: boolean;
  recurrencePattern: string;
  recurrenceInterval: number;
  addVideoCall: boolean;
  reminderMinutes: number;
}

type ViewMode = 'month' | 'week' | 'day';

interface CalendarPageProps {
  userId?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  meeting: '#4285f4',
  personal: '#0f9d58',
  travel: '#f4b400',
  deadline: '#db4437',
  reminder: '#ab47bc',
  social: '#00acc1',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const CalendarPage: React.FC<CalendarPageProps> = ({ userId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateEventForm>({
    title: '', description: '', startDate: '', startTime: '09:00', endDate: '', endTime: '10:00',
    location: '', attendees: '', category: 'meeting', isAllDay: false,
    recurrencePattern: 'none', recurrenceInterval: 1, addVideoCall: false, reminderMinutes: 15
  });
  const [creating, setCreating] = useState<boolean>(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const params = new URLSearchParams({
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      });
      const response = await fetch(`/api/calendar/events?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreateEvent = useCallback(async () => {
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      const startTime = createForm.isAllDay ? `${createForm.startDate}T00:00:00` : `${createForm.startDate}T${createForm.startTime}:00`;
      const endTime = createForm.isAllDay ? `${createForm.endDate || createForm.startDate}T23:59:59` : `${createForm.endDate || createForm.startDate}T${createForm.endTime}:00`;
      const payload: Record<string, unknown> = {
        title: createForm.title, description: createForm.description,
        startTime, endTime, location: createForm.location,
        attendees: createForm.attendees.split(',').map(e => e.trim()).filter(Boolean),
        category: createForm.category, isAllDay: createForm.isAllDay,
        addVideoCall: createForm.addVideoCall, reminderMinutes: createForm.reminderMinutes
      };
      if (createForm.recurrencePattern !== 'none') {
        payload.recurrence = { pattern: createForm.recurrencePattern, interval: createForm.recurrenceInterval };
      }
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to create event');
      const newEvent = await response.json();
      setEvents(prev => [...prev, newEvent]);
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', startDate: '', startTime: '09:00', endDate: '', endTime: '10:00', location: '', attendees: '', category: 'meeting', isAllDay: false, recurrencePattern: 'none', recurrenceInterval: 1, addVideoCall: false, reminderMinutes: 15 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setCreating(false);
    }
  }, [createForm]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  }, []);

  const handleDragStart = useCallback((eventId: string) => { setDraggedEvent(eventId); }, []);

  const handleDrop = useCallback(async (date: Date) => {
    if (!draggedEvent) return;
    const event = events.find(e => e.id === draggedEvent);
    if (!event) return;
    const oldStart = new Date(event.startTime);
    const oldEnd = new Date(event.endTime);
    const diff = oldEnd.getTime() - oldStart.getTime();
    const newStart = new Date(date);
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes());
    const newEnd = new Date(newStart.getTime() + diff);
    try {
      await fetch(`/api/calendar/events/${draggedEvent}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() })
      });
      setEvents(prev => prev.map(e => e.id === draggedEvent ? { ...e, startTime: newStart.toISOString(), endTime: newEnd.toISOString() } : e));
    } catch (err) {
      console.error('Failed to reschedule:', err);
    }
    setDraggedEvent(null);
  }, [draggedEvent, events]);

  const navigatePrev = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else d.setDate(d.getDate() - 1);
      return d;
    });
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else d.setDate(d.getDate() + 1);
      return d;
    });
  }, [viewMode]);

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => {
      const eventDate = new Date(e.startTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  }, [events]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  if (error && events.length === 0) {
    return (
      <div className="calendar-error">
        <h2>Calendar Error</h2>
        <p>{error}</p>
        <button onClick={fetchEvents}>Retry</button>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <div className="calendar-nav">
          <button onClick={navigatePrev} className="nav-btn">&lt;</button>
          <h2>
            {viewMode === 'day' ? `${DAYS[currentDate.getDay()]}, ${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`
              : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
          </h2>
          <button onClick={navigateNext} className="nav-btn">&gt;</button>
          <button onClick={() => setCurrentDate(new Date())} className="today-btn">Today</button>
        </div>
        <div className="view-toggle">
          <button onClick={() => setViewMode('month')} className={viewMode === 'month' ? 'active' : ''}>Month</button>
          <button onClick={() => setViewMode('week')} className={viewMode === 'week' ? 'active' : ''}>Week</button>
          <button onClick={() => setViewMode('day')} className={viewMode === 'day' ? 'active' : ''}>Day</button>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="create-event-btn">+ Create Event</button>
      </header>

      {loading ? (
        <div className="calendar-loading"><div className="loading-spinner">Loading calendar...</div></div>
      ) : (
        <div className="calendar-grid-container">
          {viewMode === 'month' && (
            <div className="month-view">
              <div className="day-headers">{DAYS_SHORT.map(d => <div key={d} className="day-header">{d}</div>)}</div>
              <div className="month-grid">
                {monthDays.map(({ date, isCurrentMonth }, idx) => {
                  const dayEvents = getEventsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div key={idx} className={`month-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(date)} onClick={() => { setCurrentDate(date); setViewMode('day'); }}>
                      <span className="cell-date">{date.getDate()}</span>
                      <div className="cell-events">
                        {dayEvents.slice(0, 3).map(event => (
                          <div key={event.id} className="event-chip" style={{ backgroundColor: CATEGORY_COLORS[event.category] || '#4285f4' }} draggable onDragStart={() => handleDragStart(event.id)} onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}>
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && <span className="more-events">+{dayEvents.length - 3} more</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="week-view">
              <div className="week-header">
                <div className="time-gutter"></div>
                {weekDays.map(date => (
                  <div key={date.toISOString()} className={`week-day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                    <span className="day-name">{DAYS_SHORT[date.getDay()]}</span>
                    <span className="day-num">{date.getDate()}</span>
                  </div>
                ))}
              </div>
              <div className="week-body">
                {hours.map(hour => (
                  <div key={hour} className="week-row">
                    <div className="time-label">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</div>
                    {weekDays.map(date => {
                      const cellEvents = getEventsForDate(date).filter(e => new Date(e.startTime).getHours() === hour);
                      return (
                        <div key={date.toISOString()} className="week-cell" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(date)}>
                          {cellEvents.map(event => (
                            <div key={event.id} className="week-event" style={{ backgroundColor: CATEGORY_COLORS[event.category] }} draggable onDragStart={() => handleDragStart(event.id)} onClick={() => setSelectedEvent(event)}>
                              <span className="event-time">{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="event-title">{event.title}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="day-view">
              {hours.map(hour => {
                const hourEvents = getEventsForDate(currentDate).filter(e => new Date(e.startTime).getHours() === hour);
                return (
                  <div key={hour} className="day-row">
                    <div className="time-label">{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</div>
                    <div className="day-cell" onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(currentDate)}>
                      {hourEvents.map(event => (
                        <div key={event.id} className="day-event" style={{ backgroundColor: CATEGORY_COLORS[event.category] }} draggable onDragStart={() => handleDragStart(event.id)} onClick={() => setSelectedEvent(event)}>
                          <div className="event-time">{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div className="event-title">{event.title}</div>
                          {event.location && <div className="event-location">{event.location}</div>}
                          {event.videoCallUrl && <a href={event.videoCallUrl} className="join-call-btn">Join Call</a>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedEvent && (
        <div className="event-detail-modal" onClick={() => setSelectedEvent(null)}>
          <div className="event-detail" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ borderLeft: `4px solid ${CATEGORY_COLORS[selectedEvent.category]}`, paddingLeft: '12px' }}>{selectedEvent.title}</h3>
            <p className="event-time-range">{new Date(selectedEvent.startTime).toLocaleString()} - {new Date(selectedEvent.endTime).toLocaleString()}</p>
            {selectedEvent.location && <p className="event-location-detail">Location: {selectedEvent.location}</p>}
            {selectedEvent.description && <p className="event-description">{selectedEvent.description}</p>}
            {selectedEvent.attendees.length > 0 && (
              <div className="event-attendees">
                <h4>Attendees ({selectedEvent.attendees.length})</h4>
                {selectedEvent.attendees.map(a => (
                  <div key={a.email} className="attendee-item">
                    <span>{a.name || a.email}</span>
                    <span className={`attendee-status ${a.status}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedEvent.isRecurring && <p className="recurrence-info">Recurring event</p>}
            {selectedEvent.videoCallUrl && <a href={selectedEvent.videoCallUrl} className="join-call-link">Join Video Call</a>}
            <div className="event-actions">
              <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="delete-btn">Delete</button>
              <button onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-event-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Event</h2>
            <div className="form-group"><label>Title *</label><input type="text" value={createForm.title} onChange={(e) => setCreateForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title" /></div>
            <div className="form-row">
              <div className="form-group"><label>Start Date</label><input type="date" value={createForm.startDate} onChange={(e) => setCreateForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              {!createForm.isAllDay && <div className="form-group"><label>Start Time</label><input type="time" value={createForm.startTime} onChange={(e) => setCreateForm(p => ({ ...p, startTime: e.target.value }))} /></div>}
              <div className="form-group"><label>End Date</label><input type="date" value={createForm.endDate} onChange={(e) => setCreateForm(p => ({ ...p, endDate: e.target.value }))} /></div>
              {!createForm.isAllDay && <div className="form-group"><label>End Time</label><input type="time" value={createForm.endTime} onChange={(e) => setCreateForm(p => ({ ...p, endTime: e.target.value }))} /></div>}
            </div>
            <label className="checkbox-label"><input type="checkbox" checked={createForm.isAllDay} onChange={(e) => setCreateForm(p => ({ ...p, isAllDay: e.target.checked }))} /> All day</label>
            <div className="form-group"><label>Location</label><input type="text" value={createForm.location} onChange={(e) => setCreateForm(p => ({ ...p, location: e.target.value }))} placeholder="Add location" /></div>
            <div className="form-group"><label>Attendees (comma-separated emails)</label><input type="text" value={createForm.attendees} onChange={(e) => setCreateForm(p => ({ ...p, attendees: e.target.value }))} placeholder="email1@example.com, email2@example.com" /></div>
            <div className="form-row">
              <div className="form-group"><label>Category</label><select value={createForm.category} onChange={(e) => setCreateForm(p => ({ ...p, category: e.target.value }))}>
                {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
              <div className="form-group"><label>Repeat</label><select value={createForm.recurrencePattern} onChange={(e) => setCreateForm(p => ({ ...p, recurrencePattern: e.target.value }))}>
                <option value="none">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select></div>
            </div>
            <div className="form-row">
              <label className="checkbox-label"><input type="checkbox" checked={createForm.addVideoCall} onChange={(e) => setCreateForm(p => ({ ...p, addVideoCall: e.target.checked }))} /> Add video call</label>
              <div className="form-group"><label>Reminder</label><select value={createForm.reminderMinutes} onChange={(e) => setCreateForm(p => ({ ...p, reminderMinutes: Number(e.target.value) }))}>
                <option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={1440}>1 day</option>
              </select></div>
            </div>
            <div className="form-group"><label>Description</label><textarea value={createForm.description} onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button onClick={handleCreateEvent} disabled={creating || !createForm.title.trim()}>{creating ? 'Creating...' : 'Create Event'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
