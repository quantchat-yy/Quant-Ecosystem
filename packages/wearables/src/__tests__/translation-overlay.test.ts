import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationOverlayService } from '../translation/translation-overlay.js';

describe('TranslationOverlayService', () => {
  let service: TranslationOverlayService;

  beforeEach(() => {
    service = new TranslationOverlayService();
  });

  it('starts a translation session', () => {
    const overlay = service.startSession('en', 'es');
    expect(overlay.sourceLang).toBe('en');
    expect(overlay.targetLang).toBe('es');
    expect(overlay.segments).toHaveLength(0);
  });

  it('adds segments to active session', () => {
    service.startSession('en', 'ja');
    service.addSegment('Hello', 'Konnichiwa', 0.95);
    const overlay = service.getOverlay();
    expect(overlay).not.toBeNull();
    expect(overlay!.segments).toHaveLength(1);
    expect(overlay!.segments[0]!.text).toBe('Hello');
    expect(overlay!.segments[0]!.translated).toBe('Konnichiwa');
  });

  it('does not add segment when no session is active', () => {
    service.addSegment('Hello', 'Hola', 0.9);
    expect(service.getOverlay()).toBeNull();
  });

  it('returns null overlay when no session active', () => {
    expect(service.getOverlay()).toBeNull();
  });

  it('ends a session', () => {
    service.startSession('en', 'fr');
    service.endSession();
    expect(service.isActive()).toBe(false);
    expect(service.getOverlay()).toBeNull();
  });

  it('reports active state correctly', () => {
    expect(service.isActive()).toBe(false);
    service.startSession('en', 'de');
    expect(service.isActive()).toBe(true);
  });
});
