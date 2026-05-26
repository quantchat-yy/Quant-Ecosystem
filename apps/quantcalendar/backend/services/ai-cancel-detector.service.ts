import type { AIEngine } from '@quant/ai';

export interface CancelDetectionResult {
  isCancellation: boolean;
  confidence: number;
  suggestedAction: 'reschedule' | 'cancel' | 'none';
  extractedReason?: string;
}

export class AICancelDetectorService {
  constructor(private readonly ai: AIEngine) {}

  async detectCancellation(messageText: string): Promise<CancelDetectionResult> {
    // NOTE: messageText is interpolated directly into the prompt without sanitization.
    // This is acceptable for now since results are only returned to the caller,
    // but should be hardened if automated actions (e.g., auto-cancel) are wired up later.
    const response = await this.ai.infer({
      prompt: `Analyze the following message and determine if it indicates a meeting cancellation or intent to not attend:

"${messageText}"

Respond ONLY with valid JSON:
{
  "isCancellation": true/false,
  "confidence": 0.0 to 1.0,
  "suggestedAction": "reschedule" | "cancel" | "none",
  "extractedReason": "reason or null"
}`,
      systemPrompt:
        'You are a meeting cancellation detector. Analyze messages for cancellation intent. Look for patterns like "I can\'t make it", "need to cancel", "won\'t be able to attend", "something came up". Always respond with valid JSON only.',
      userId: 'system',
      app: 'quantcalendar',
      feature: 'ai-cancel-detector',
      temperature: 0.2,
      maxTokens: 256,
    });

    try {
      const result = JSON.parse(response.content) as CancelDetectionResult;
      return {
        isCancellation: result.isCancellation ?? false,
        confidence: result.confidence ?? 0,
        suggestedAction: result.suggestedAction ?? 'none',
        extractedReason: result.extractedReason,
      };
    } catch {
      return {
        isCancellation: false,
        confidence: 0,
        suggestedAction: 'none',
      };
    }
  }
}
