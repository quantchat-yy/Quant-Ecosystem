// ============================================================================
// Advanced AI - Type Definitions
// ============================================================================

/** Multimodal input types */
export interface MultimodalInput {
  type: 'image' | 'audio' | 'video' | 'text';
  data: Buffer | string;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

/** Multimodal output types */
export interface MultimodalOutput {
  type: 'image' | 'audio' | 'video' | 'text';
  content: string | Buffer;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/** Vision analysis result */
export interface VisionResult {
  description: string;
  objects: DetectedObject[];
  labels: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
}

/** Detected object in image/video */
export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

/** Bounding box coordinates */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Audio transcription/analysis result */
export interface AudioResult {
  transcript: string;
  language: string;
  confidence: number;
  segments?: AudioSegment[];
  metadata?: Record<string, unknown>;
}

/** Audio segment with timing */
export interface AudioSegment {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

/** Video analysis result */
export interface VideoResult {
  description: string;
  scenes: VideoScene[];
  duration: number;
  confidence: number;
  answers?: string[];
  metadata?: Record<string, unknown>;
}

/** Video scene segment */
export interface VideoScene {
  description: string;
  startMs: number;
  endMs: number;
  objects: DetectedObject[];
}

/** Generation result for image/video/audio creation */
export interface GenerationResult {
  id: string;
  data: string;
  format: string;
  size: number;
  metadata?: Record<string, unknown>;
}

/** Image generation configuration */
export interface ImageGenerationConfig {
  width?: number;
  height?: number;
  style?: string;
  quality?: 'standard' | 'hd';
  format?: 'png' | 'jpeg' | 'webp';
}

/** Video generation configuration */
export interface VideoGenerationConfig {
  duration?: number;
  resolution?: string;
  fps?: number;
  style?: string;
}

/** Speech generation configuration */
export interface SpeechGenerationConfig {
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

// ============================================================================
// Autonomous Agent Types
// ============================================================================

/** Agent plan for task execution */
export interface AgentPlan {
  id: string;
  goal: string;
  steps: AgentStep[];
  status: 'planning' | 'executing' | 'completed' | 'failed' | 'paused';
  createdAt: number;
  completedAt?: number;
}

/** Individual step in an agent plan */
export interface AgentStep {
  id: string;
  action: string;
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

/** Tool available to an autonomous agent */
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/** Tool parameter definition */
export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
}

/** Result from tool execution */
export interface ToolResult {
  success: boolean;
  output: unknown;
  error?: string;
  executionTimeMs: number;
}

/** Web browsing result */
export interface WebBrowseResult {
  url: string;
  title: string;
  content: string;
  links: string[];
  statusCode: number;
}

/** Code execution result */
export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTimeMs: number;
}

/** Agent reflection result */
export interface ReflectionResult {
  planId: string;
  assessment: string;
  suggestions: string[];
  confidence: number;
  shouldContinue: boolean;
}

/** Progress report for agent */
export interface ProgressReport {
  planId: string;
  completedSteps: number;
  totalSteps: number;
  currentStep: string;
  estimatedRemainingMs: number;
  status: AgentPlan['status'];
}

/** Agent capability */
export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

// ============================================================================
// Memory System Types
// ============================================================================

/** Memory entry */
export interface Memory {
  id: string;
  userId: string;
  content: string;
  embedding?: number[];
  tags: string[];
  timestamp: number;
  accessCount: number;
  importance: number;
}

/** Knowledge graph node */
export interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, unknown>;
}

/** Knowledge graph edge */
export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

/** Knowledge graph structure */
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  metadata: Record<string, unknown>;
}

/** User personalization profile */
export interface PersonalizationProfile {
  userId: string;
  preferences: Record<string, unknown>;
  interests: string[];
  communicationStyle: string;
  updatedAt: number;
}

/** Memory statistics */
export interface MemoryStats {
  totalMemories: number;
  totalTags: number;
  averageImportance: number;
  oldestMemoryAt: number;
  newestMemoryAt: number;
}

/** Memory consolidation result */
export interface ConsolidationResult {
  mergedCount: number;
  removedCount: number;
  updatedCount: number;
  summary: string;
}

// ============================================================================
// Model Marketplace Types
// ============================================================================

/** Model listing in marketplace */
export interface ModelListing {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'multimodal' | 'embedding';
  provider: string;
  capabilities: string[];
  pricing: ModelPricing;
  rating: number;
  downloads?: number;
}

/** Model pricing information */
export interface ModelPricing {
  perInputToken?: number;
  perOutputToken?: number;
  perRequest?: number;
  perHour?: number;
}

/** Fine-tune configuration */
export interface FineTuneConfig {
  baseModel: string;
  dataset: string;
  hyperparameters: FineTuneHyperparameters;
  outputName: string;
}

/** Fine-tune hyperparameters */
export interface FineTuneHyperparameters {
  epochs: number;
  batchSize: number;
  learningRate: number;
  warmupSteps?: number;
}

/** Fine-tune job status */
export interface FineTuneJob {
  id: string;
  config: FineTuneConfig;
  status: 'queued' | 'training' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  metrics?: TrainingMetrics;
  createdAt: number;
  completedAt?: number;
}

/** Training metrics */
export interface TrainingMetrics {
  loss: number;
  accuracy: number;
  epoch: number;
  step: number;
}

/** Model deployment configuration */
export interface ModelDeployment {
  id: string;
  modelId: string;
  endpoint: string;
  status: 'provisioning' | 'running' | 'stopped' | 'failed';
  replicas: number;
  config: DeploymentConfig;
}

/** Deployment configuration */
export interface DeploymentConfig {
  minReplicas?: number;
  maxReplicas?: number;
  gpuType?: string;
  region?: string;
  autoScale?: boolean;
}

/** Model download information */
export interface ModelDownload {
  modelId: string;
  url: string;
  size: number;
  checksum: string;
  format: string;
}

/** Model metrics */
export interface ModelMetrics {
  modelId: string;
  totalRequests: number;
  averageLatencyMs: number;
  errorRate: number;
  throughput: number;
  uptime: number;
}

/** Model rating/review */
export interface ModelRating {
  modelId: string;
  userId: string;
  rating: number;
  review: string;
  createdAt: number;
}

/** Model endpoint */
export interface Endpoint {
  id: string;
  modelId: string;
  url: string;
  status: 'active' | 'inactive';
  config: DeploymentConfig;
}

/** Model listing filter */
export interface ModelFilter {
  type?: ModelListing['type'];
  provider?: string;
  minRating?: number;
  capabilities?: string[];
  maxPrice?: number;
}
