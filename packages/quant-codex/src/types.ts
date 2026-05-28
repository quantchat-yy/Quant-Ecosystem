import { z } from 'zod';

// ============================================================
// Project Status
// ============================================================

export type CodexStatus =
  | 'scaffolding'
  | 'building'
  | 'testing'
  | 'deploying'
  | 'complete'
  | 'failed'
  | 'iterating';

// ============================================================
// Project Options
// ============================================================

export type ProjectTemplate = 'react-app' | 'node-api' | 'fullstack' | 'library' | 'cli' | 'custom';

export type ProjectLanguage = 'typescript' | 'javascript';

export type ProjectFramework = 'react' | 'next' | 'express' | 'fastify' | 'none' | string;

export type TestingFramework = 'vitest' | 'jest' | 'mocha' | 'none';

export type DeploymentTarget = 'quant-store' | 'self-host' | 'export';

export interface ProjectOptions {
  template: ProjectTemplate;
  language: ProjectLanguage;
  framework: ProjectFramework;
  features: string[];
  testing: TestingFramework;
  deployment: DeploymentTarget;
}

// ============================================================
// Deploy Target
// ============================================================

export interface DeployTarget {
  type: DeploymentTarget;
  config: Record<string, unknown>;
}

// ============================================================
// Project Artifacts
// ============================================================

export type ArtifactType = 'file' | 'directory' | 'config' | 'test' | 'asset';

export interface ProjectArtifact {
  id: string;
  type: ArtifactType;
  path: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Codex Step
// ============================================================

export type StepType = 'scaffold' | 'generate' | 'test' | 'deploy' | 'iterate';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface CodexStep {
  id: string;
  type: StepType;
  status: StepStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
}

// ============================================================
// Codex Project
// ============================================================

export interface CodexProject {
  id: string;
  name: string;
  description: string;
  status: CodexStatus;
  steps: CodexStep[];
  artifacts: ProjectArtifact[];
  config: ProjectOptions;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Build Result
// ============================================================

export interface BuildResult {
  success: boolean;
  artifacts: ProjectArtifact[];
  errors: string[];
  duration: number;
}

// ============================================================
// Test Result
// ============================================================

export interface TestResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
  suggestions?: string[];
}

// ============================================================
// Deploy Result
// ============================================================

export interface DeployResult {
  success: boolean;
  target: DeploymentTarget;
  url?: string;
  artifacts: ProjectArtifact[];
  error?: string;
  duration: number;
}

// ============================================================
// Iteration Feedback
// ============================================================

export interface IterationFeedback {
  projectId: string;
  feedback: string;
  targetFiles?: string[];
  priority?: 'low' | 'medium' | 'high';
}

// ============================================================
// Code Generator Interface (pluggable)
// ============================================================

export interface CodeGenerateResult {
  success: boolean;
  content: string;
  error?: string;
}

export interface CodeGenerator {
  generate(prompt: string, context?: Record<string, unknown>): Promise<CodeGenerateResult>;
}

// ============================================================
// Codex Engine Interface
// ============================================================

export interface CodexEngine {
  createProject(name: string, description: string, options: ProjectOptions): CodexProject;
  scaffold(projectId: string): Promise<ProjectArtifact[]>;
  build(projectId: string): Promise<BuildResult>;
  test(projectId: string): Promise<TestResult>;
  deploy(projectId: string, target: DeployTarget): Promise<DeployResult>;
  iterate(feedback: IterationFeedback): Promise<BuildResult>;
  getProject(projectId: string): CodexProject | undefined;
  listProjects(): CodexProject[];
}

// ============================================================
// Zod Schemas
// ============================================================

export const ProjectOptionsSchema = z.object({
  template: z.enum(['react-app', 'node-api', 'fullstack', 'library', 'cli', 'custom']),
  language: z.enum(['typescript', 'javascript']),
  framework: z.string().min(1),
  features: z.array(z.string()),
  testing: z.enum(['vitest', 'jest', 'mocha', 'none']),
  deployment: z.enum(['quant-store', 'self-host', 'export']),
});

export const DeployTargetSchema = z.object({
  type: z.enum(['quant-store', 'self-host', 'export']),
  config: z.record(z.unknown()),
});

export const IterationFeedbackSchema = z.object({
  projectId: z.string().min(1),
  feedback: z.string().min(1),
  targetFiles: z.array(z.string()).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});
