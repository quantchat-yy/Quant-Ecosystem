// ============================================================================
// Analytics Package - Barrel Export
// ============================================================================

export { EventTracker } from './core/event-tracker';
export { FunnelAnalyzer } from './core/funnel-analyzer';
export { ABTestingEngine } from './core/ab-testing';
export { CohortAnalyzer } from './core/cohort-analyzer';
export { AttributionEngine } from './core/attribution';
export { RealtimeDashboard } from './core/realtime-dashboard';

export type {
  AnalyticsEvent,
  EventType,
  EventContext,
  EventMetadata,
  PageViewEvent,
  ClickEvent,
  ScrollEvent,
  PageInfo,
  DeviceInfo,
  CampaignInfo,
  GeoInfo,
  FunnelStep,
  FunnelCondition,
  FunnelDefinition,
  FunnelConversionData,
  StepConversion,
  ABTest,
  ABTestVariant,
  ABTestStatus,
  ABTestResult,
  VariantResult,
  CohortDefinition,
  CohortGroupBy,
  CohortFilter,
  CohortMetrics,
  PeriodMetric,
  AttributionModelType,
  AttributionModel,
  AttributionTouch,
  AttributionReport,
  ChannelAttribution,
  DashboardMetrics,
  PageMetric,
  EventMetric,
  EventBatch,
  EventTrackerConfig,
  TimeSeriesPoint,
  MetricsSubscriber,
  AnalyticsConfig,
} from './types';
