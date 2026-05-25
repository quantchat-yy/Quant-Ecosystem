// ============================================================================
// Engagement Engine - Type Definitions
// ============================================================================

// Engagement Event Types
export type EngagementEventType =
  | 'view'
  | 'click'
  | 'share'
  | 'comment'
  | 'like'
  | 'invite'
  | 'signup'
  | 'purchase'
  | 'streak_complete'
  | 'badge_earned'
  | 'level_up'
  | 'challenge_complete'
  | 'referral_sent'
  | 'referral_converted';

export interface EngagementEvent {
  id: string;
  userId: string;
  type: EngagementEventType;
  timestamp: number;
  metadata: Record<string, string | number | boolean>;
  sessionId?: string;
  source?: string;
  value?: number;
}

// Viral Loop Types
export type ViralLoopStage = 'invite' | 'signup' | 'activate' | 'engage' | 'invite_others';

export interface ViralLoop {
  id: string;
  name: string;
  stages: ViralLoopStage[];
  conversionRates: Record<ViralLoopStage, number>;
  kFactor: number;
  cycleTime: number;
  createdAt: number;
  updatedAt: number;
}

export interface ViralCoefficient {
  kFactor: number;
  invitesSent: number;
  conversionRate: number;
  cycleTimeMs: number;
  effectiveK: number;
  trend: 'growing' | 'stable' | 'declining';
  projectedGrowth: number;
}

export interface ReferralChain {
  rootUserId: string;
  chain: ReferralNode[];
  depth: number;
  totalConversions: number;
  totalValue: number;
  createdAt: number;
}

export interface ReferralNode {
  userId: string;
  referredBy: string;
  convertedAt: number;
  depth: number;
  childCount: number;
  value: number;
}

export interface IncentiveConfig {
  id: string;
  name: string;
  type: 'credit' | 'discount' | 'feature_unlock' | 'points' | 'cash';
  value: number;
  maxRedemptions: number;
  expiresAt?: number;
}

// Gamification Types
export interface GamificationConfig {
  baseXpPerAction: Record<string, number>;
  levelFormula: 'logarithmic' | 'linear' | 'exponential';
  levelBase: number;
  streakMultiplierCap: number;
  freezeTokensPerPeriod: number;
  comboWindow: number;
  maxComboMultiplier: number;
}

export interface StreakData {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: number;
  freezeTokensRemaining: number;
  multiplier: number;
  gracePeriodsUsed: number;
  gracePeriodExpiry?: number;
  streakStartedAt: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlockCondition: BadgeCondition;
  xpReward: number;
  createdAt: number;
}

export interface BadgeCondition {
  type: 'count' | 'streak' | 'threshold' | 'combination' | 'time_limited';
  metric: string;
  target: number;
  timeWindow?: number;
  subConditions?: BadgeCondition[];
}

export interface LevelProgression {
  userId: string;
  currentLevel: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXp: number;
  levelHistory: LevelEvent[];
  prestige: number;
}

export interface LevelEvent {
  level: number;
  reachedAt: number;
  xpAtLevel: number;
}

export interface ChallengeConfig {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  metric: string;
  target: number;
  xpReward: number;
  badgeReward?: string;
  startTime: number;
  endTime: number;
  maxParticipants?: number;
}

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  score: number;
  level: number;
  badges: string[];
  streak: number;
  change: number;
  updatedAt: number;
}

// Social Proof Types
export type SocialProofType = 'trending' | 'popular' | 'friend_activity' | 'milestone' | 'fomo';

export interface SocialProofSignal {
  id: string;
  type: SocialProofType;
  content: string;
  score: number;
  velocity: number;
  recency: number;
  socialWeight: number;
  timestamp: number;
  metadata: Record<string, string | number>;
}

export interface TrendingSignal {
  itemId: string;
  score: number;
  velocity: number;
  acceleration: number;
  peakTime?: number;
  category: string;
}

export interface FomoTrigger {
  type: 'scarcity' | 'urgency' | 'social_validation' | 'exclusivity';
  message: string;
  intensity: number;
  ethicalScore: number;
  showToUser: boolean;
  expiresAt?: number;
}

// Growth Metric Types
export interface GrowthMetric {
  name: string;
  value: number;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  timestamp: number;
}

// Notification Optimization Types
export type NotificationChannel = 'push' | 'email' | 'in_app' | 'sms';

export interface NotificationOptimization {
  userId: string;
  bestChannel: NotificationChannel;
  bestTimeSlot: number;
  fatigue: number;
  channelScores: Record<NotificationChannel, number>;
  lastSentAt: Record<NotificationChannel, number>;
  engagementHistory: NotificationEngagement[];
}

export interface NotificationEngagement {
  channel: NotificationChannel;
  sentAt: number;
  openedAt?: number;
  clickedAt?: number;
  dismissed: boolean;
  hourOfDay: number;
  dayOfWeek: number;
}

export interface FrequencyCap {
  channel: NotificationChannel;
  maxPerDay: number;
  maxPerWeek: number;
  cooldownMs: number;
  currentCount: number;
  lastResetAt: number;
}

// Retention Types
export type LifecycleStage =
  | 'new'
  | 'activated'
  | 'active'
  | 'at_risk'
  | 'dormant'
  | 'churned'
  | 'resurrected';

export interface RetentionCohort {
  cohortId: string;
  startDate: number;
  size: number;
  retentionByDay: Record<number, number>;
  retentionByWeek: Record<number, number>;
  medianLifespan: number;
  avgRevenue: number;
}

export interface ChurnPrediction {
  userId: string;
  churnProbability: number;
  riskFactors: RiskFactor[];
  predictedChurnDate?: number;
  lifecycleStage: LifecycleStage;
  confidenceInterval: [number, number];
}

export interface RiskFactor {
  name: string;
  impact: number;
  direction: 'positive' | 'negative';
  currentValue: number;
  threshold: number;
}

export interface WinBackScore {
  userId: string;
  score: number;
  bestChannel: NotificationChannel;
  bestIncentive: IncentiveConfig;
  predictedReactivation: number;
  lastActiveAt: number;
}

export interface SurvivalCurvePoint {
  time: number;
  survivalRate: number;
  hazardRate: number;
  censoredCount: number;
  atRiskCount: number;
}
