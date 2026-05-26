import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AvailabilityService } from '../services/availability.service';

function createMockPrisma() {
  return {
    event: {
      findMany: vi.fn(),
    },
  };
}

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AvailabilityService(prisma as never);
  });

  describe('getAvailability', () => {
    it('returns free slots when events are scattered', async () => {
      const date = new Date('2024-01-15');
      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T10:00:00'), endTime: new Date('2024-01-15T11:00:00') },
        { startTime: new Date('2024-01-15T14:00:00'), endTime: new Date('2024-01-15T15:00:00') },
      ]);

      const slots = await service.getAvailability('user-1', date, 9, 17);

      expect(slots.length).toBeGreaterThan(0);
      // Should have a slot from 9-10, 11-14, and 15-17
      expect(slots).toHaveLength(3);
      expect(slots[0]!.start.getHours()).toBe(9);
      expect(slots[0]!.end.getHours()).toBe(10);
      expect(slots[1]!.start.getHours()).toBe(11);
      expect(slots[1]!.end.getHours()).toBe(14);
      expect(slots[2]!.start.getHours()).toBe(15);
      expect(slots[2]!.end.getHours()).toBe(17);
    });

    it('returns empty when fully booked', async () => {
      const date = new Date('2024-01-15');
      prisma.event.findMany.mockResolvedValue([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T17:00:00') },
      ]);

      const slots = await service.getAvailability('user-1', date, 9, 17);

      expect(slots).toHaveLength(0);
    });
  });

  describe('checkMultiUserAvailability', () => {
    it('finds common free slots across multiple users', async () => {
      const date = new Date('2024-01-15');

      // First call for user-1
      prisma.event.findMany.mockResolvedValueOnce([
        { startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T10:00:00') },
      ]);
      // Second call for user-2
      prisma.event.findMany.mockResolvedValueOnce([
        { startTime: new Date('2024-01-15T11:00:00'), endTime: new Date('2024-01-15T12:00:00') },
      ]);

      const slots = await service.checkMultiUserAvailability(['user-1', 'user-2'], date, 30);

      // Common free: 10-11 and 12-17
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.some((s) => s.start.getHours() === 10 && s.end.getHours() === 11)).toBe(true);
    });
  });
});
