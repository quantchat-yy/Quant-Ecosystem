import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIOrganizeService } from '../services/ai-organize.service';

function createMockAI() {
  return {
    infer: vi.fn(),
  };
}

function createMockPrisma() {
  return {
    file: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('AIOrganizeService', () => {
  let service: AIOrganizeService;
  let ai: ReturnType<typeof createMockAI>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    ai = createMockAI();
    prisma = createMockPrisma();
    service = new AIOrganizeService(ai as never, prisma as never);
  });

  describe('categorizeFile', () => {
    it('returns Images category for .jpg file (heuristic fallback when AI fails)', async () => {
      ai.infer.mockRejectedValue(new Error('AI unavailable'));

      const result = await service.categorizeFile('photo.jpg', 'image/jpeg', '', 'user-1');

      expect(result.category).toBe('Images');
      expect(result.suggestedFolder).toBe('/Images');
    });

    it('returns Receipts for filename with receipt keyword', async () => {
      // The receipt check happens before AI call
      const result = await service.categorizeFile(
        'receipt-2024-01-15.pdf',
        'application/pdf',
        '',
        'user-1',
      );

      expect(result.category).toBe('Receipts');
      expect(result.suggestedFolder).toBe('/Receipts');
    });

    it('uses AI response when valid JSON returned', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: JSON.stringify({
          suggestedFolder: '/Code/Projects',
          category: 'Code',
          confidence: 0.95,
        }),
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, estimatedCost: 0.01 },
        latencyMs: 500,
        cached: false,
      });

      const result = await service.categorizeFile(
        'app.ts',
        'application/typescript',
        'import express from "express"',
        'user-1',
      );

      expect(result.category).toBe('Code');
      expect(result.suggestedFolder).toBe('/Code/Projects');
      expect(result.confidence).toBe(0.95);
    });

    it('falls back to heuristic on invalid AI JSON', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: 'not valid json at all',
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 200,
        cached: false,
      });

      const result = await service.categorizeFile('document.pdf', 'application/pdf', '', 'user-1');

      expect(result.category).toBe('Documents');
      expect(result.confidence).toBe(0.7);
    });
  });

  describe('autoOrganize', () => {
    it('returns category for file', async () => {
      const file = {
        id: 'file-1',
        name: 'photo.png',
        mimeType: 'image/png',
        userId: 'user-1',
        encryptedContent: 'data',
      };
      prisma.file.findUnique.mockResolvedValue(file);
      ai.infer.mockRejectedValue(new Error('AI unavailable'));

      const result = await service.autoOrganize('file-1', 'user-1');

      expect(result.fileId).toBe('file-1');
      expect(result.category).toBe('Images');
      expect(result.movedTo).toBe('/Images');
    });

    it('throws 404 for missing file', async () => {
      prisma.file.findUnique.mockResolvedValue(null);

      await expect(service.autoOrganize('missing', 'user-1')).rejects.toThrow('File not found');
    });

    it('throws 403 for wrong user', async () => {
      const file = {
        id: 'file-1',
        name: 'photo.png',
        mimeType: 'image/png',
        userId: 'user-1',
        encryptedContent: 'data',
      };
      prisma.file.findUnique.mockResolvedValue(file);

      await expect(service.autoOrganize('file-1', 'user-2')).rejects.toThrow(
        'Not authorized to access this file',
      );
    });
  });
});
