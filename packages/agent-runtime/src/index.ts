// ============================================================================
// @quant/agent-runtime - Core Agent Runtime Framework
// ============================================================================

// Permissions
export {
  PermissionLevel,
  PermissionLevelSchema,
  canAct,
  canExecuteHighRisk,
  isFullAuto,
  PermissionGuard,
} from './permissions.js';
export type { ActionRequest } from './permissions.js';

// State Machine
export { AgentState, AgentStateMachine } from './state-machine.js';

// Audit Trail
export { AuditTrail, AuditEntrySchema } from './audit-trail.js';
export type { AuditEntry } from './audit-trail.js';

// Undo Engine
export { UndoEngine } from './undo-engine.js';
export type { UndoAction } from './undo-engine.js';

// Trust Score
export { TrustScore, scoreToPermissionLevel, permissionLevelToScore } from './trust-score.js';

// Spending Limit
export { SpendingLimit, SpendingLimitConfigSchema } from './spending-limit.js';
export type { SpendingLimitConfig, SpendingPeriod } from './spending-limit.js';

// Kill Switch
export { KillSwitch } from './kill-switch.js';

// Approval Queue
export { ApprovalQueue, ApprovalRequestSchema } from './approval-queue.js';
export type { ApprovalRequest, ApprovalStatus, QueuedRequest } from './approval-queue.js';

// Conflict Resolver
export { ConflictResolver } from './conflict-resolver.js';
export type { ResourceLock, ConflictResult } from './conflict-resolver.js';

// Sandbox
export { AgentSandbox } from './sandbox.js';
export type { SandboxAction } from './sandbox.js';

// Task Decomposer
export { TaskDecomposer, SubTaskSchema } from './task-decomposer.js';
export type { SubTask, AIInferenceAdapter } from './task-decomposer.js';

// Worker Agent
export { WorkerAgent } from './worker-agent.js';
export type { AgentStatus, AgentTask } from './worker-agent.js';

// Orchestrator
export { Orchestrator } from './orchestrator.js';
export type { OrchestratorTask, TaskStatus } from './orchestrator.js';

// ============================================================================
// Device Control Layer
// ============================================================================

// Tier 1 - API Controller
export { Tier1ApiController, ApiDefinitionSchema } from './device/tier1-api.js';
export type { ApiDefinition, ApiCallResult } from './device/tier1-api.js';

// Tier 2 - OS Controller
export { Tier2OsController, PlatformSchema } from './device/tier2-os.js';
export type { Platform, OsCommandResult, SystemInfo } from './device/tier2-os.js';

// Tier 3 - Vision Controller
export { Tier3VisionController } from './device/tier3-vision.js';
export type {
  VisionAnalysisResult,
  DetectedElement,
  ClickCoords,
  VisionInferenceAdapter,
} from './device/tier3-vision.js';

// Screen Capture
export { ScreenCapture } from './device/screen-capture.js';
export type { ScreenBounds, CaptureFrame, ScreenDiff } from './device/screen-capture.js';

// Action Executor
export { ActionExecutor } from './device/action-executor.js';
export type { ActionResult, Coordinates, ScrollDirection } from './device/action-executor.js';

// App Launcher
export { AppLauncher, AppRegistryEntrySchema } from './device/app-launcher.js';
export type { AppRegistryEntry, LaunchResult } from './device/app-launcher.js';

// ============================================================================
// Pre-Built Pilot Agents
// ============================================================================

export { EmailPilot } from './agents/email-pilot.js';
export type { EmailItem, EmailProcessingResult } from './agents/email-pilot.js';

export { CodePilot } from './agents/code-pilot.js';
export type {
  CodeChange,
  CodeReviewResult,
  CodeIssue,
  CodeSuggestion,
} from './agents/code-pilot.js';

export { SchedulePilot } from './agents/schedule-pilot.js';
export type { CalendarEvent, ScheduleResult } from './agents/schedule-pilot.js';

export { ShoppingPilot } from './agents/shopping-pilot.js';
export type { Product, ShoppingResult } from './agents/shopping-pilot.js';

export { FinancePilot } from './agents/finance-pilot.js';
export type { Expense, FinanceInsight } from './agents/finance-pilot.js';

export { SocialPilot } from './agents/social-pilot.js';
export type { SocialPost, SocialResult } from './agents/social-pilot.js';

export { ContentPilot } from './agents/content-pilot.js';
export type { ContentDraft, ContentResult } from './agents/content-pilot.js';

export { TravelPilot } from './agents/travel-pilot.js';
export type { TripPlan, TripActivity, TravelResult } from './agents/travel-pilot.js';

export { ResearchPilot } from './agents/research-pilot.js';
export type { ResearchSource, ResearchResult } from './agents/research-pilot.js';

export { HealthPilot } from './agents/health-pilot.js';
export type { HealthMetric, HealthReminder, HealthResult } from './agents/health-pilot.js';

export { MeetingPilot } from './agents/meeting-pilot.js';
export type { Meeting, MeetingNotes, ActionItem, MeetingResult } from './agents/meeting-pilot.js';

export { LearningPilot } from './agents/learning-pilot.js';
export type { LearningResource, LearningPath, LearningResult } from './agents/learning-pilot.js';

// ============================================================================
// Agent Marketplace
// ============================================================================

export { AgentSpecSchema, AgentCapabilitySchema } from './marketplace/agent-spec.js';
export type { AgentSpec, AgentCapability, PublishedAgentSpec } from './marketplace/agent-spec.js';

export { AgentPublisher } from './marketplace/publisher.js';
export type { PublishResult } from './marketplace/publisher.js';

export { AgentInstaller } from './marketplace/installer.js';
export type { InstalledAgent, InstallResult } from './marketplace/installer.js';
