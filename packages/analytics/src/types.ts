// ============================================================================
// Analytics Package - Type Definitions
// ============================================================================

/** Base analytics event interface */
export interface AnalyticsEvent {
  id: string;
  type: EventType;
  userId: string;
  sessionId: string;
  timestamp: number;
  properties: Record<string, unknown>;
  context: EventContext;
  metadata: EventMetadata;
}

/** Supported event types */
export type EventType =
  | 'page_view'
  | 'click'
  | 'scroll'
  | 'form_submit'
  | 'custom'
  | 'identify'
  | 'group'
  | 'screen'
  | 'track'
  | 'alias'
  | 'time_spent'
  | 'error'
  | 'conversion'
  | 'revenue';

/** Event context with device and session info */
export interface EventContext {
  ip?: string;
  userAgent?: string;
  locale?: string;
  timezone?: string;
  referrer?: string;
  page?: PageInfo;
  device?: DeviceInfo;
  campaign?: CampaignInfo;
  geo?: GeoInfo;
}

/** Page information */
export interface PageInfo {
  url: string;
  path: string;
  title: string;
  search?: string;
  hash?: string;
}

/** Device information */
export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'tv' | 'bot';
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  screenWidth: number;
  screenHeight: number;
}

/** Campaign tracking information */
export interface CampaignInfo {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

/** Geographic information */
export interface GeoInfo {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

/** Event metadata */
export interface EventMetadata {
  sentAt: number;
  receivedAt: number;
  processedAt?: number;
  version: string;
  sdk: string;
  batchId?: string;
}

/** Page view event */
export interface PageViewEvent extends AnalyticsEvent {
  type: 'page_view';
  properties: {
    url: string;
    path: string;
    title: string;
    referrer?: string;
    duration?: number;
    scrollDepth?: number;
  };
}

/** Click event */
export interface ClickEvent extends AnalyticsEvent {
  type: 'click';
  properties: {
    elementId?: string;
    elementClass?: string;
    elementTag: string;
    elementText?: string;
    href?: string;
    x: number;
    y: number;
  };
}

/** Scroll event */
export interface ScrollEvent extends AnalyticsEvent {
  type: 'scroll';
  properties: {
    depth: number;
    maxDepth: number;
    direction: 'up' | 'down';
    velocity: number;
  };
}

/** Funnel step definition */
export interface FunnelStep {
  id: string;
  name: string;
  eventType: EventType;
  conditions?: FunnelCondition[];
  order: number;
  timeoutMs?: number;
}

/** Funnel condition for filtering */
export interface FunnelCondition {
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'regex';
  value: unknown;
}

/** Funnel definition */
export interface FunnelDefinition {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  maxDurationMs: number;
  createdAt: number;
  updatedAt: number;
}

/** Funnel conversion data */
export interface FunnelConversionData {
  funnelId: string;
  totalEntered: number;
  totalCompleted: number;
  conversionRate: number;
  stepConversions: StepConversion[];
  averageDurationMs: number;
  medianDurationMs: number;
}

/** Per-step conversion metrics */
export interface StepConversion {
  stepId: string;
  stepName: string;
  entered: number;
  completed: number;
  dropped: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeMs: number;
}

/** A/B Test definition */
export interface ABTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  variants: ABTestVariant[];
  status: ABTestStatus;
  targetMetric: string;
  secondaryMetrics: string[];
  trafficAllocation: number;
  startDate: number;
  endDate?: number;
  minimumSampleSize: number;
  confidenceLevel: number;
}

/** A/B Test variant */
export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number;
  isControl: boolean;
  conversions: number;
  impressions: number;
  revenue: number;
}

/** A/B Test status */
export type ABTestStatus = 'draft' | 'running' | 'paused' | 'stopped' | 'completed';

/** A/B Test result with statistical significance */
export interface ABTestResult {
  testId: string;
  winner: string | null;
  isSignificant: boolean;
  pValue: number;
  confidenceLevel: number;
  chiSquare: number;
  degreesOfFreedom: number;
  variantResults: VariantResult[];
  recommendedAction: string;
}

/** Individual variant result */
export interface VariantResult {
  variantId: string;
  variantName: string;
  conversionRate: number;
  improvement: number;
  confidence: number;
  sampleSize: number;
}

/** Cohort definition */
export interface CohortDefinition {
  id: string;
  name: string;
  description: string;
  groupBy: CohortGroupBy;
  startDate: number;
  endDate?: number;
  filters: CohortFilter[];
  retentionPeriod: 'day' | 'week' | 'month';
}

/** Cohort grouping strategy */
export type CohortGroupBy = 'signup_date' | 'first_purchase' | 'first_action' | 'custom_event';

/** Cohort filter */
export interface CohortFilter {
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
  value: unknown;
}

/** Cohort metrics */
export interface CohortMetrics {
  cohortId: string;
  cohortName: string;
  totalUsers: number;
  retentionCurve: number[];
  churnRate: number;
  averageLifetimeValue: number;
  periodMetrics: PeriodMetric[];
}

/** Per-period metric in cohort analysis */
export interface PeriodMetric {
  period: number;
  activeUsers: number;
  retentionRate: number;
  revenue: number;
  eventsPerUser: number;
}

/** Attribution model types */
export type AttributionModelType =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'
  | 'custom';

/** Attribution touch point */
export interface AttributionTouch {
  id: string;
  userId: string;
  channel: string;
  campaign?: string;
  source?: string;
  medium?: string;
  timestamp: number;
  isConversion: boolean;
  revenue?: number;
}

/** Attribution model configuration */
export interface AttributionModel {
  type: AttributionModelType;
  lookbackWindowMs: number;
  decayHalfLifeMs?: number;
  positionWeights?: { first: number; middle: number; last: number };
  customWeights?: Map<string, number>;
}

/** Attribution report */
export interface AttributionReport {
  modelType: AttributionModelType;
  channels: ChannelAttribution[];
  totalConversions: number;
  totalRevenue: number;
  generatedAt: number;
}

/** Channel attribution data */
export interface ChannelAttribution {
  channel: string;
  credit: number;
  creditPercentage: number;
  conversions: number;
  revenue: number;
  touchpoints: number;
  averagePosition: number;
}

/** Dashboard metrics snapshot */
export interface DashboardMetrics {
  timestamp: number;
  activeUsers: number;
  pageViewsPerMinute: number;
  eventsPerMinute: number;
  topPages: PageMetric[];
  topEvents: EventMetric[];
  errorRate: number;
  averageSessionDuration: number;
}

/** Page metric */
export interface PageMetric {
  path: string;
  views: number;
  uniqueVisitors: number;
  averageDuration: number;
  bounceRate: number;
}

/** Event metric */
export interface EventMetric {
  eventType: string;
  count: number;
  uniqueUsers: number;
}

/** Event batch for bulk processing */
export interface EventBatch {
  id: string;
  events: AnalyticsEvent[];
  sentAt: number;
  source: string;
  size: number;
}

/** Event tracker configuration */
export interface EventTrackerConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
  retryAttempts: number;
  retryDelayMs: number;
  enableCompression: boolean;
  endpoint?: string;
}

/** Time series data point */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

/** Subscription callback for real-time updates */
export type MetricsSubscriber = (metrics: DashboardMetrics) => void;

/** Analytics engine configuration */
export interface AnalyticsConfig {
  projectId: string;
  apiKey: string;
  enableRealtime: boolean;
  samplingRate: number;
  excludePaths: string[];
  customDimensions: string[];
}
