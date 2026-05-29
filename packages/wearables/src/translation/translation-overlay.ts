import type { TranslationOverlay, TranslationSegment, HUDPosition } from '../types.js';

export class TranslationOverlayService {
  private activeSession: TranslationOverlay | null = null;

  startSession(sourceLang: string, targetLang: string): TranslationOverlay {
    const overlay: TranslationOverlay = {
      id: `translation-${crypto.randomUUID()}`,
      sourceLang,
      targetLang,
      segments: [],
      position: { x: 0, y: 0.8 },
    };
    this.activeSession = overlay;
    return overlay;
  }

  addSegment(text: string, translated: string, confidence: number, position?: HUDPosition): void {
    if (!this.activeSession) return;
    const segment: TranslationSegment = { text, translated, confidence };
    this.activeSession = {
      ...this.activeSession,
      segments: [...this.activeSession.segments, segment],
      position: position ?? this.activeSession.position,
    };
  }

  getOverlay(): TranslationOverlay | null {
    return this.activeSession;
  }

  endSession(): void {
    this.activeSession = null;
  }

  isActive(): boolean {
    return this.activeSession !== null;
  }
}
