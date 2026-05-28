import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectBuilder, StubCodeGenerator } from '../builder.js';
import type { CodeGenerator, CodeGenerateResult, ProjectArtifact } from '../types.js';

function createArtifact(overrides?: Partial<ProjectArtifact>): ProjectArtifact {
  return {
    id: 'artifact-1',
    type: 'file',
    path: 'src/index.ts',
    content: '// placeholder',
    ...overrides,
  };
}

describe('ProjectBuilder', () => {
  let builder: ProjectBuilder;

  beforeEach(() => {
    builder = new ProjectBuilder();
  });

  it('should build a scaffolded project', async () => {
    const artifacts: ProjectArtifact[] = [
      createArtifact({ id: 'a1', path: 'src/index.ts' }),
      createArtifact({ id: 'a2', path: 'src/utils.ts' }),
    ];

    const result = await builder.build(artifacts);

    expect(result.success).toBe(true);
    expect(result.artifacts).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should generate implementation for each module', async () => {
    const artifacts: ProjectArtifact[] = [
      createArtifact({ id: 'a1', path: 'src/auth.ts' }),
      createArtifact({ id: 'a2', path: 'src/db.ts' }),
      createArtifact({ id: 'a3', path: 'src/routes.ts' }),
    ];

    const result = await builder.build(artifacts);

    expect(result.success).toBe(true);
    for (const artifact of result.artifacts) {
      expect(artifact.content).toContain('Generated from');
      expect(artifact.metadata?.['generated']).toBe(true);
    }
  });

  it('should track build progress', async () => {
    const artifacts: ProjectArtifact[] = [
      createArtifact({ id: 'a1', path: 'src/one.ts' }),
      createArtifact({ id: 'a2', path: 'src/two.ts' }),
      createArtifact({ id: 'a3', path: 'src/three.ts' }),
    ];

    await builder.build(artifacts);
    const progress = builder.getProgress();

    expect(progress.total).toBe(3);
    expect(progress.completed).toBe(3);
    expect(progress.errors).toHaveLength(0);
  });

  it('should handle build errors', async () => {
    const failingGenerator: CodeGenerator = {
      async generate(): Promise<CodeGenerateResult> {
        throw new Error('Generation failed');
      },
    };

    const failBuilder = new ProjectBuilder(failingGenerator);
    const artifacts: ProjectArtifact[] = [createArtifact()];

    const result = await failBuilder.build(artifacts);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Generation failed');
  });

  it('should support partial build recovery', async () => {
    let callCount = 0;
    const partialGenerator: CodeGenerator = {
      async generate(): Promise<CodeGenerateResult> {
        callCount++;
        if (callCount === 2) {
          throw new Error('Partial failure');
        }
        return { success: true, content: '// generated' };
      },
    };

    const partialBuilder = new ProjectBuilder(partialGenerator);
    const artifacts: ProjectArtifact[] = [
      createArtifact({ id: 'a1', path: 'src/ok1.ts' }),
      createArtifact({ id: 'a2', path: 'src/fail.ts' }),
      createArtifact({ id: 'a3', path: 'src/ok2.ts' }),
    ];

    const result = await partialBuilder.build(artifacts);

    expect(result.success).toBe(false);
    expect(result.artifacts).toHaveLength(3);
    expect(result.errors).toHaveLength(1);
  });

  it('should use code generation with feature dependencies', async () => {
    const artifacts: ProjectArtifact[] = [createArtifact({ id: 'a1', path: 'src/feature.ts' })];

    const result = await builder.build(artifacts, { features: ['auth', 'caching'] });

    expect(result.success).toBe(true);
    expect(result.artifacts).toHaveLength(1);
  });

  it('should include all artifacts in build result', async () => {
    const artifacts: ProjectArtifact[] = [
      createArtifact({ id: 'a1', path: 'src/index.ts', type: 'file' }),
      createArtifact({ id: 'a2', path: 'tsconfig.json', type: 'config' }),
      createArtifact({ id: 'a3', path: 'src/components', type: 'directory' }),
    ];

    const result = await builder.build(artifacts);

    expect(result.artifacts).toHaveLength(3);
    expect(result.success).toBe(true);
  });

  it('should respect project options during build', async () => {
    const artifacts: ProjectArtifact[] = [createArtifact({ id: 'a1', path: 'src/app.ts' })];

    const result = await builder.build(artifacts, { features: ['auth'] });

    expect(result.success).toBe(true);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should use the default StubCodeGenerator', async () => {
    const stubGen = new StubCodeGenerator();
    const genResult = await stubGen.generate('test prompt');

    expect(genResult.success).toBe(true);
    expect(genResult.content).toContain('test prompt');
  });
});
