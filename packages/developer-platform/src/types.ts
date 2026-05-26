// ============================================================================
// Quant Developer Platform - Type Definitions
// ============================================================================

// ============================================================================
// OAuth Types
// ============================================================================

export interface OAuthApp {
  id: string;
  name: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
  allowedScopes: OAuthScope[];
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  description: string;
  isActive: boolean;
}

export type OAuthScope =
  | 'read:profile'
  | 'write:profile'
  | 'read:data'
  | 'write:data'
  | 'admin'
  | 'read:analytics'
  | 'write:webhooks'
  | 'read:billing'
  | 'write:billing'
  | 'marketplace:publish';

export interface OAuthGrant {
  id: string;
  appId: string;
  userId: string;
  scopes: OAuthScope[];
  grantedAt: number;
  expiresAt: number;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
  issuedAt: number;
}

export interface AuthorizationCode {
  code: string;
  appId: string;
  userId: string;
  scopes: OAuthScope[];
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface TokenRequest {
  grantType: 'authorization_code' | 'refresh_token' | 'client_credentials';
  code?: string;
  refreshToken?: string;
  redirectUri?: string;
  clientId: string;
  clientSecret: string;
  codeVerifier?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
}

// ============================================================================
// API Key Types
// ============================================================================

export interface APIKey {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  scopes: APIKeyScope[];
  ownerId: string;
  createdAt: number;
  expiresAt: number | null;
  lastUsedAt: number | null;
  usageCount: number;
  isActive: boolean;
  environment: 'live' | 'test';
  metadata: Record<string, string>;
}

export interface APIKeyConfig {
  name: string;
  scopes: APIKeyScope[];
  environment: 'live' | 'test';
  expiresIn?: number;
  metadata?: Record<string, string>;
}

export type APIKeyScope =
  | 'read'
  | 'write'
  | 'delete'
  | 'admin'
  | 'analytics:read'
  | 'webhooks:manage'
  | 'billing:read'
  | 'billing:write';

export interface KeyRotation {
  oldKeyId: string;
  newKeyId: string;
  gracePeriodMs: number;
  rotatedAt: number;
  gracePeriodEndsAt: number;
  notificationSent: boolean;
}

export interface KeyValidationResult {
  valid: boolean;
  keyId: string | null;
  scopes: APIKeyScope[];
  reason?: string;
  rateLimited: boolean;
  remainingRequests: number;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  description: string;
  failureCount: number;
  circuitOpen: boolean;
  circuitOpenedAt: number | null;
}

export interface WebhookEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  source: string;
  version: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventId: string;
  status: DeliveryStatus;
  attempts: DeliveryAttempt[];
  createdAt: number;
  completedAt: number | null;
  nextRetryAt: number | null;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: number;
  statusCode: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number;
}

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying' | 'circuit_broken';

export interface WebhookSignature {
  algorithm: 'sha256';
  header: string;
  timestamp: number;
  signature: string;
}

// ============================================================================
// API Versioning Types
// ============================================================================

export interface APIVersion {
  version: string;
  prefix: string;
  releaseDate: number;
  deprecatedAt: number | null;
  sunsetDate: number | null;
  isActive: boolean;
  routes: VersionedRoute[];
  changelog: VersionChangelog[];
}

export interface VersionedRoute {
  method: string;
  path: string;
  handler: string;
  addedInVersion: string;
  removedInVersion?: string;
}

export interface VersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  headerName: string;
  urlPattern: string;
  vendorPrefix: string;
}

export interface DeprecationNotice {
  version: string;
  deprecatedAt: number;
  sunsetDate: number;
  migrationGuideUrl: string;
  alternativeVersion: string;
  affectedEndpoints: string[];
}

export interface MigrationGuide {
  fromVersion: string;
  toVersion: string;
  breakingChanges: VersionChange[];
  nonBreakingChanges: VersionChange[];
  steps: string[];
  estimatedEffort: string;
}

export interface VersionChange {
  type: 'added' | 'removed' | 'changed' | 'deprecated';
  endpoint: string;
  description: string;
  before?: string;
  after?: string;
}

export interface VersionChangelog {
  type: 'added' | 'removed' | 'changed' | 'deprecated';
  description: string;
  endpoint?: string;
}

export interface VersionNegotiation {
  requestedVersion: string | null;
  resolvedVersion: string;
  source: 'header' | 'url' | 'default';
  isDeprecated: boolean;
  deprecationNotice?: DeprecationNotice;
}

// ============================================================================
// GraphQL Types
// ============================================================================

export interface GraphQLTypeDef {
  name: string;
  kind: 'object' | 'input' | 'enum' | 'interface' | 'union' | 'scalar';
  fields: GraphQLField[];
  description?: string;
  implements?: string[];
}

