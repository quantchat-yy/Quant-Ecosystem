import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService } from '../services/event.service';

function createMockPrisma() {
  return {
    event: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('EventService', () => {
  let service: EventService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new EventService(prisma as never);
  });

  describe('createEvent', () => {
    it('creates an event with attendees', async () => {
      const attendees = [
        { userId: 'user-2', email: 'bob@test.com', name: 'Bob', status: 'pending' as const },
      ];

      prisma.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'event-1',
        ...args.data,
      }));

      const result = await service.createEvent({
        title: 'Team Meeting',
        description: 'Weekly sync',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        userId: 'user-1',
        attendees,
      });

      expect(result.title).toBe('Team Meeting');
      expect(result.attendees).toEqual(attendees);
      expect(result.userId).toBe('user-1');
      expect(prisma.event.create).toHaveBeenCalledTimes(1);
    });

    it('creates an event with default values', async () => {
      prisma.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'event-2',
        ...args.data,
      }));

      const result = await service.createEvent({
        title: 'Quick Call',
        startTime: new Date('2024-01-15T14:00:00Z'),
        endTime: new Date('2024-01-15T14:30:00Z'),
        userId: 'user-1',
      });

      expect(result.allDay).toBe(false);
      expect(result.status).toBe('confirmed');
      expect(result.attendees).toEqual([]);
      expect(result.reminders).toEqual([]);
    });
  });

  describe('getEvent', () => {
    it('returns event when found and user is owner', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Meeting',
        description: 'Test',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: '[]',
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(mockEvent);

      const result = await service.getEvent('event-1', 'user-1');

      expect(result.id).toBe('event-1');
      expect(result.title).toBe('Meeting');
    });

    it('throws 404 for missing event', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.getEvent('missing', 'user-1')).rejects.toThrow('Event not found');
    });

    it('throws 403 for wrong user', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        title: 'Meeting',
        userId: 'user-1',
        attendees: '[]',
        reminders: '[]',
        startTime: new Date(),
        endTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.getEvent('event-1', 'user-2')).rejects.toThrow(
        'Not authorized to access this event',
      );
    });
  });

  describe('updateEvent', () => {
    it('updates event title and description', async () => {
      const existingEvent = {
        id: 'event-1',
        title: 'Old Title',
        description: 'Old desc',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: '[]',
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.update.mockImplementation(async (args) => ({
        ...existingEvent,
        ...(args.data as Record<string, unknown>),
      }));

      const result = await service.updateEvent('event-1', 'user-1', {
        title: 'New Title',
        description: 'New desc',
      });

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New desc');
    });
  });

  describe('deleteEvent', () => {
    it('deletes the event', async () => {
      const existingEvent = {
        id: 'event-1',
        title: 'Meeting',
        description: '',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: '[]',
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.delete.mockResolvedValue(existingEvent);

      const result = await service.deleteEvent('event-1', 'user-1');

      expect(result.id).toBe('event-1');
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
    });
  });

  describe('addAttendee', () => {
    it('adds an attendee to the event', async () => {
      const existingEvent = {
        id: 'event-1',
        title: 'Meeting',
        description: '',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: '[]',
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.update.mockImplementation(async (args) => ({
        ...existingEvent,
        attendees: (args.data as Record<string, unknown>)['attendees'],
      }));

      const newAttendee = {
        userId: 'user-2',
        email: 'bob@test.com',
        name: 'Bob',
        status: 'pending' as const,
      };
      const result = await service.addAttendee('event-1', 'user-1', newAttendee);

      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0]!.userId).toBe('user-2');
    });
  });

  describe('removeAttendee', () => {
    it('removes an attendee from the event', async () => {
      const existingEvent = {
        id: 'event-1',
        title: 'Meeting',
        description: '',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: JSON.stringify([
          { userId: 'user-2', email: 'bob@test.com', name: 'Bob', status: 'accepted' },
          { userId: 'user-3', email: 'carol@test.com', name: 'Carol', status: 'pending' },
        ]),
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.update.mockImplementation(async (args) => ({
        ...existingEvent,
        attendees: (args.data as Record<string, unknown>)['attendees'],
      }));

      const result = await service.removeAttendee('event-1', 'user-1', 'user-2');

      expect(result.attendees).toHaveLength(1);
      expect(result.attendees[0]!.userId).toBe('user-3');
    });
  });

  describe('updateAttendeeStatus', () => {
    it('updates an attendee status when caller is the attendee', async () => {
      const existingEvent = {
        id: 'event-1',
        title: 'Meeting',
        description: '',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: JSON.stringify([
          { userId: 'user-2', email: 'bob@test.com', name: 'Bob', status: 'pending' },
        ]),
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.update.mockImplementation(async (args) => ({
        ...existingEvent,
        attendees: (args.data as Record<string, unknown>)['attendees'],
      }));

      const result = await service.updateAttendeeStatus('event-1', 'user-2', 'user-2', 'accepted');

      expect(result.attendees[0]!.status).toBe('accepted');
    });

    it('updates an attendee status when caller is the event owner', async () => {
      const existingEvent = {
        id: 'event-1',
        title: 'Meeting',
        description: '',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: JSON.stringify([
          { userId: 'user-2', email: 'bob@test.com', name: 'Bob', status: 'pending' },
        ]),
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);
      prisma.event.update.mockImplementation(async (args) => ({
        ...existingEvent,
        attendees: (args.data as Record<string, unknown>)['attendees'],
      }));

      const result = await service.updateAttendeeStatus('event-1', 'user-2', 'user-1', 'accepted');

      expect(result.attendees[0]!.status).toBe('accepted');
    });

    it('throws 403 when caller is neither the attendee nor event owner', async () => {
      const existingEvent = {
        id: 'event-1',
        title: 'Meeting',
        description: '',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        allDay: false,
        location: '',
        userId: 'user-1',
        attendees: JSON.stringify([
          { userId: 'user-2', email: 'bob@test.com', name: 'Bob', status: 'pending' },
        ]),
        recurrenceRule: null,
        status: 'confirmed',
        reminders: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);

      await expect(
        service.updateAttendeeStatus('event-1', 'user-2', 'user-3', 'accepted'),
      ).rejects.toThrow('Not authorized to update attendee status');
    });
  });
});
