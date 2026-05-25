// ============================================================================
// Trust & Safety Package - Type Definitions
// ============================================================================

/** Risk level classification */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Toxicity level scale */
export type ToxicityLevel = 'none' | 'mild' | 'moderate' | 'severe' | 'extreme';

/** Appeal case status */
export type AppealStatus =
  | 'submitted'
  | 'under_review'
  | 'escalated'
  | 'senior_review'
  | 'decided'
  | 'closed';

/** Hate speech category */
export type HateSpeechCategory =
  | 'slurs'
  | 'threats'
  | 'dehumanization'
  | 'stereotypes'
  | 'harassment';

/** Classification label for content */
export type ClassificationLabel =
  | 'safe'
  | 'sensitive'
  | 'harmful'
  | 'illegal'
  | 'spam'
  | 'misinformation';

/** Trust dimension for multi-dimensional scoring */
export type TrustDimension =
  | 'content_quality'
  | 'community_standing'
  | 'account_age'
  | 'verification'
  | 'violation_history';

/** Moderation action types */
export type ModerationAction =
  | 'no_action'
  | 'warning'
  | 'content_removal'
  | 'temporary_ban'
  | 'permanent_ban'
  | 'shadow_ban'
  | 'restrict';

/** Trust score for a user */
export interface TrustScore {
  userId: string;
  overallScore: number;
  dimensions: Record<TrustDimension, number>;
  lastUpdatedAt: number;
  level: TrustLevel;
  privileges: string[];
}

/** Trust levels with thresholds */
export type TrustLevel = 'new' | 'basic' | 'member' | 'trusted' | 'leader' | 'elder';

/** Trust decay configuration */
export interface TrustDecayConfig {
  decayHalflifeDays: number;
  minScore: number;
  inactivityThresholdDays: number;
}

/** Safety signal from various detection systems */
export interface SafetySignal {
  id: string;
  type: string;
  source: string;
  severity: RiskLevel;
  confidence: number;
  userId: string;
  contentId?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

/** Moderation verdict on content or user */
export interface ModerationVerdict {
  id: string;
  targetId: string;
  targetType: 'content' | 'user' | 'account';
  action: ModerationAction;
  reason: string;
  signals: SafetySignal[];
  reviewerId: string | null;
  automated: boolean;
  createdAt: number;
  expiresAt: number | null;
}

/** Appeal case for moderation decisions */
export interface AppealCase {
  id: string;
  verdictId: string;
  userId: string;
  status: AppealStatus;
  reason: string;
  evidence: string[];
  assignedReviewerId: string | null;
  priority: number;
  submittedAt: number;
  decidedAt: number | null;
  decision: 'upheld' | 'overturned' | 'partial' | null;
  decisionReason: string | null;
  slaDeadline: number;
}

/** Content classification result */
export interface ContentClassification {
  contentId: string;
  labels: ClassificationLabel[];
  confidence: Record<ClassificationLabel, number>;
  hateCategories: HateSpeechCategory[];
  toxicityLevel: ToxicityLevel;
  flaggedSpans: Array<{ start: number; end: number; reason: string }>;
  requiresReview: boolean;
}

/** User reputation tracking */
export interface UserReputation {
  userId: string;
  score: number;
  positiveActions: number;
  negativeActions: number;
  reportCount: number;
  reportedCount: number;
  lastActivityAt: number;
  joinedAt: number;
}

/** Reputation-changing event */
export interface ReputationEvent {
  id: string;
  userId: string;
  type: 'positive' | 'negative' | 'neutral';
  action: string;
  scoreDelta: number;
  timestamp: number;
  source: string;
}

/** Perceptual hash for image comparison */
export interface PerceptualHash {
  contentId: string;
  dHash: string;
  aHash: string;
  hashBits: number;
  computedAt: number;
}

/** User behavior profile */
export interface BehaviorProfile {
  userId: string;
  actionDistribution: Record<string, number>;
  averageActionsPerHour: number;
  peakHours: number[];
  entropy: number;
  lastUpdatedAt: number;
  windowSizeMs: number;
}

/** Behavior anomaly detection result */
export interface BehaviorAnomaly {
  userId: string;
  type: 'volume_spike' | 'pattern_change' | 'temporal_anomaly' | 'coordination';
  severity: RiskLevel;
  confidence: number;
  detectedAt: number;
  details: string;
}

/** Coordinated behavior detection result */
export interface CoordinatedBehavior {
  groupId: string;
  accountIds: string[];
  correlationScore: number;
  temporalOverlap: number;
  behaviorSimilarity: number;
  detectedAt: number;
  evidenceType: 'temporal' | 'behavioral' | 'network';
}

/** Bot detection score */
export interface BotScore {
  userId: string;
  score: number;
  entropy: number;
  indicators: string[];
  isLikelyBot: boolean;
  confidence: number;
  assessedAt: number;
}
