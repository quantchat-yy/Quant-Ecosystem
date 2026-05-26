import { z } from 'zod';
import type { AIEngine } from '@quant/ai';
import { createAppError } from '@quant/server-core';

export const SentEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  to: z.string(),
  date: z.string().optional(),
});

export const StyleProfileSchema = z.object({
  userId: z.string(),
  tone: z.string(),
  averageSentenceLength: z.number(),
  vocabularyLevel: z.string(),
  greetingStyle: z.string(),
  closingStyle: z.string(),
  formality: z.number().min(0).max(1),
  traits: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const StyledDraftSchema = z.object({
  body: z.string(),
  matchScore: z.number().min(0).max(1),
  adjustments: z.array(z.string()),
});

export type SentEmail = z.infer<typeof SentEmailSchema>;
export type StyleProfile = z.infer<typeof StyleProfileSchema>;
export type StyledDraft = z.infer<typeof StyledDraftSchema>;

export class AIStyleLearnerService {
  /**
   * In-memory store for user style profiles. This is ephemeral and will be lost on
   * process restart. Will be replaced with database persistence in production.
   */
  private styleProfiles: Map<string, StyleProfile> = new Map();

  constructor(private readonly ai: AIEngine) {}

  async analyzeSentItems(sentEmails: SentEmail[], userId: string): Promise<StyleProfile> {
    const validated = sentEmails.map((e) => SentEmailSchema.parse(e));

    const sampleText = validated
      .slice(0, 10)
      .map((e) => `To: ${e.to}\nSubject: ${e.subject}\n${e.body}`)
      .join('\n---\n');

    const response = await this.ai.infer({
      prompt: `Analyze these sent emails and create a writing style profile for the user.

Sent emails sample:
${sampleText}

Respond ONLY with valid JSON:
{
  "userId": "${userId}",
  "tone": "predominant tone",
  "averageSentenceLength": 15,
  "vocabularyLevel": "simple|moderate|advanced",
  "greetingStyle": "typical greeting used",
  "closingStyle": "typical closing used",
  "formality": 0.0 to 1.0,
  "traits": ["trait 1", "trait 2"],
  "confidence": 0.0 to 1.0
}`,
      systemPrompt:
        'You are a writing style analyst. Identify writing patterns and preferences from email samples. Always respond with valid JSON only.',
      userId,
      app: 'quantmail',
      feature: 'style-learner',
      temperature: 0.3,
      maxTokens: 512,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI style analysis response', 500, 'AI_PARSE_ERROR');
    }

    const result = StyleProfileSchema.safeParse(parsed);
    if (!result.success) {
      throw createAppError('AI returned invalid style profile', 500, 'AI_VALIDATION_ERROR');
    }

    this.styleProfiles.set(userId, result.data);
    return result.data;
  }

  async getStyleProfile(userId: string): Promise<StyleProfile> {
    const profile = this.styleProfiles.get(userId);
    if (!profile) {
      throw createAppError(
        'No style profile found. Analyze sent items first.',
        404,
        'PROFILE_NOT_FOUND',
      );
    }
    return profile;
  }

  async generateStyledDraft(content: string, userId: string): Promise<StyledDraft> {
    const profile = this.styleProfiles.get(userId);
    const styleContext = profile
      ? `User's style: ${profile.tone} tone, ${profile.vocabularyLevel} vocabulary, formality: ${profile.formality}, greeting: "${profile.greetingStyle}", closing: "${profile.closingStyle}"`
      : 'No style profile available. Use professional defaults.';

    const response = await this.ai.infer({
      prompt: `Write an email draft matching the user's writing style.

Content to express: ${content}

${styleContext}

Respond ONLY with valid JSON:
{
  "body": "the email draft in user's style",
  "matchScore": 0.0 to 1.0,
  "adjustments": ["adjustment 1", "adjustment 2"]
}`,
      systemPrompt:
        'You are an email writing assistant that mimics a user writing style. Always respond with valid JSON only.',
      userId,
      app: 'quantmail',
      feature: 'style-learner',
      temperature: 0.6,
      maxTokens: 1024,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI styled draft response', 500, 'AI_PARSE_ERROR');
    }

    const result = StyledDraftSchema.safeParse(parsed);
    if (!result.success) {
      throw createAppError('AI returned invalid styled draft', 500, 'AI_VALIDATION_ERROR');
    }

    return result.data;
  }
}
