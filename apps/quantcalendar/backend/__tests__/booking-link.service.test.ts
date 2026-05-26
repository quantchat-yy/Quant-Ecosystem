import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingLinkService } from '../services/booking-link.service';

function createMockPrisma() {
  return {
    bookingLink: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe('BookingLinkService', () => {
  let service: BookingLinkService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new BookingLinkService(prisma as never);
  });

  describe('createBookingLink', () => {
    it('creates a booking link', async () => {
      prisma.bookingLink.create.mockImplementation(
        async (args: { data: Record<string, unknown> }) => ({
          id: 'link-1',
          ...args.data,
        }),
      );

      const result = await service.createBookingLink({
        userId: 'user-1',
        slug: 'john-30min',
        title: '30 Minute Meeting',
        duration: 30,
      });

      expect(result.slug).toBe('john-30min');
      expect(result.title).toBe('30 Minute Meeting');
      expect(result.duration).toBe(30);
      expect(result.isActive).toBe(true);
      expect(result.availableDays).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('getBookingLink', () => {
    it('returns booking link by slug', async () => {
      prisma.bookingLink.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        slug: 'john-30min',
        title: '30 Minute Meeting',
        description: '',
        duration: 30,
        availableDays: JSON.stringify([1, 2, 3, 4, 5]),
        startHour: 9,
        endHour: 17,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getBookingLink('john-30min');

      expect(result.slug).toBe('john-30min');
      expect(result.duration).toBe(30);
    });

    it('throws 404 for non-existent slug', async () => {
      prisma.bookingLink.findUnique.mockResolvedValue(null);

      await expect(service.getBookingLink('nonexistent')).rejects.toThrow('Booking link not found');
    });
  });

  describe('getAvailableSlots', () => {
    it('shows booked slots as unavailable', async () => {
      prisma.bookingLink.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        slug: 'john-30min',
        title: '30 Minute Meeting',
        description: '',
        duration: 30,
        availableDays: JSON.stringify([1, 2, 3, 4, 5]),
        startHour: 9,
        endHour: 12,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Wednesday (day 3)
      const date = new Date('2024-01-17');

      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-17T10:00:00'), endTime: new Date('2024-01-17T10:30:00') },
      ]);

      const slots = await service.getAvailableSlots('john-30min', date);

      // 9:00-12:00 in 30min slots = 6 slots
      expect(slots).toHaveLength(6);

      // The 10:00 slot should be unavailable
      const tenAmSlot = slots.find((s) => s.start.getHours() === 10 && s.start.getMinutes() === 0);
      expect(tenAmSlot).toBeDefined();
      expect(tenAmSlot!.available).toBe(false);

      // The 9:00 slot should be available
      const nineAmSlot = slots.find((s) => s.start.getHours() === 9 && s.start.getMinutes() === 0);
      expect(nineAmSlot).toBeDefined();
      expect(nineAmSlot!.available).toBe(true);
    });
  });

  describe('confirmBooking', () => {
    it('creates an event when booking is confirmed', async () => {
      prisma.bookingLink.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        slug: 'john-30min',
        title: '30 Minute Meeting',
        description: '',
        duration: 30,
        availableDays: JSON.stringify([1, 2, 3, 4, 5]),
        startHour: 9,
        endHour: 17,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.event.findMany.mockResolvedValue([]);

      prisma.event.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
        id: 'event-booked-1',
        ...args.data,
      }));

      const result = await service.confirmBooking('john-30min', new Date('2024-01-17T10:00:00'), {
        name: 'Alice',
        email: 'alice@test.com',
        notes: 'Discuss project',
      });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: '30 Minute Meeting with Alice',
          userId: 'user-1',
        }),
      });
      expect(result).toBeDefined();
    });

    it('rejects booking when slot is already taken', async () => {
      prisma.bookingLink.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'user-1',
        slug: 'john-30min',
        title: '30 Minute Meeting',
        description: '',
        duration: 30,
        availableDays: JSON.stringify([1, 2, 3, 4, 5]),
        startHour: 9,
        endHour: 17,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prisma.event.findMany.mockResolvedValue([
        {
          startTime: new Date('2024-01-17T10:00:00'),
          endTime: new Date('2024-01-17T10:30:00'),
        },
      ]);

      await expect(
        service.confirmBooking('john-30min', new Date('2024-01-17T10:00:00'), {
          name: 'Bob',
          email: 'bob@test.com',
        }),
      ).rejects.toThrow('Slot is no longer available');

      expect(prisma.event.create).not.toHaveBeenCalled();
    });
  });
});
