import type {
  BuildResult,
  CodexEngine,
  CodexProject,
  CodexStep,
  DeployResult,
  DeployTarget,
  IterationFeedback,
  ProjectArtifact,
  ProjectOptions,
  TestResult,
} from './types.js';
import { ProjectScaffolder } from './scaffolder.js';
import { ProjectBuilder } from './builder.js';
import { ProjectTester } from './tester.js';
import { ProjectDeployer } from './deployer.js';

// ============================================================
// Codex Engine Implementation
// ============================================================

export class CodexEngineImpl implements CodexEngine {
  private projects: Map<string, CodexProject> = new Map();
  private scaffolder: ProjectScaffolder;
  private builder: ProjectBuilder;
  private tester: ProjectTester;
  private deployer: ProjectDeployer;
  private idCounter = 0;

  constructor() {
    this.scaffolder = new ProjectScaffolder();
    this.builder = new ProjectBuilder();
    this.tester = new ProjectTester();
    this.deployer = new ProjectDeployer();
  }

  createProject(name: string, description: string, options: ProjectOptions): CodexProject {
    this.idCounter++;
    const id = `codex-project-${this.idCounter}`;
    const now = Date.now();

    const project: CodexProject = {
      id,
      name,
      description,
      status: 'scaffolding',
      steps: [],
      artifacts: [],
      config: options,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(id, project);
    return project;
  }

  async scaffold(projectId: string): Promise<ProjectArtifact[]> {
    const project = this.requireProject(projectId);

    this.updateStatus(project, 'scaffolding');
    const step = this.addStep(project, 'scaffold');

    try {
      const artifacts = this.scaffolder.scaffold(project.name, project.config);
      project.artifacts = artifacts;

      this.completeStep(step);
      this.updateStatus(project, 'building');
      return artifacts;
    } catch (err) {
      this.failStep(step, err);
      this.updateStatus(project, 'failed');
      return [];
    }
  }

  async build(projectId: string): Promise<BuildResult> {
    const project = this.requireProject(projectId);

    this.updateStatus(project, 'building');
    const step = this.addStep(project, 'generate');

    try {
      const result = await this.builder.build(project.artifacts, {
        features: project.config.features,
      });

      if (result.success) {
        project.artifacts = result.artifacts;
        this.completeStep(step, result);
        this.updateStatus(project, 'testing');
      } else {
        this.failStep(step, new Error(result.errors.join('; ')));
        this.updateStatus(project, 'failed');
      }

      return result;
    } catch (err) {
      this.failStep(step, err);
      this.updateStatus(project, 'failed');
      return {
        success: false,
        artifacts: [],
        errors: [err instanceof Error ? err.message : String(err)],
        duration: 0,
      };
    }
  }

  async test(projectId: string): Promise<TestResult> {
    const project = this.requireProject(projectId);

    this.updateStatus(project, 'testing');
    const step = this.addStep(project, 'test');

    try {
      const result = await this.tester.runTests(project.artifacts);

      if (result.success) {
        this.completeStep(step, result);
        this.updateStatus(project, 'complete');
      } else {
        this.failStep(step, new Error(result.errors.join('; ')));
        this.updateStatus(project, 'failed');
      }

      return result;
    } catch (err) {
      this.failStep(step, err);
      this.updateStatus(project, 'failed');
      return {
        success: false,
        totalTests: 0,
        passed: 0,
        failed: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        duration: 0,
      };
    }
  }

  async deploy(projectId: string, target: DeployTarget): Promise<DeployResult> {
    const project = this.requireProject(projectId);

    this.updateStatus(project, 'deploying');
    const step = this.addStep(project, 'deploy');

    try {
      const result = await this.deployer.deploy(project.artifacts, target);

      if (result.success) {
        this.completeStep(step, result);
        this.updateStatus(project, 'complete');
      } else {
        this.failStep(step, new Error(result.error ?? 'Deploy failed'));
        this.updateStatus(project, 'failed');
      }

      return result;
    } catch (err) {
      this.failStep(step, err);
      this.updateStatus(project, 'failed');
      return {
        success: false,
        target: target.type,
        artifacts: [],
        error: err instanceof Error ? err.message : String(err),
        duration: 0,
      };
    }
  }

  async iterate(feedback: IterationFeedback): Promise<BuildResult> {
    const project = this.requireProject(feedback.projectId);

    this.updateStatus(project, 'iterating');
    const step = this.addStep(project, 'iterate', { feedback: feedback.feedback });

    try {
      const buildResult = await this.builder.build(project.artifacts, {
        features: project.config.features,
      });

      if (buildResult.success) {
        project.artifacts = buildResult.artifacts;
        const testResult = await this.tester.runTests(project.artifacts);

        if (testResult.success) {
          this.completeStep(step, { buildResult, testResult });
          this.updateStatus(project, 'complete');
        } else {
          this.completeStep(step, { buildResult, testResult });
          this.updateStatus(project, 'testing');
        }
      } else {
        this.failStep(step, new Error(buildResult.errors.join('; ')));
        this.updateStatus(project, 'failed');
      }

      return buildResult;
    } catch (err) {
      this.failStep(step, err);
      this.updateStatus(project, 'failed');
      return {
        success: false,
        artifacts: [],
        errors: [err instanceof Error ? err.message : String(err)],
        duration: 0,
      };
    }
  }

  getProject(projectId: string): CodexProject | undefined {
    return this.projects.get(projectId);
  }

  listProjects(): CodexProject[] {
    return [...this.projects.values()];
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private requireProject(projectId: string): CodexProject {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  }

  private updateStatus(project: CodexProject, status: CodexProject['status']): void {
    project.status = status;
    project.updatedAt = Date.now();
  }

  private addStep(project: CodexProject, type: CodexStep['type'], input?: unknown): CodexStep {
    const step: CodexStep = {
      id: `step-${project.steps.length + 1}`,
      type,
      status: 'running',
      input,
    };
    project.steps.push(step);
    return step;
  }

  private completeStep(step: CodexStep, output?: unknown): void {
    step.status = 'completed';
    step.output = output;
  }

  private failStep(step: CodexStep, err: unknown): void {
    step.status = 'failed';
    step.error = err instanceof Error ? err.message : String(err);
  }
}
