import { describe, it, expect } from 'vitest';
import { IntentRouter } from '../intent-router.js';
import type { SessionContext } from '../types.js';

function createMockContext(): SessionContext {
  return {
    userId: 'user_001',
    deviceId: 'device_001',
    deviceType: 'phone',
    currentApp: null,
    currentScreen: null,
    ambientContext: 'home',
    phoneFreeMode: false,
    voiceActive: true,
  };
}

describe('IntentRouter - extended', () => {
  const router = new IntentRouter();
  const context = createMockContext();

  it('should increase confidence with multiple tool keyword matches', () => {
    const single = router.route('send a message', context);
    const multiple = router.route('send and check and find my files', context);
    expect(multiple.confidence).toBeGreaterThan(single.confidence);
    expect(multiple.type).toBe('tool');
  });

  it('should route "search files" to tool with toolId "search"', () => {
    const result = router.route('search files on my drive', context);
    expect(result.type).toBe('tool');
    expect(result.toolId).toBe('search');
  });

  it('should detect "create app" as codex, not tool "create"', () => {
    const result = router.route('create app for my notes', context);
    expect(result.type).toBe('codex');
    expect(result.codexCommand).toBeDefined();
  });

  it('should detect "whenever I get an email" as automation', () => {
    const result = router.route('whenever I get an email forward it', context);
    expect(result.type).toBe('automation');
    expect(result.automationId).toBeDefined();
  });

  it('should route "schedule a meeting" to tool, not automation', () => {
    const result = router.route('schedule a meeting for tomorrow', context);
    expect(result.type).toBe('tool');
    expect(result.toolId).toBe('schedule');
  });

  it('should fallback to conversation for empty transcript', () => {
    const result = router.route('', context);
    expect(result.type).toBe('conversation');
    expect(result.confidence).toBe(0.1);
  });

  it('should route very long transcripts correctly', () => {
    const longText =
      'I would like you to please search for the document that I was working on last week ' +
      'which had all of my notes from the quarterly planning meeting where we discussed ' +
      'the product roadmap and the various feature priorities for the next fiscal year';
    const result = router.route(longText, context);
    expect(result.type).toBe('tool');
    expect(result.toolId).toBe('search');
    expect(result.rawTranscript).toBe(longText);
  });

  it('should pass context parameter without error', () => {
    const customContext: SessionContext = {
      ...createMockContext(),
      ambientContext: 'driving',
      phoneFreeMode: true,
    };
    const result = router.route('send a reminder', customContext);
    expect(result.type).toBe('tool');
    expect(result.rawTranscript).toBe('send a reminder');
  });
});
