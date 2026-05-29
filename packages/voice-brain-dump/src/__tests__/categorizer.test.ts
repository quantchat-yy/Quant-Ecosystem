import { ContentCategorizer } from '../categorization/categorizer.js';
import type { VoiceSegment } from '../types.js';

function makeSegment(transcript: string): VoiceSegment {
  return {
    id: 'seg-1',
    startTime: 0,
    endTime: 3,
    transcript,
    confidence: 0.9,
  };
}

describe('ContentCategorizer', () => {
  const categorizer = new ContentCategorizer();

  describe('categorize', () => {
    it('detects email category', () => {
      const result = categorizer.categorize(makeSegment('Send an email to John about the project'));
      expect(result.category).toBe('email');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('detects task category', () => {
      const result = categorizer.categorize(makeSegment('I need to finish the report by Friday'));
      expect(result.category).toBe('task');
    });

    it('detects idea category', () => {
      const result = categorizer.categorize(makeSegment('What if we built a new dashboard'));
      expect(result.category).toBe('idea');
    });

    it('detects note category', () => {
      const result = categorizer.categorize(makeSegment('Note: the API changed last week'));
      expect(result.category).toBe('note');
    });

    it('detects reminder category', () => {
      const result = categorizer.categorize(makeSegment('Remind me at 3pm to call the dentist'));
      expect(result.category).toBe('reminder');
    });

    it('detects question category', () => {
      const result = categorizer.categorize(makeSegment('How do we deploy to production'));
      expect(result.category).toBe('question');
    });

    it('defaults to note for ambiguous content', () => {
      const result = categorizer.categorize(makeSegment('The weather is nice today'));
      expect(result.category).toBe('note');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('categorizeBatch', () => {
    it('categorizes multiple segments', () => {
      const segments = [
        makeSegment('Email to Sarah about meeting'),
        makeSegment('I need to buy groceries'),
        makeSegment('What if we redesign the homepage'),
      ];
      const results = categorizer.categorizeBatch(segments);
      expect(results).toHaveLength(3);
      expect(results[0]!.category).toBe('email');
      expect(results[1]!.category).toBe('task');
      expect(results[2]!.category).toBe('idea');
    });
  });

  describe('extractEntities', () => {
    it('extracts dates', () => {
      const entities = categorizer.extractEntities(
        'Meet tomorrow at 3pm for the Friday discussion',
      );
      expect(entities.dates.length).toBeGreaterThan(0);
      expect(entities.dates.some((d) => d.toLowerCase().includes('tomorrow'))).toBe(true);
    });

    it('extracts people', () => {
      const entities = categorizer.extractEntities('Email to John Smith about the project');
      expect(entities.people).toContain('John Smith');
    });

    it('extracts actions', () => {
      const entities = categorizer.extractEntities(
        'I need to finish the report and should call the client',
      );
      expect(entities.actions.length).toBeGreaterThan(0);
      expect(entities.actions.some((a) => a.includes('finish the report'))).toBe(true);
    });

    it('extracts topics', () => {
      const entities = categorizer.extractEntities('Meeting about quarterly review');
      expect(entities.topics.length).toBeGreaterThan(0);
    });
  });
});
