import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContactService } from '../services/contact.service';

function createMockPrisma() {
  return {
    contact: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('ContactService — frequency tracking', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: ContactService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ContactService(prisma as never);
  });

  describe('recordInteraction', () => {
    it('upserts keyed by (userId,email): create freq=1, update increments', async () => {
      prisma.contact.upsert.mockResolvedValue({ id: 'c1', frequency: 1 });
      await service.recordInteraction('u1', '  Alice@Example.com  ', 'Alice');

      const arg = prisma.contact.upsert.mock.calls[0]![0] as {
        where: Record<string, unknown>;
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      };
      expect(arg.where).toEqual({ userId_email: { userId: 'u1', email: 'Alice@Example.com' } });
      expect(arg.create).toMatchObject({
        userId: 'u1',
        email: 'Alice@Example.com',
        frequency: 1,
        name: 'Alice',
      });
      expect(arg.update).toMatchObject({ frequency: { increment: 1 }, name: 'Alice' });
    });

    it('falls back to email as name when no name is given', async () => {
      prisma.contact.upsert.mockResolvedValue({ id: 'c1' });
      await service.recordInteraction('u1', 'bob@example.com');
      const arg = prisma.contact.upsert.mock.calls[0]![0] as {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      };
      expect(arg.create).toMatchObject({ name: 'bob@example.com' });
      // no name refresh on update when none provided
      expect(arg.update).not.toHaveProperty('name');
    });

    it('rejects a blank email', async () => {
      await expect(service.recordInteraction('u1', '   ')).rejects.toMatchObject({
        code: 'INVALID_EMAIL',
      });
      expect(prisma.contact.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getFrequentContacts', () => {
    it('orders by frequency desc and clamps the limit', async () => {
      prisma.contact.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const out = await service.getFrequentContacts('u1', 999);
      expect(out).toHaveLength(2);
      const arg = prisma.contact.findMany.mock.calls[0]![0] as {
        where: Record<string, unknown>;
        orderBy: unknown;
        take: number;
      };
      expect(arg.where).toEqual({ userId: 'u1' });
      expect(arg.take).toBe(100); // clamped from 999
      expect(arg.orderBy).toEqual([{ frequency: 'desc' }, { updatedAt: 'desc' }, { name: 'asc' }]);
    });
  });
});
