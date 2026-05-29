export type {
  BrainDumpSession,
  VoiceSegment,
  ContentCategory,
  CategorizedItem,
  ExtractedEntities,
  RouteTarget,
  RoutingRule,
  TranscriptionConfig,
  StructuredOutput,
} from './types.js';

export { VoiceTranscriber } from './transcription/transcriber.js';
export { ContentCategorizer } from './categorization/categorizer.js';
export {
  CATEGORY_PATTERNS,
  detectCategory,
  extractDates,
  extractPeople,
  extractActions,
  extractTopics,
} from './categorization/patterns.js';
export { ContentRouter } from './routing/router.js';
export { TARGET_REGISTRY, createRouteTarget, getAvailableTargets } from './routing/targets.js';
export { BrainDumpEngine } from './brain-dump-engine.js';
export type { ProcessResult } from './brain-dump-engine.js';
