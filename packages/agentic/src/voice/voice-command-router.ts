import { UnifiedAIService } from '@quant/ai';
import { AppController } from '../cross-app/app-controller';
import { VoiceIntentParser, type ParsedIntent } from './voice-intent-parser';
import type { CommandResult } from '../cross-app/command-bus';

/**
 * Voice Command Router
 *
 * High-level orchestrator that takes raw voice/text input,
 * parses it into an intent, optionally confirms with LLM,
 * and routes it to the appropriate app via AppController.
 */

export interface VoiceCommandInput {
  transcript: string;
  userId: string;
  useLLM?: boolean;
  skipConfirmation?: boolean;
}

export class VoiceCommandRouter {
  private parser: VoiceIntentParser;
  private controller: AppController;
  private aiService: UnifiedAIService;

  constructor(controller: AppController, aiService?: UnifiedAIService) {
    this.parser = new VoiceIntentParser();
    this.controller = controller;
    this.aiService = aiService ?? new UnifiedAIService();
  }

  /**
   * Process a raw voice command end-to-end.
   */
  async handle(input: VoiceCommandInput): Promise<CommandResult[]> {
    const intent = this.parser.parse(input.transcript);

    if (input.useLLM && intent.confidence < 0.7) {
      const refined = await this.refineWithLLM(input.transcript, intent);
      return this.controller.executeIntent(refined, input.userId, {
        skipConfirmation: input.skipConfirmation,
      });
    }

    return this.controller.executeIntent(intent, input.userId, {
      skipConfirmation: input.skipConfirmation,
    });
  }

  /**
   * Confirm a previously blocked command (ask permission).
   */
  async confirm(commandId: string, _userId: string): Promise<CommandResult[]> {
    // In a real system this would look up the pending command.
    // For now, return an informative response.
    return [
      {
        success: false,
        commandId,
        app: '*',
        message: 'Pending command confirmation lookup not implemented in this version',
      },
    ];
  }

  private async refineWithLLM(
    transcript: string,
    fallbackIntent: ParsedIntent,
  ): Promise<ParsedIntent> {
    try {
      const result = await this.aiService.generateText(
        `Parse this voice command into JSON with keys: app, action, params.
Available apps: quantneon, quantsync, quanttube, quantchat, quantmail, quantdocs, quantcalendar.
Command: "${transcript}"

Respond only with JSON.`,
        {
          systemPrompt:
            'You are a voice command parser for a multi-app ecosystem. Return only valid JSON.',
          temperature: 0.1,
          maxTokens: 256,
        },
      );

      const parsed = JSON.parse(result.content) as Record<string, unknown>;
      return {
        app: String(parsed.app || fallbackIntent.app),
        action: String(parsed.action || fallbackIntent.action),
        params:
          typeof parsed.params === 'object' && parsed.params !== null
            ? (parsed.params as Record<string, unknown>)
            : fallbackIntent.params,
        confidence: 0.85,
        rawText: transcript,
      };
    } catch {
      return fallbackIntent;
    }
  }
}
