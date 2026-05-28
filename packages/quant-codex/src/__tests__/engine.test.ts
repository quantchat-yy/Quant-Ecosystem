import { describe, it, expect, beforeEach } from 'vitest';
import { CodexEngineImpl } from '../engine.js';
import type { DeployTarget, IterationFeedback, ProjectOptions } from '../types.js';

function createTestOptions(overrides?: Partial<ProjectOptions>): ProjectOptions {
  return {
    template: 'node-api',
    language: 'typescript',
    framework: 'express',
    features: ['auth', 'logging'],
    testing: 'vitest',
    deployment: 'self-host',
    ...overrides,
  };
}

describe('CodexEngineImpl', () => {
  let engine: CodexEngineImpl;

  beforeEach(() => {
    engine = new CodexEngineImpl();
  });

  it('should create a project from description', () => {
    const options = createTestOptions();
    const project = engine.createProject('my-api', 'A REST API service', options);

    expect(project.id).toMatch(/^codex-project-/);
    expect(project.name).toBe('my-api');
    expect(project.description).toBe('A REST API service');
    expect(project.status).toBe('scaffolding');
    expect(project.config).toEqual(options);
    expect(project.createdAt).toBeGreaterThan(0);
  });

  it('should run full lifecycle: scaffold -> build -> test -> deploy', async () => {
    const options = createTestOptions();
    const project = engine.createProject('full-app', 'Full lifecycle test', options);

    const artifacts = await engine.scaffold(project.id);
    expect(artifacts.length).toBeGreaterThan(0);

    const buildResult = await engine.build(project.id);
    expect(buildResult.success).toBe(true);

    const testResult = await engine.test(project.id);
    expect(testResult.success).toBe(true);

    const target: DeployTarget = { type: 'export', config: {} };
    const deployResult = await engine.deploy(project.id, target);
    expect(deployResult.success).toBe(true);
    expect(deployResult.target).toBe('export');
  });

  it('should track project status transitions', async () => {
    const project = engine.createProject('status-test', 'Test transitions', createTestOptions());

    expect(project.status).toBe('scaffolding');

    await engine.scaffold(project.id);
    const afterScaffold = engine.getProject(project.id);
    expect(afterScaffold?.status).toBe('building');

    await engine.build(project.id);
    const afterBuild = engine.getProject(project.id);
    expect(afterBuild?.status).toBe('testing');

    await engine.test(project.id);
    const afterTest = engine.getProject(project.id);
    expect(afterTest?.status).toBe('complete');
  });

  it('should handle iteration with feedback', async () => {
    const project = engine.createProject('iterate-test', 'Iteration test', createTestOptions());

    await engine.scaffold(project.id);
    await engine.build(project.id);

    const feedback: IterationFeedback = {
      projectId: project.id,
      feedback: 'Add error handling to all routes',
      targetFiles: ['src/routes/index.ts'],
      priority: 'high',
    };

    const result = await engine.iterate(feedback);
    expect(result.success).toBe(true);

    const updated = engine.getProject(project.id);
    expect(updated?.steps.some((s) => s.type === 'iterate')).toBe(true);
  });

  it('should list all projects', () => {
    engine.createProject('proj-1', 'First', createTestOptions());
    engine.createProject('proj-2', 'Second', createTestOptions());
    engine.createProject('proj-3', 'Third', createTestOptions());

    const projects = engine.listProjects();
    expect(projects).toHaveLength(3);
    expect(projects.map((p) => p.name)).toEqual(['proj-1', 'proj-2', 'proj-3']);
  });

  it('should handle errors when project not found', () => {
    expect(() => engine.getProject('nonexistent')).not.toThrow();
    expect(engine.getProject('nonexistent')).toBeUndefined();
  });

  it('should throw on build for nonexistent project', async () => {
    await expect(engine.build('nonexistent')).rejects.toThrow('Project not found');
  });

  it('should deploy to different targets', async () => {
    const project = engine.createProject('deploy-test', 'Deploy targets', createTestOptions());
    await engine.scaffold(project.id);

    const storeTarget: DeployTarget = { type: 'quant-store', config: { name: 'my-pkg' } };
    const storeResult = await engine.deploy(project.id, storeTarget);
    expect(storeResult.success).toBe(true);
    expect(storeResult.target).toBe('quant-store');
    expect(storeResult.url).toContain('store.quant');
  });

  it('should retrieve a project by id', () => {
    const created = engine.createProject('get-test', 'Retrieval test', createTestOptions());
    const retrieved = engine.getProject(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.name).toBe('get-test');
  });

  it('should support concurrent project management', async () => {
    const p1 = engine.createProject('concurrent-1', 'First', createTestOptions());
    const p2 = engine.createProject(
      'concurrent-2',
      'Second',
      createTestOptions({ template: 'react-app' }),
    );

    const [artifacts1, artifacts2] = await Promise.all([
      engine.scaffold(p1.id),
      engine.scaffold(p2.id),
    ]);

    expect(artifacts1.length).toBeGreaterThan(0);
    expect(artifacts2.length).toBeGreaterThan(0);

    const proj1 = engine.getProject(p1.id);
    const proj2 = engine.getProject(p2.id);
    expect(proj1?.name).toBe('concurrent-1');
    expect(proj2?.name).toBe('concurrent-2');
  });
});
