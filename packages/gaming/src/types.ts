// ============================================================================
// Gaming Package - Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Math / Geometry Types
// ---------------------------------------------------------------------------

/** 2D vector for positions, velocities, forces */
export interface Vector2D {
  x: number;
  y: number;
}

/** 2D transform with position, rotation, and scale */
export interface Transform2D {
  position: Vector2D;
  rotation: number;
  scale: Vector2D;
}

/** Axis-aligned bounding box */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// State Machine Types
// ---------------------------------------------------------------------------

/** Game state definition */
export interface GameState {
  id: string;
  name: string;
  parentId: string | null;
  isParallel: boolean;
  data: Record<string, unknown>;
  enterTime: number;
  timerDuration: number | null;
  timerTarget: string | null;
}

/** Transition between states */
export interface StateTransition {
  id: string;
  from: string;
  to: string;
  event: string;
  conditions: StateCondition[];
  priority: number;
}

/** Condition that must be met for transition */
export interface StateCondition {
  type: 'guard' | 'timer' | 'event' | 'data';
  evaluate: (context: Record<string, unknown>) => boolean;
  description: string;
}

/** State callback types */
export interface StateCallbacks {
  onEnter?: (state: GameState, context: Record<string, unknown>) => void;
  onExit?: (state: GameState, context: Record<string, unknown>) => void;
  onUpdate?: (state: GameState, deltaTime: number, context: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Physics Types
// ---------------------------------------------------------------------------

/** Rigid body for physics simulation */
export interface RigidBody {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  mass: number;
  inverseMass: number;
  restitution: number;
  friction: number;
  angularVelocity: number;
  torque: number;
  isStatic: boolean;
  isSensor: boolean;
  collider: Collider;
  layer: number;
  userData: Record<string, unknown>;
}

/** Collider shape union */
export type Collider = AABBCollider | CircleCollider;

/** AABB collider */
export interface AABBCollider {
  type: 'aabb';
  width: number;
  height: number;
  offset: Vector2D;
}

/** Circle collider */
export interface CircleCollider {
  type: 'circle';
  radius: number;
  offset: Vector2D;
}

/** Result of a collision detection */
export interface CollisionResult {
  bodyA: RigidBody;
  bodyB: RigidBody;
  normal: Vector2D;
  penetration: number;
  contactPoint: Vector2D;
  relativeVelocity: Vector2D;
}

/** Spatial hash cell */
export interface SpatialCell {
  x: number;
  y: number;
  bodies: string[];
}

// ---------------------------------------------------------------------------
// Sprite / Animation Types
// ---------------------------------------------------------------------------

/** Single sprite frame */
export interface Sprite {
  id: string;
  sheetId: string;
  frameX: number;
  frameY: number;
  width: number;
  height: number;
  pivot: Vector2D;
  transform: Transform2D;
  zIndex: number;
  visible: boolean;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  tint: number;
}

/** Sprite sheet definition */
export interface SpriteSheet {
  id: string;
  imageUrl: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  padding: number;
  totalFrames: number;
}

/** Single animation frame */
export interface AnimationFrame {
  spriteIndex: number;
  duration: number;
  event?: string;
  offset?: Vector2D;
}

/** Named animation sequence */
export interface AnimationSequence {
  id: string;
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
  speed: number;
  onComplete?: string;
}

/** Animation playback state */
export interface AnimationPlayback {
  sequenceId: string;
  currentFrame: number;
  elapsedTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  playCount: number;
}

// ---------------------------------------------------------------------------
// Particle System Types
// ---------------------------------------------------------------------------

/** Single particle */
export interface Particle {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  lifetime: number;
  maxLifetime: number;
  size: number;
  startSize: number;
  endSize: number;
  rotation: number;
  angularVelocity: number;
  color: ParticleColor;
  startColor: ParticleColor;
  endColor: ParticleColor;
  alpha: number;
  alive: boolean;
}

/** RGBA color for particles */
export interface ParticleColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Emitter shape types */
export type EmitterShape = 'point' | 'line' | 'circle' | 'rect';

/** Particle emitter configuration */
export interface ParticleEmitter {
  id: string;
  position: Vector2D;
  shape: EmitterShape;
  shapeParams: Record<string, number>;
  emissionRate: number;
  burstCount: number;
  maxParticles: number;
  particleLifetime: [number, number];
  startSpeed: [number, number];
  startSize: [number, number];
  endSize: [number, number];
  startColor: ParticleColor;
  endColor: ParticleColor;
  gravity: Vector2D;
  angle: [number, number];
  angularVelocity: [number, number];
  worldSpace: boolean;
  active: boolean;
  subEmitters: SubEmitterConfig[];
}

/** Sub-emitter triggered on particle events */
export interface SubEmitterConfig {
  trigger: 'death' | 'birth' | 'collision';
  emitterId: string;
  inheritVelocity: number;
  count: number;
}

/** Force applied to particles */
export interface ParticleForce {
  type: 'gravity' | 'wind' | 'turbulence' | 'attract' | 'repel';
  strength: number;
  direction: Vector2D;
  position?: Vector2D;
  radius?: number;
  noiseScale?: number;
  noiseSpeed?: number;
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

/** Input event types */
export type InputType = 'keyboard' | 'touch' | 'mouse' | 'accelerometer' | 'gamepad';

/** Gesture types */
export type GestureType = 'tap' | 'double_tap' | 'long_press' | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch' | 'rotate';

/** Normalized input event */
export interface InputEvent {
  type: InputType;
  action: 'down' | 'up' | 'move' | 'gesture';
  key?: string;
  position?: Vector2D;
  delta?: Vector2D;
  gesture?: GestureType;
  timestamp: number;
  pointerId?: number;
  pressure?: number;
}

/** Key binding configuration */
export interface KeyBinding {
  action: string;
  primary: string;
  secondary?: string;
  category: string;
}

/** Buffered input for combo detection */
export interface InputBufferEntry {
  event: InputEvent;
  frame: number;
  consumed: boolean;
}

/** Accelerometer reading */
export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Leaderboard Types
// ---------------------------------------------------------------------------

/** Score entry in leaderboard */
export interface ScoreEntry {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
  timestamp: number;
  metadata: Record<string, unknown>;
  verified: boolean;
}

/** Leaderboard time periods */
export type LeaderboardPeriod = 'all_time' | 'seasonal' | 'weekly' | 'daily';

/** Leaderboard configuration */
export interface LeaderboardConfig {
  id: string;
  name: string;
  period: LeaderboardPeriod;
  maxEntries: number;
  sortOrder: 'asc' | 'desc';
  resetSchedule: string | null;
  tieBreaker: 'first_submission' | 'timestamp' | 'secondary_score';
  antiCheat: AntiCheatConfig;
}

/** Anti-cheat configuration */
export interface AntiCheatConfig {
  maxScoreDelta: number;
  maxSubmissionsPerMinute: number;
  requireVerification: boolean;
  minPlayTime: number;
}

// ---------------------------------------------------------------------------
// Achievement Types
// ---------------------------------------------------------------------------

/** Achievement definition */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  secret: boolean;
  conditions: AchievementCondition[];
  rewards: AchievementReward[];
}

/** Condition for unlocking an achievement */
export interface AchievementCondition {
  type: 'count' | 'streak' | 'combo' | 'time' | 'value' | 'compound';
  metric: string;
  threshold: number;
  timeWindow?: number;
  operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
}

/** Reward granted on achievement unlock */
export interface AchievementReward {
  type: 'currency' | 'item' | 'badge' | 'title' | 'power_up';
  id: string;
  amount: number;
}

/** Player progress toward an achievement */
export interface AchievementProgress {
  achievementId: string;
  playerId: string;
  currentValue: number;
  targetValue: number;
  unlocked: boolean;
  unlockedAt: number | null;
  streakCurrent: number;
  streakBest: number;
}

// ---------------------------------------------------------------------------
// Multiplayer Types
// ---------------------------------------------------------------------------

/** Multiplayer game state */
export interface MultiplayerState {
  tick: number;
  timestamp: number;
  entities: Record<string, EntityState>;
  events: GameEvent[];
}

/** Entity state in multiplayer */
export interface EntityState {
  id: string;
  ownerId: string;
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
  health: number;
  data: Record<string, unknown>;
}

/** Game event in multiplayer */
export interface GameEvent {
  type: string;
  tick: number;
  playerId: string;
  data: Record<string, unknown>;
}

/** Input buffer entry for multiplayer */
export interface InputBuffer {
  sequenceNumber: number;
  tick: number;
  inputs: PlayerInput[];
  timestamp: number;
  acknowledged: boolean;
}

/** Player input for multiplayer */
export interface PlayerInput {
  playerId: string;
  actions: string[];
  direction: Vector2D;
  timestamp: number;
}

/** State snapshot for history */
export interface StateSnapshot {
  tick: number;
  timestamp: number;
  state: MultiplayerState;
  inputs: InputBuffer[];
  checksum: number;
}

/** Server update packet */
export interface ServerUpdate {
  tick: number;
  timestamp: number;
  state: MultiplayerState;
  lastProcessedInput: Record<string, number>;
  deltaCompressed: boolean;
  previousTick: number | null;
}

// ---------------------------------------------------------------------------
// Game Template Types
// ---------------------------------------------------------------------------

/** Template types available */
export type TemplateType = 'quiz' | 'puzzle' | 'runner' | 'match3' | 'word';

/** Game template configuration */
export interface GameTemplate {
  id: string;
  type: TemplateType;
  name: string;
  config: Record<string, unknown>;
  rules: TemplateRule[];
  scoring: ScoringConfig;
  winConditions: WinCondition[];
  loseConditions: LoseCondition[];
}

/** Template rule */
export interface TemplateRule {
  id: string;
  description: string;
  evaluate: (state: Record<string, unknown>) => boolean;
  action: string;
}

/** Scoring configuration */
export interface ScoringConfig {
  basePoints: number;
  multiplierRules: MultiplierRule[];
  timeBonusPerSecond: number;
  comboBonusRate: number;
  maxCombo: number;
}

/** Score multiplier rule */
export interface MultiplierRule {
  condition: string;
  multiplier: number;
  stackable: boolean;
}

/** Win condition */
export interface WinCondition {
  type: 'score' | 'time' | 'complete' | 'survive' | 'collect';
  threshold: number;
  description: string;
}

/** Lose condition */
export interface LoseCondition {
  type: 'lives' | 'time' | 'score' | 'health' | 'moves';
  threshold: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Economy Types
// ---------------------------------------------------------------------------

/** In-game currency */
export interface Currency {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  isPremium: boolean;
  maxBalance: number;
  earnRate: number;
}

/** Transaction record */
export interface Transaction {
  id: string;
  playerId: string;
  currencyId: string;
  amount: number;
  type: 'earn' | 'spend' | 'convert' | 'refund' | 'gift';
  source: string;
  timestamp: number;
  balanceAfter: number;
}

/** Power-up item */
export interface PowerUp {
  id: string;
  name: string;
  description: string;
  cost: { currencyId: string; amount: number };
  duration: number;
  effect: PowerUpEffect;
  stackable: boolean;
  maxStacks: number;
  cooldown: number;
}

/** Power-up effect */
export interface PowerUpEffect {
  type: 'multiplier' | 'shield' | 'time_extend' | 'extra_life' | 'hint' | 'skip';
  value: number;
  target: string;
}

/** Economy configuration */
export interface GameEconomyConfig {
  currencies: Currency[];
  conversionRates: ConversionRate[];
  dailyRewards: DailyReward[];
  livesConfig: LivesConfig;
}

/** Currency conversion rate */
export interface ConversionRate {
  from: string;
  to: string;
  rate: number;
  minAmount: number;
}

/** Daily reward schedule */
export interface DailyReward {
  day: number;
  currencyId: string;
  amount: number;
  bonusItem?: string;
}

/** Lives system config */
export interface LivesConfig {
  maxLives: number;
  regenerationTimeMs: number;
  overflowAllowed: boolean;
  purchaseCost: { currencyId: string; amount: number };
}

// ---------------------------------------------------------------------------
// Tournament Types
// ---------------------------------------------------------------------------

/** Tournament definition */
export interface Tournament {
  id: string;
  name: string;
  type: 'single_elimination' | 'double_elimination' | 'round_robin';
  status: 'registration' | 'in_progress' | 'completed' | 'cancelled';
  maxParticipants: number;
  participants: TournamentParticipant[];
  brackets: Bracket[];
  prizePool: PrizePool;
  startTime: number;
  endTime: number | null;
  currentRound: number;
}

/** Tournament participant */
export interface TournamentParticipant {
  playerId: string;
  playerName: string;
  seed: number;
  rating: number;
  wins: number;
  losses: number;
  eliminated: boolean;
}

/** Tournament bracket */
export interface Bracket {
  id: string;
  round: number;
  position: number;
  matches: Match[];
  isLoserBracket: boolean;
}

/** Match within a bracket */
export interface Match {
  id: string;
  bracketId: string;
  round: number;
  player1Id: string | null;
  player2Id: string | null;
  result: MatchResult | null;
  scheduledTime: number;
  status: 'pending' | 'in_progress' | 'completed' | 'bye';
}

/** Match result */
export interface MatchResult {
  winnerId: string;
  loserId: string;
  score: [number, number];
  duration: number;
  timestamp: number;
}

/** ELO rating data */
export interface ELORating {
  playerId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  peakRating: number;
  lastUpdated: number;
  kFactor: number;
}

/** Prize pool distribution */
export interface PrizePool {
  totalAmount: number;
  currencyId: string;
  distribution: PrizeDistribution[];
}

/** Prize distribution entry */
export interface PrizeDistribution {
  placement: number;
  percentage: number;
  amount: number;
}

// ---------------------------------------------------------------------------
// Analytics / Challenge Types
// ---------------------------------------------------------------------------

/** Daily challenge definition */
export interface DailyChallenge {
  id: string;
  date: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  config: Record<string, unknown>;
  rewards: AchievementReward[];
  expiresAt: number;
}

/** Player streak data */
export interface Streak {
  playerId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  totalCompleted: number;
}

/** Game session data */
export interface GameSession {
  id: string;
  playerId: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  level: string;
  score: number;
  completed: boolean;
  events: AnalyticsEvent[];
}

/** Analytics event */
export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
  sessionId: string;
  level?: string;
}

/** Retention metrics */
export interface RetentionMetrics {
  d1: number;
  d7: number;
  d30: number;
  cohortSize: number;
  cohortDate: string;
}

/** Funnel step data */
export interface FunnelStep {
  name: string;
  entered: number;
  completed: number;
  dropOffRate: number;
  averageTime: number;
}
