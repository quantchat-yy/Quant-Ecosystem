import type { BuildResult, CodeGenerator, CodeGenerateResult, ProjectArtifact } from './types.js';

// ============================================================
// Default stub code generator
// ============================================================

export class StubCodeGenerator implements CodeGenerator {
  async generate(prompt: string): Promise<CodeGenerateResult> {
    return {
      success: true,
      content: `// Generated from: ${prompt}\nexport {};\n`,
    };
  }
}

// ============================================================
// Build Progress Tracker
// ============================================================

export interface BuildProgress {
  total: number;
  completed: number;
  current?: string;
  errors: string[];
}

// ============================================================
// Project Builder
// ============================================================

export class ProjectBuilder {
  private generator: CodeGenerator;
  private progress: BuildProgress;

  constructor(generator?: CodeGenerator) {
    this.generator = generator ?? new StubCodeGenerator();
    this.progress = { total: 0, completed: 0, errors: [] };
  }

  getProgress(): BuildProgress {
    return { ...this.progress };
  }

  async build(
    artifacts: ProjectArtifact[],
    options?: { features?: string[] },
  ): Promise<BuildResult> {
    const startTime = Date.now();
    this.progress = { total: artifacts.length, completed: 0, errors: [] };

    const builtArtifacts: ProjectArtifact[] = [];

    for (const artifact of artifacts) {
      this.progress.current = artifact.path;

      if (artifact.type === 'directory' || artifact.type === 'config') {
        builtArtifacts.push(artifact);
        this.progress.completed++;
        continue;
      }

      try {
        const generated = await this.generateForArtifact(artifact, options);
        builtArtifacts.push({
          ...artifact,
          content: generated.content,
          metadata: {
            ...artifact.metadata,
            generated: true,
            generatedAt: Date.now(),
          },
        });
        this.progress.completed++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.progress.errors.push(`${artifact.path}: ${errorMsg}`);
        builtArtifacts.push(artifact);
        this.progress.completed++;
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: this.progress.errors.length === 0,
      artifacts: builtArtifacts,
      errors: [...this.progress.errors],
      duration,
    };
  }

  private async generateForArtifact(
    artifact: ProjectArtifact,
    options?: { features?: string[] },
  ): Promise<CodeGenerateResult> {
    const prompt = this.buildPrompt(artifact, options);
    return this.generator.generate(prompt);
  }

  private buildPrompt(artifact: ProjectArtifact, options?: { features?: string[] }): string {
    const parts = [`Generate implementation for: ${artifact.path}`];

    if (artifact.type === 'test') {
      parts.push('This is a test file. Generate comprehensive test cases.');
    }

    if (options?.features && options.features.length > 0) {
      parts.push(`Features: ${options.features.join(', ')}`);
    }

    return parts.join('\n');
  }
}
