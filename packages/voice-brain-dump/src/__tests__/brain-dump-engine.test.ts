import { BrainDumpEngine } from '../brain-dump-engine.js';
import type { TranscriptionConfig } from '../types.js';

describe('BrainDumpEngine', () => {
  let engine: BrainDumpEngine;
  const config: TranscriptionConfig = {
    language: 'en',
    model: 'whisper-large',
    streaming: true,
  };

  beforeEach(() => {
    engine = new BrainDumpEngine();
  });

  describe('startDump', () => {
    it('creates a new session for a user', () => {
      const session = engine.startDump('user-123', config);
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.status).toBe('active');
      expect(session.segments).toHaveLength(0);
    });
  });

  describe('processAudio', () => {
    it('processes audio and returns segment with categorization', () => {
      const session = engine.startDump('user-1', config);
      const chunk = Buffer.from('I need to finish the quarterly report');
      const result = engine.processAudio(session.id, chunk);

      expect(result.segment.transcript).toBe('I need to finish the quarterly report');
      expect(result.categorizedItem.category).toBe('task');
      expect(result.route).toBeDefined();
      expect(result.route.app).toBe('QuantTasks');
    });

    it('routes email content to QuantMail', () => {
      const session = engine.startDump('user-1', config);
      const chunk = Buffer.from('Send an email to John about the meeting');
      const result = engine.processAudio(session.id, chunk);

      expect(result.categorizedItem.category).toBe('email');
      expect(result.route.app).toBe('QuantMail');
    });

    it('routes ideas to QuantDocs', () => {
      const session = engine.startDump('user-1', config);
      const chunk = Buffer.from('What if we built a notification center');
      const result = engine.processAudio(session.id, chunk);

      expect(result.categorizedItem.category).toBe('idea');
      expect(result.route.app).toBe('QuantDocs');
    });
  });

  describe('finishDump', () => {
    it('returns structured output with all segments categorized', () => {
      const session = engine.startDump('user-1', config);

      engine.processAudio(session.id, Buffer.from('Send email to Sarah about budget'));
      engine.processAudio(session.id, Buffer.from('I need to review the PR'));
      engine.processAudio(session.id, Buffer.from('What if we add dark mode'));

      const output = engine.finishDump(session.id);

      expect(output.session.status).toBe('completed');
      expect(output.items).toHaveLength(3);
      expect(output.routes).toHaveLength(3);
      expect(output.items[0]!.category).toBe('email');
      expect(output.items[1]!.category).toBe('task');
      expect(output.items[2]!.category).toBe('idea');
    });

    it('throws for unknown session', () => {
      expect(() => engine.finishDump('nonexistent')).toThrow('Session not found');
    });
  });

  describe('session lifecycle', () => {
    it('supports full lifecycle from start to finish', () => {
      const session = engine.startDump('user-lifecycle', config);
      expect(session.status).toBe('active');

      const r1 = engine.processAudio(session.id, Buffer.from('Remind me at 3pm to call dentist'));
      expect(r1.categorizedItem.category).toBe('reminder');

      const r2 = engine.processAudio(session.id, Buffer.from('Note: API keys expire next month'));
      expect(r2.categorizedItem.category).toBe('note');

      const output = engine.finishDump(session.id);
      expect(output.session.status).toBe('completed');
      expect(output.items).toHaveLength(2);
      expect(output.routes).toHaveLength(2);
    });
  });
});