export interface GraphQLField {
  name: string;
  type: string;
  nullable: boolean;
  isList: boolean;
  args?: GraphQLArg[];
  description?: string;
  deprecation?: string;
  permissions?: string[];
}

export interface GraphQLArg {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface GraphQLResolver {
  typeName: string;
  fieldName: string;
  handler: (parent: unknown, args: Record<string, unknown>, context: unknown) => unknown;
}

export interface GraphQLQuery {
  name: string;
  returnType: string;
  args: GraphQLArg[];
  resolver: GraphQLResolver;
  description?: string;
  permissions?: string[];
}

export interface GraphQLMutation {
  name: string;
  inputType: string;
  returnType: string;
  resolver: GraphQLResolver;
  description?: string;
  permissions?: string[];
}

export interface GraphQLSubscription {
  name: string;
  returnType: string;
  filter?: string;
  resolver: GraphQLResolver;
  description?: string;
}

export interface SchemaConfig {
  queryTypeName: string;
  mutationTypeName: string;
  subscriptionTypeName: string;
  enableIntrospection: boolean;
  maxDepth: number;
  maxComplexity: number;
}

// ============================================================================
// SDK Generator Types
// ============================================================================

export interface SDKConfig {
  name: string;
  version: string;
  baseUrl: string;
  authType: 'apiKey' | 'bearer' | 'basic';
  retryConfig: RetryConfig;
  timeout: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  operationId: string;
  description: string;
  requestType?: string;
  responseType: string;
  pathParams?: ParamDefinition[];
  queryParams?: ParamDefinition[];
  bodyType?: string;
  paginated?: boolean;
  tags?: string[];
}

export interface ParamDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface SDKMethod {
  name: string;
  httpMethod: string;
  path: string;
  params: ParamDefinition[];
  bodyType?: string;
  returnType: string;
  description: string;
  paginated: boolean;
}

export interface SDKClient {
  name: string;
  version: string;
  methods: SDKMethod[];
  types: string[];
  imports: string[];
}

export interface GeneratedCode {
  filename: string;
  content: string;
  language: string;
}

// ============================================================================
// Developer Portal Types
// ============================================================================

export interface PortalDoc {
  id: string;
  title: string;
  slug: string;
  content: string;
  section: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  codeSamples: CodeSample[];
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  prerequisites: string[];
  steps: TutorialStep[];
  tags: string[];
}

export interface TutorialStep {
  order: number;
  title: string;
  content: string;
  code?: string;
  language?: string;
  expectedOutput?: string;
}

export interface ChangelogEntry {
  id: string;
  version: string;
  date: number;
  type: 'added' | 'fixed' | 'changed' | 'deprecated' | 'removed' | 'security';
  title: string;
  description: string;
  breakingChange: boolean;
  migrationNotes?: string;
}

export interface CodeSample {
  id: string;
  language: string;
  title: string;
  code: string;
  description?: string;
  runnable: boolean;
}

export interface APIReference {
  endpoint: string;
  method: string;
  description: string;
  params: ParamDefinition[];
  requestBody?: string;
  responseBody: string;
  examples: CodeSample[];
  rateLimit: string;
}

// ============================================================================
// Rate Limiter Types
// ============================================================================

export type RateLimitTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface TierConfig {
  tier: RateLimitTier;
  requestsPerMinute: number;
  burstAllowance: number;
  dailyLimit: number | null;
  concurrentLimit: number;
}

export interface RateLimitResult {
  allowed: boolean;
  tier: RateLimitTier;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter: number | null;
  burstRemaining: number;
}

export interface BurstConfig {
  maxBurst: number;
  refillRate: number;
  windowMs: number;
}

export interface WindowConfig {
  windowSizeMs: number;
  segmentCount: number;
  slidingWindow: boolean;
}

// ============================================================================
// Usage Analytics Types
// ============================================================================

export interface UsageRecord {
  id: string;
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  requestBytes: number;
  responseBytes: number;
  timestamp: number;
  userAgent: string;
  ipAddress: string;
  region: string;
}

export interface UsageStats {
  keyId: string;
  period: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  totalRequestBytes: number;
  totalResponseBytes: number;
  uniqueEndpoints: number;
  topEndpoints: EndpointStats[];
}

export interface EndpointStats {
  endpoint: string;
  method: string;
  requestCount: number;
  avgLatencyMs: number;
  errorRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

export interface LatencyPercentiles {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
}

export interface ErrorBreakdown {
  total: number;
  clientErrors: number;
  serverErrors: number;
  timeouts: number;
  byStatusCode: Record<number, number>;
  topErrors: Array<{ code: number; count: number; message: string }>;
}

export interface TimeSeriesData {
  granularity: 'minute' | 'hour' | 'day' | 'week';
  startTime: number;
  endTime: number;
  dataPoints: Array<{
    timestamp: number;
    value: number;
    metadata?: Record<string, number>;
  }>;
}

// ============================================================================
// Marketplace Types
// ============================================================================

export interface MarketplaceApp {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  developerId: string;
  category: AppCategory;
  tags: string[];
  version: string;
  iconUrl: string;
  screenshotUrls: string[];
  websiteUrl: string;
  supportUrl: string;
  privacyPolicyUrl: string;
  pricing: AppPricing;
  status: AppStatus;
  rating: AppRating;
  installCount: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

export type AppCategory =
  | 'analytics'
  | 'automation'
  | 'communication'
  | 'crm'
  | 'developer-tools'
  | 'finance'
  | 'marketing'
  | 'productivity'
  | 'security'
  | 'integrations';

export type AppStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'suspended';

export interface AppPricing {
  model: 'free' | 'one_time' | 'subscription' | 'usage_based';
  price: number;
  currency: string;
  billingPeriod?: 'monthly' | 'yearly';
  trialDays?: number;
}

export interface AppSubmission {
  id: string;
  appId: string;
  version: string;
  submittedAt: number;
  reviewNotes: string;
  checklist: SubmissionChecklist;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
}

export interface SubmissionChecklist {
  hasDescription: boolean;
  hasScreenshots: boolean;
  hasPrivacyPolicy: boolean;
  hasSupportUrl: boolean;
  passesSecurityScan: boolean;
  meetsPerformanceThreshold: boolean;
}

export interface AppReview {
  id: string;
  submissionId: string;
  reviewerId: string;
  decision: 'approved' | 'rejected' | 'changes_requested';
  feedback: string;
  reviewedAt: number;
  securityNotes?: string;
  performanceNotes?: string;
}

export interface AppRating {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export interface InstallRecord {
  id: string;
  appId: string;
  userId: string;
  installedAt: number;
  uninstalledAt: number | null;
  uninstallReason?: string;
  version: string;
}

export interface RevenueShare {
  appId: string;
  developerId: string;
  totalRevenue: number;
  developerShare: number;
  platformShare: number;
  developerPercentage: number;
  platformPercentage: number;
  period: string;
  payoutStatus: 'pending' | 'processing' | 'paid';
}

// ============================================================================
// Plugin Sandbox Types
// ============================================================================

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: PluginCapability[];
  permissions: PermissionGrant[];
  entryPoint: string;
  resourceLimits: ResourceLimit;
}

export type PluginCapability =
  | 'network'
  | 'storage'
  | 'ui_extension'
  | 'data_access'
  | 'event_subscription'
  | 'background_task'
  | 'file_system'
  | 'crypto';

export interface PermissionGrant {
  capability: PluginCapability;
  scope: string;
  granted: boolean;
  grantedAt: number;
  grantedBy: string;
  expiresAt: number | null;
}

export interface ResourceLimit {
  maxCpuMs: number;
  maxMemoryMB: number;
  maxNetworkRequestsPerSecond: number;
  maxStorageMB: number;
  maxExecutionTimeMs: number;
  maxConcurrentOperations: number;
}

export interface SandboxContext {
  pluginId: string;
  permissions: PermissionGrant[];
  resourceLimits: ResourceLimit;
  startedAt: number;
  cpuUsedMs: number;
  memoryUsedMB: number;
  networkRequestsThisSecond: number;
  storageUsedMB: number;
  isActive: boolean;
  apiProxy: Record<string, unknown>;
}

export interface PluginExecution {
  id: string;
  pluginId: string;
  startedAt: number;
  completedAt: number | null;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'killed';
  result?: unknown;
  error?: string;
  resourceUsage: {
    cpuMs: number;
    memoryPeakMB: number;
    networkRequests: number;
    storageOperations: number;
  };
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: number;
  action: string;
  resource: string;
  allowed: boolean;
  details?: string;
}

// ============================================================================
// CLI Tool Types
// ============================================================================

export interface CLIConfig {
  workingDirectory: string;
  registry: string;
  authToken: string | null;
  verbose: boolean;
  timeout: number;
}

export interface CLICommand {
  command: string;
  args: Record<string, unknown>;
  timestamp: number;
  success: boolean;
}

export interface ScaffoldOptions {
  name: string;
  template: 'basic' | 'api' | 'webhook' | 'fullstack' | 'plugin';
  language?: 'typescript' | 'javascript';
  description?: string;
  author?: string;
}

export interface DeployResult {
  success: boolean;
  deploymentId: string;
  url: string;
  message: string;
  timestamp: number;
}

export interface CLIApp {
  id: string;
  name: string;
  template: string;
  language: string;
  description: string;
  author: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  status: 'development' | 'staging' | 'published' | 'archived';
  deployments: CLIDeployment[];
}

export interface CLIDeployment {
  id: string;
  version: string;
  environment: 'staging' | 'production';
  timestamp: number;
  status: 'active' | 'inactive' | 'failed';
}

export interface ProjectConfig {
  id: string;
  name: string;
  description: string;
  template: string;
  createdAt: number;
  updatedAt: number;
  settings: Record<string, unknown>;
}

// ============================================================================
// Sandbox Environment Types
// ============================================================================

export interface SandboxConfig {
  name: string;
  runtime?: 'node' | 'deno' | 'worker';
  timeout?: number;
  memoryLimitMB?: number;
  cpuLimitMs?: number;
  networkEnabled?: boolean;
  storageEnabled?: boolean;
  maxStorageMB?: number;
  environment?: Record<string, string>;
}

export interface Sandbox {
  id: string;
  name: string;
  runtime: string;
  status: 'ready' | 'running' | 'paused' | 'destroyed';
  createdAt: number;
  updatedAt: number;
  resourceLimits: SandboxResourceLimits;
  environment: Record<string, string>;
  executionCount: number;
  totalCpuMs: number;
  totalMemoryPeakMB: number;
}

export interface SandboxResourceLimits {
  maxMemoryMB: number;
  maxCpuMs: number;
  maxExecutionTimeMs: number;
  maxNetworkRequests: number;
  maxStorageMB: number;
  maxConcurrentExecutions: number;
}

export interface SandboxExecution {
  id: string;
  sandboxId: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  startedAt: number;
  completedAt: number;
  durationMs: number;
  output: string;
  error: string | null;
  resourceUsage: {
    cpuMs: number;
    memoryPeakMB: number;
    networkRequests: number;
  };
  exitCode: number;
}

export interface SandboxLog {
  id: string;
  sandboxId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
}

export interface SandboxMetrics {
  sandboxId: string;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  avgDurationMs: number;
  totalCpuMs: number;
  peakMemoryMB: number;
  uptime: number;
  status: string;
}

// ============================================================================
// API Documentation Types
// ============================================================================

export interface DocEndpoint {
  id?: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: DocParameter[];
  requestBody?: {
    contentType: string;
    schema: Record<string, unknown>;
    required: boolean;
  };
  responses?: Record<string, { description: string; schema?: Record<string, unknown> }>;
  authentication?: 'none' | 'apiKey' | 'bearer' | 'oauth2';
  rateLimit?: string;
}

export interface DocParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description?: string;
}

export interface DocSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  tags: Array<{ name: string; description: string }>;
  components: {
    securitySchemes: Record<string, unknown>;
  };
}

export interface DocCodeSample {
  language: string;
  code: string;
  endpointId: string;
  title: string;
}

export interface InteractiveDoc {
  title: string;
  version: string;
  baseUrl: string;
  sections: Array<{
    name: string;
    endpoints: Array<{
      id: string;
      method: string;
      path: string;
      summary: string;
      tryItEnabled: boolean;
      codeSamples: string[];
    }>;
  }>;
  totalEndpoints: number;
}

// ============================================================================
// Developer Analytics Types
// ============================================================================

export interface AnalyticsEvent {
  id: string;
  appId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  requestBytes: number;
  responseBytes: number;
  userId: string | null;
  region: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface UsageOverview {
  appId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  totalRequestBytes: number;
  totalResponseBytes: number;
  uniqueEndpoints: number;
  uniqueUsers: number;
  successRate: number;
  period: { start: number; end: number };
}

export interface ErrorRateData {
  appId: string;
  totalErrors: number;
  errorRate: number;
  clientErrors: number;
  serverErrors: number;
  byStatusCode: Record<number, number>;
  topErrorEndpoints: Array<{ endpoint: string; count: number; rate: number }>;
  period: { start: number; end: number };
}

export interface LatencyData {
  appId: string;
  endpoint: string;
  sampleCount: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  mean: number;
}

export interface TrendData {
  appId: string;
  granularity: 'minute' | 'hour' | 'day';
  dataPoints: Array<{
    timestamp: number;
    requests: number;
    errors: number;
    avgLatencyMs: number;
  }>;
  totalDataPoints: number;
}

export interface CostProjection {
  appId: string;
  projectionDays: number;
  currentDailyRequests: number;
  projectedRequests: number;
  projectedBandwidthGB: number;
  estimatedCost: {
    requests: number;
    bandwidth: number;
    total: number;
    currency: string;
  };
  confidence: 'low' | 'medium' | 'high';
}

export interface AnalyticsDashboard {
  appId: string;
  generatedAt: number;
  overview: UsageOverview | null;
  errorRates: ErrorRateData | null;
  latency: LatencyData | null;
  trends: TrendData | null;
  costProjection: CostProjection | null;
}
