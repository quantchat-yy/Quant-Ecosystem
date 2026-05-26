import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIDuplicateService } from '../services/ai-duplicate.service';

function createMockPrisma() {
  return {
    file: {
      findMany: vi.fn(),
    },
  };
}

describe('AIDuplicateService', () => {
  let service: AIDuplicateService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AIDuplicateService(prisma as never);
  });

  describe('computeHash', () => {
    it('produces consistent hash for same content', () => {
      const content = Buffer.from('Hello World! This is a test file with some content.');
      const hash1 = service.computeHash(content);
      const hash2 = service.computeHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('produces different hash for different content', () => {
      const contentA = Buffer.from('Hello World! This is content A with lots of data.');
      const contentB = Buffer.alloc(200, 0xff);

      const hashA = service.computeHash(contentA);
      const hashB = service.computeHash(contentB);

      expect(hashA).not.toBe(hashB);
    });
  });

  describe('compareTwoFiles', () => {
    it('returns high similarity for identical content', () => {
      const content = Buffer.from('Identical file content for comparison testing purposes.');

      const result = service.compareTwoFiles(content, content);

      expect(result.similarity).toBe(1);
      expect(result.isLikelyDuplicate).toBe(true);
    });

    it('returns low similarity for very different content', () => {
      // Create content with varied byte patterns so the perceptual hash differs
      const contentA = Buffer.alloc(256);
      for (let i = 0; i < 256; i++) {
        contentA[i] = i < 128 ? 0 : 255;
      }
      const contentB = Buffer.alloc(256);
      for (let i = 0; i < 256; i++) {
        contentB[i] = i % 2 === 0 ? 200 : 10;
      }

      const result = service.compareTwoFiles(contentA, contentB);

      expect(result.similarity).toBeLessThan(1);
      expect(result.isLikelyDuplicate).toBe(false);
    });

    it('returns isLikelyDuplicate=true for same content', () => {
      const content = Buffer.from('Same content in both files for duplicate check.');

      const result = service.compareTwoFiles(content, content);

      expect(result.isLikelyDuplicate).toBe(true);
    });
  });

  describe('findDuplicates', () => {
    it('groups files with same contentHash together', async () => {
      const sameHash = 'a'.repeat(64);
      const files = [
        {
          id: 'file-1',
          name: 'copy1.txt',
          size: 22,
          contentHash: sameHash,
          userId: 'user-1',
          isDeleted: false,
        },
        {
          id: 'file-2',
          name: 'copy2.txt',
          size: 22,
          contentHash: sameHash,
          userId: 'user-1',
          isDeleted: false,
        },
      ];
      prisma.file.findMany.mockResolvedValue(files);

      const result = await service.findDuplicates('user-1');

      expect(result.groups.length).toBeGreaterThan(0);
      expect(result.groups[0]!.files.length).toBe(2);
    });

    it('returns no groups when all files have unique hashes', async () => {
      const files = [
        {
          id: 'file-1',
          name: 'unique1.txt',
          size: 256,
          contentHash: 'a'.repeat(64),
          userId: 'user-1',
          isDeleted: false,
        },
        {
          id: 'file-2',
          name: 'unique2.txt',
          size: 256,
          contentHash: 'b'.repeat(64),
          userId: 'user-1',
          isDeleted: false,
        },
      ];
      prisma.file.findMany.mockResolvedValue(files);

      const result = await service.findDuplicates('user-1');

      expect(result.groups.length).toBe(0);
    });
  });
});
