// ============================================================================
// Trust & Safety Package - Barrel Export
// ============================================================================

export { TrustScoreSystem } from './core/trust-score-system';
export { HateSpeechClassifier } from './core/hate-speech-classifier';
export { ContentIntegrity } from './core/content-integrity';
export { BehaviorAnalysis } from './core/behavior-analysis';
export { AppealSystem } from './core/appeal-system';

export type {
  TrustScore,
  TrustDimension,
  TrustLevel,
  TrustDecayConfig,
  SafetySignal,
  ModerationAction,
  ModerationVerdict,
  AppealCase,
  AppealStatus,
  ContentClassification,
  ClassificationLabel,
  HateSpeechCategory,
  ToxicityLevel,
  UserReputation,
  ReputationEvent,
  PerceptualHash,
  BehaviorProfile,
  BehaviorAnomaly,
  RiskLevel,
  CoordinatedBehavior,
  BotScore,
} from './types';
