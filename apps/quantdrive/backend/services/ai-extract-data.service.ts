import { z } from 'zod';
import type { AIEngine } from '@quant/ai';
import { createAppError } from '@quant/server-core';

export interface ReceiptData {
  vendor: string;
  date: string;
  total: number;
  currency: string;
  items: Array<{ description: string; amount: number }>;
  taxAmount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  vendor: string;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

const ReceiptDataSchema = z.object({
  vendor: z.string(),
  date: z.string(),
  total: z.number(),
  currency: z.string(),
  items: z.array(
    z.object({
      description: z.string(),
      amount: z.number(),
    }),
  ),
  taxAmount: z.number(),
});

const InvoiceDataSchema = z.object({
  invoiceNumber: z.string(),
  vendor: z.string(),
  dueDate: z.string(),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    }),
  ),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  currency: z.string(),
});

export class AIExtractDataService {
  constructor(private readonly ai: AIEngine) {}

  async extractFromReceipt(content: string, userId: string): Promise<ReceiptData> {
    const response = await this.ai.infer({
      prompt: `Extract structured data from the following receipt content.

Receipt Content:
${content.slice(0, 3000)}

Respond ONLY with valid JSON:
{
  "vendor": "store/business name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "currency": "USD",
  "items": [{"description": "item name", "amount": 0.00}],
  "taxAmount": 0.00
}`,
      systemPrompt:
        'You are a data extraction assistant specializing in receipts. Extract structured data from receipt text accurately. Always respond with valid JSON only.',
      userId,
      app: 'quantdrive',
      feature: 'ai-extract',
      temperature: 0.2,
      maxTokens: 1024,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI extract response', 500, 'AI_PARSE_ERROR');
    }

    const result = ReceiptDataSchema.safeParse(parsed);
    if (!result.success) {
      throw createAppError(
        'AI returned invalid receipt extraction result',
        500,
        'AI_VALIDATION_ERROR',
      );
    }

    return result.data;
  }

  async extractFromInvoice(content: string, userId: string): Promise<InvoiceData> {
    const response = await this.ai.infer({
      prompt: `Extract structured data from the following invoice content.

Invoice Content:
${content.slice(0, 3000)}

Respond ONLY with valid JSON:
{
  "invoiceNumber": "INV-001",
  "vendor": "company name",
  "dueDate": "YYYY-MM-DD",
  "lineItems": [{"description": "item", "quantity": 1, "unitPrice": 0.00, "total": 0.00}],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "currency": "USD"
}`,
      systemPrompt:
        'You are a data extraction assistant specializing in invoices. Extract structured data from invoice text accurately. Always respond with valid JSON only.',
      userId,
      app: 'quantdrive',
      feature: 'ai-extract',
      temperature: 0.2,
      maxTokens: 1024,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI extract response', 500, 'AI_PARSE_ERROR');
    }

    const result = InvoiceDataSchema.safeParse(parsed);
    if (!result.success) {
      throw createAppError(
        'AI returned invalid invoice extraction result',
        500,
        'AI_VALIDATION_ERROR',
      );
    }

    return result.data;
  }
}
