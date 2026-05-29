import type { CategorizedItem, ExtractedEntities, VoiceSegment } from '../types.js';
import {
  detectCategory,
  extractActions,
  extractDates,
  extractPeople,
  extractTopics,
} from './patterns.js';

export class ContentCategorizer {
  categorize(segment: VoiceSegment): CategorizedItem {
    const { category, confidence } = detectCategory(segment.transcript);
    const extractedEntities = this.extractEntities(segment.transcript);

    return {
      id: `cat-${segment.id}`,
      category,
      content: segment.transcript,
      extractedEntities,
      confidence,
      routeTarget: null,
    };
  }

  categorizeBatch(segments: VoiceSegment[]): CategorizedItem[] {
    return segments.map((segment) => this.categorize(segment));
  }

  extractEntities(text: string): ExtractedEntities {
    return {
      dates: extractDates(text),
      people: extractPeople(text),
      actions: extractActions(text),
      topics: extractTopics(text),
    };
  }
}
