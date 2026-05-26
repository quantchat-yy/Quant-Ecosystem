import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIExtractDataService } from '../services/ai-extract-data.service';

function createMockAI() {
  return {
    infer: vi.fn(),
  };
}

describe('AIExtractDataService', () => {
  let service: AIExtractDataService;
  let ai: ReturnType<typeof createMockAI>;

  beforeEach(() => {
    ai = createMockAI();
    service = new AIExtractDataService(ai as never);
  });

  describe('extractFromReceipt', () => {
    it('returns structured receipt data from valid AI response', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: JSON.stringify({
          vendor: 'Coffee Shop',
          date: '2024-01-15',
          total: 12.5,
          currency: 'USD',
          items: [
            { description: 'Latte', amount: 5.5 },
            { description: 'Muffin', amount: 4.0 },
          ],
          taxAmount: 3.0,
        }),
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 80, totalTokens: 180, estimatedCost: 0.01 },
        latencyMs: 700,
        cached: false,
      });

      const result = await service.extractFromReceipt('Receipt from Coffee Shop...', 'user-1');

      expect(result.vendor).toBe('Coffee Shop');
      expect(result.date).toBe('2024-01-15');
      expect(result.total).toBe(12.5);
      expect(result.currency).toBe('USD');
      expect(result.items).toHaveLength(2);
      expect(result.taxAmount).toBe(3.0);
    });

    it('throws AI_PARSE_ERROR on invalid JSON', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: 'not json {broken',
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 200,
        cached: false,
      });

      await expect(service.extractFromReceipt('some receipt text', 'user-1')).rejects.toThrow(
        'Failed to parse AI extract response',
      );
    });

    it('throws AI_VALIDATION_ERROR on wrong schema', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-1',
        content: JSON.stringify({ vendor: 'Shop' }),
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 200,
        cached: false,
      });

      await expect(service.extractFromReceipt('some receipt text', 'user-1')).rejects.toThrow(
        'AI returned invalid receipt extraction result',
      );
    });
  });

  describe('extractFromInvoice', () => {
    it('returns structured invoice data from valid AI response', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-2',
        content: JSON.stringify({
          invoiceNumber: 'INV-2024-001',
          vendor: 'Tech Corp',
          dueDate: '2024-02-15',
          lineItems: [
            { description: 'Web Development', quantity: 40, unitPrice: 150, total: 6000 },
            { description: 'Design Services', quantity: 10, unitPrice: 200, total: 2000 },
          ],
          subtotal: 8000,
          tax: 640,
          total: 8640,
          currency: 'USD',
        }),
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 80, totalTokens: 180, estimatedCost: 0.01 },
        latencyMs: 800,
        cached: false,
      });

      const result = await service.extractFromInvoice('Invoice from Tech Corp...', 'user-1');

      expect(result.invoiceNumber).toBe('INV-2024-001');
      expect(result.vendor).toBe('Tech Corp');
      expect(result.dueDate).toBe('2024-02-15');
      expect(result.lineItems).toHaveLength(2);
      expect(result.total).toBe(8640);
      expect(result.currency).toBe('USD');
    });

    it('throws AI_PARSE_ERROR on invalid JSON', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-2',
        content: 'invalid json response',
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 200,
        cached: false,
      });

      await expect(service.extractFromInvoice('some invoice text', 'user-1')).rejects.toThrow(
        'Failed to parse AI extract response',
      );
    });

    it('throws AI_VALIDATION_ERROR on wrong schema', async () => {
      ai.infer.mockResolvedValue({
        id: 'resp-2',
        content: JSON.stringify({ invoiceNumber: 'INV-001' }),
        model: 'gpt-4',
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, estimatedCost: 0.001 },
        latencyMs: 200,
        cached: false,
      });

      await expect(service.extractFromInvoice('some invoice text', 'user-1')).rejects.toThrow(
        'AI returned invalid invoice extraction result',
      );
    });
  });
});
