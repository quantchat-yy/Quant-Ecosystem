import { z } from 'zod';
import type { AIEngine } from '@quant/ai';
import { createAppError } from '@quant/server-core';

export const EmailInputSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  from: z.string(),
  date: z.string(),
});

export const CommitmentSchema = z.object({
  description: z.string(),
  dueDate: z.string().optional(),
  assignee: z.string(),
  confidence: z.number().min(0).max(1),
  emailId: z.string(),
});

export const ReminderSchema = z.object({
  id: z.string(),
  commitmentDescription: z.string(),
  dueDate: z.string(),
  userId: z.string(),
  status: z.enum(['active', 'completed', 'dismissed']),
  createdAt: z.string(),
});

export type EmailInput = z.infer<typeof EmailInputSchema>;
export type Commitment = z.infer<typeof CommitmentSchema>;
export type Reminder = z.infer<typeof ReminderSchema>;

export class AIFollowupService {
  /**
   * In-memory store for reminders. This is ephemeral and will be lost on process
   * restart. Will be replaced with database persistence in production.
   */
  private reminders: Map<string, Reminder> = new Map();

  constructor(private readonly ai: AIEngine) {}

  async detectCommitments(email: EmailInput, userId: string): Promise<Commitment[]> {
    const validated = EmailInputSchema.parse(email);

    const response = await this.ai.infer({
      prompt: `Detect any commitments or promises in this email (e.g., "I'll send X by Friday", "Let me get back to you").

Email:
From: ${validated.from}
Subject: ${validated.subject}
Date: ${validated.date}
Body: ${validated.body}

Respond ONLY with valid JSON array:
[
  {
    "description": "what was committed to",
    "dueDate": "ISO date string or null",
    "assignee": "who made the commitment",
    "confidence": 0.0 to 1.0,
    "emailId": "${validated.id}"
  }
]`,
      systemPrompt:
        'You are an assistant that detects commitments and promises in emails. Always respond with valid JSON only.',
      userId,
      app: 'quantmail',
      feature: 'email-followup',
      temperature: 0.2,
      maxTokens: 512,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError(
        'Failed to parse AI commitment detection response',
        500,
        'AI_PARSE_ERROR',
      );
    }

    const result = z.array(CommitmentSchema).safeParse(parsed);
    if (!result.success) {
      throw createAppError('AI returned invalid commitment result', 500, 'AI_VALIDATION_ERROR');
    }

    return result.data;
  }

  async createReminder(commitment: Commitment, userId: string): Promise<Reminder> {
    const id = `reminder_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const reminder: Reminder = {
      id,
      commitmentDescription: commitment.description,
      dueDate: commitment.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      userId,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.reminders.set(id, reminder);
    return reminder;
  }

  async getActiveReminders(userId: string): Promise<Reminder[]> {
    return Array.from(this.reminders.values()).filter(
      (r) => r.userId === userId && r.status === 'active',
    );
  }
}
