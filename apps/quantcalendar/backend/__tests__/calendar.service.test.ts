import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService } from '../services/calendar.service';

function createMockPrisma() {
  return {
    calendar: {
      findMany: vi.fn(),
      create: vi.fn(),
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
});
