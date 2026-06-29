import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService } from '../services/calendar.service';

function createMockPrisma() {
  return {
    calendar: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new CalendarService(prisma as never);
  });

  describe('listCalendars', () => {
    it('auto-provisions a Primary calendar when the user has none', async () => {
      prisma.calendar.findMany.mockResolvedValue([]);
      prisma.calendar.create.mockResolvedValue({
        id: 'c1',
        userId: 'u1',
        name: 'Primary',
        color: '#fffc00',
        isPrimary: true,
      });

      const result = await service.listCalendars('u1');

      expect(prisma.calendar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1', name: 'Primary', isPrimary: true }),
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.isPrimary).toBe(true);
    });

    it('returns existing calendars without provisioning', async () => {
      prisma.calendar.findMany.mockResolvedValue([
        { id: 'c1', userId: 'u1', name: 'Primary', color: null, isPrimary: true },
        { id: 'c2', userId: 'u1', name: 'Work', color: '#00f', isPrimary: false },
      ]);

      const result = await service.listCalendars('u1');

      expect(prisma.calendar.create).not.toHaveBeenCalled();
      expect(result.map((c) => c.name)).toEqual(['Primary', 'Work']);
    });
  });

  describe('createCalendar', () => {
    it('creates a non-primary named calendar', async () => {
      prisma.calendar.create.mockResolvedValue({
        id: 'c3',
        userId: 'u1',
        name: 'Personal',
        color: '#abc',
        isPrimary: false,
      });

      const result = await service.createCalendar('u1', { name: 'Personal', color: '#abc' });

      expect(result).toEqual({
        id: 'c3',
        userId: 'u1',
        name: 'Personal',
        color: '#abc',
        isPrimary: false,
      });
    });
  });

  describe('updateCalendar', () => {
    it('updates only the provided fields', async () => {
      prisma.calendar.findUnique.mockResolvedValue({
        id: 'c1',
        userId: 'u1',
        name: 'Work',
        color: '#000',
        isPrimary: false,
      });
      prisma.calendar.update.mockResolvedValue({
        id: 'c1',
        userId: 'u1',
        name: 'Work Stuff',
        color: '#000',
        isPrimary: false,
      });

      const result = await service.updateCalendar('u1', 'c1', { name: 'Work Stuff' });

      expect(prisma.calendar.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { name: 'Work Stuff' },
      });
      expect(result.name).toBe('Work Stuff');
    });

    it('throws CALENDAR_NOT_FOUND when the calendar does not exist', async () => {
      prisma.calendar.findUnique.mockResolvedValue(null);

      await expect(service.updateCalendar('u1', 'missing', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
        code: 'CALENDAR_NOT_FOUND',
      });
      expect(prisma.calendar.update).not.toHaveBeenCalled();
    });

    it('throws UNAUTHORIZED when the caller does not own the calendar', async () => {
      prisma.calendar.findUnique.mockResolvedValue({
        id: 'c1',
        userId: 'other',
        name: 'Work',
        color: null,
        isPrimary: false,
      });

      await expect(service.updateCalendar('u1', 'c1', { name: 'X' })).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED',
      });
      expect(prisma.calendar.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteCalendar', () => {
    it('refuses to delete the primary calendar', async () => {
      prisma.calendar.findUnique.mockResolvedValue({
        id: 'c1',
        userId: 'u1',
        name: 'Primary',
        color: null,
        isPrimary: true,
      });

      await expect(service.deleteCalendar('u1', 'c1')).rejects.toMatchObject({
        statusCode: 400,
        code: 'CANNOT_DELETE_PRIMARY',
      });
      expect(prisma.calendar.delete).not.toHaveBeenCalled();
    });

    it('deletes a non-primary owned calendar', async () => {
      prisma.calendar.findUnique.mockResolvedValue({
        id: 'c2',
        userId: 'u1',
        name: 'Work',
        color: null,
        isPrimary: false,
      });
      prisma.calendar.delete.mockResolvedValue({});

      const result = await service.deleteCalendar('u1', 'c2');

      expect(prisma.calendar.delete).toHaveBeenCalledWith({ where: { id: 'c2' } });
      expect(result).toEqual({ deleted: true });
    });

    it('throws UNAUTHORIZED when the caller does not own the calendar', async () => {
      prisma.calendar.findUnique.mockResolvedValue({
        id: 'c2',
        userId: 'other',
        name: 'Work',
        color: null,
        isPrimary: false,
      });

      await expect(service.deleteCalendar('u1', 'c2')).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED',
      });
      expect(prisma.calendar.delete).not.toHaveBeenCalled();
    });
  });

  describe('setPrimary', () => {
    it('clears the flag on other calendars and sets the target as primary', async () => {
      prisma.calendar.findUnique.mockResolvedValue({
        id: 'c2',
        userId: 'u1',
        name: 'Work',
        color: null,
        isPrimary: false,
      });
      prisma.calendar.updateMany.mockResolvedValue({ count: 1 });
      prisma.calendar.update.mockResolvedValue({
        id: 'c2',
        userId: 'u1',
        name: 'Work',
        color: null,
        isPrimary: true,
      });

      const result = await service.setPrimary('u1', 'c2');

      expect(prisma.calendar.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', NOT: { id: 'c2' } },
        data: { isPrimary: false },
      });
      expect(prisma.calendar.update).toHaveBeenCalledWith({
        where: { id: 'c2' },
        data: { isPrimary: true },
      });
      expect(result.isPrimary).toBe(true);
    });

    it('throws UNAUTHORIZED when the caller does not own the calendar', async () => {
      prisma.calendar.findUnique.mockResolvedValue({
        id: 'c2',
        userId: 'other',
        name: 'Work',
        color: null,
        isPrimary: false,
      });

      await expect(service.setPrimary('u1', 'c2')).rejects.toMatchObject({
        statusCode: 403,
        code: 'UNAUTHORIZED',
      });
      expect(prisma.calendar.updateMany).not.toHaveBeenCalled();
      expect(prisma.calendar.update).not.toHaveBeenCalled();
    });
  });
});
