import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AISummarizeFileService } from '../services/ai-summarize-file.service';

function createMockAI() {
  return {
    infer: vi.fn(),
  };
}

describe('AISummarizeFileService', () => {
  let service: AISummarizeFileService;
  let ai: ReturnType<typeof createMockAI>;

  beforeEach(() => {
    ai = createMockAI();
    service = new AISummarizeFileService(ai as never);
  });

  describe('summarizeFile', () => {
    it('returns summary and key points from valid AI response', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: JSON.stringify({
          summary: 'This document explains the architecture of a microservices system.',
          keyPoints: ['Uses event-driven design', 'Supports horizontal scaling', 'Has 5 services'],
          fileType: 'text document',
          wordCount: 250,
        }),
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, estimatedCost: 0.01 },
        latencyMs: 600,
        cached: false,
      });

      const result = await service.summarizeFile(
        {
          fileId: 'file-1',
          content: 'This is a document about microservices architecture...',
          mimeType: 'text/plain',
          fileName: 'architecture.txt',
        },
        'user-1',
      );

      expect(result.summary).toContain('microservices');
      expect(result.keyPoints).toHaveLength(3);
      expect(result.fileType).toBe('text document');
      expect(result.wordCount).toBe(250);
    });

    it('throws AI_PARSE_ERROR on invalid JSON', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: 'this is not valid JSON at all',
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 200,
        cached: false,
      });

      await expect(
        service.summarizeFile(
          {
            fileId: 'file-1',
            content: 'test content',
            mimeType: 'text/plain',
            fileName: 'test.txt',
          },
          'user-1',
        ),
      ).rejects.toThrow('Failed to parse AI summarize response');
    });

    it('throws AI_VALIDATION_ERROR on wrong schema', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: JSON.stringify({ title: 'Missing required fields' }),
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 200,
        cached: false,
      });

      await expect(
        service.summarizeFile(
          {
            fileId: 'file-1',
            content: 'test content',
            mimeType: 'text/plain',
            fileName: 'test.txt',
          },
          'user-1',
        ),
      ).rejects.toThrow('AI returned invalid summarize result');
    });
  });
});
