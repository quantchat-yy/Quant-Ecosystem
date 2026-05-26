import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AICancelDetectorService } from '../services/ai-cancel-detector.service';

function createMockAI() {
  return {
    infer: vi.fn(),
  };
}

describe('AICancelDetectorService', () => {
  let service: AICancelDetectorService;
  let ai: ReturnType<typeof createMockAI>;

  beforeEach(() => {
    ai = createMockAI();
    service = new AICancelDetectorService(ai as never);
  });

  describe('detectCancellation', () => {
    it('detects "I can\'t make it" as cancellation', async () => {
      ai.infer.mockResolvedValue({
        content: JSON.stringify({
          isCancellation: true,
          confidence: 0.92,
          suggestedAction: 'reschedule',
          extractedReason: 'Unable to attend',
        }),
      });

      const result = await service.detectCancellation("I can't make it to the meeting tomorrow");

      expect(result.isCancellation).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.suggestedAction).toBe('reschedule');
    });

    it('detects "need to cancel" as cancellation', async () => {
      ai.infer.mockResolvedValue({
        content: JSON.stringify({
          isCancellation: true,
          confidence: 0.95,
          suggestedAction: 'cancel',
          extractedReason: 'Needs to cancel',
        }),
      });

      const result = await service.detectCancellation(
        'Hey, I need to cancel our meeting on Friday',
      );

      expect(result.isCancellation).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.suggestedAction).toBe('cancel');
    });

    it('does not flag normal messages', async () => {
      ai.infer.mockResolvedValue({
        content: JSON.stringify({
          isCancellation: false,
          confidence: 0.1,
          suggestedAction: 'none',
        }),
      });

      const result = await service.detectCancellation('Looking forward to our meeting!');

      expect(result.isCancellation).toBe(false);
      expect(result.suggestedAction).toBe('none');
    });
  });
});
