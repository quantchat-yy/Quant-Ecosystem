// ============================================================================
// Gaming Package - Barrel Export
// ============================================================================

export { GameStateMachine } from './core/state-machine';
export { PhysicsEngine } from './core/physics-engine';
export { SpriteManager } from './core/sprite-manager';
export { GameLoop } from './core/game-loop';
export { InputHandler } from './core/input-handler';
export { ParticleSystem } from './core/particle-system';
export { LeaderboardSystem } from './core/leaderboard-system';
export { AchievementSystem } from './core/achievement-system';
export { MultiplayerSync } from './core/multiplayer-sync';
export { GameTemplateFactory } from './core/game-templates';
export { GameEconomy } from './core/game-economy';
export { TournamentSystem } from './core/tournament-system';
export { GameAnalytics } from './core/game-analytics';

export type {
  Vector2D,
  Transform2D,
  Bounds,
  GameState,
  StateTransition,
  StateCondition,
  StateCallbacks,
  RigidBody,
  Collider,
  AABBCollider,
  CircleCollider,
  CollisionResult,
  SpatialCell,
  Sprite,
  SpriteSheet,
  AnimationFrame,
  AnimationSequence,
  AnimationPlayback,
  Particle,
  ParticleColor,
  EmitterShape,
  ParticleEmitter,
  SubEmitterConfig,
  ParticleForce,
  InputType,
  GestureType,
  InputEvent,
  KeyBinding,
  InputBufferEntry,
  AccelerometerData,
  ScoreEntry,
  LeaderboardPeriod,
  LeaderboardConfig,
  AntiCheatConfig,
  Achievement,
  AchievementCondition,
  AchievementReward,
  AchievementProgress,
  MultiplayerState,
  EntityState,
  GameEvent,
  InputBuffer,
  PlayerInput,
  StateSnapshot,
  ServerUpdate,
  TemplateType,
  GameTemplate,
  TemplateRule,
  ScoringConfig,
  MultiplierRule,
  WinCondition,
  LoseCondition,
  Currency,
  Transaction,
  PowerUp,
  PowerUpEffect,
  GameEconomyConfig,
  ConversionRate,
  DailyReward,
  LivesConfig,
  Tournament,
  TournamentParticipant,
  Bracket,
  Match,
  MatchResult,
  ELORating,
  PrizePool,
  PrizeDistribution,
  DailyChallenge,
  Streak,
  GameSession,
  AnalyticsEvent,
  RetentionMetrics,
  FunnelStep,
} from './types';
