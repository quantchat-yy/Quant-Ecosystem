import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectScaffolder } from '../scaffolder.js';
import type { ProjectOptions } from '../types.js';

function createOptions(overrides?: Partial<ProjectOptions>): ProjectOptions {
  return {
    template: 'node-api',
    language: 'typescript',
    framework: 'express',
    features: [],
    testing: 'vitest',
    deployment: 'self-host',
    ...overrides,
  };
}

describe('ProjectScaffolder', () => {
  let scaffolder: ProjectScaffolder;

  beforeEach(() => {
    scaffolder = new ProjectScaffolder();
  });

  it('should scaffold a React app', () => {
    const options = createOptions({ template: 'react-app', framework: 'react' });
    const artifacts = scaffolder.scaffold('my-react-app', options);

    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts.some((a) => a.path.includes('components'))).toBe(true);
  });

  it('should scaffold a Node.js API', () => {
    const options = createOptions({ template: 'node-api', framework: 'express' });
    const artifacts = scaffolder.scaffold('my-api', options);

    expect(artifacts.length).toBeGreaterThan(0);
    const entry = artifacts.find((a) => a.path === 'src/index.ts');
    expect(entry).toBeDefined();
    expect(entry?.content).toContain('express');
  });

  it('should scaffold with custom options', () => {
    const options = createOptions({
      template: 'library',
      framework: 'none',
      features: ['validation', 'logging'],
    });
    const artifacts = scaffolder.scaffold('my-lib', options);

    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts.some((a) => a.path.includes('validation'))).toBe(true);
    expect(artifacts.some((a) => a.path.includes('logging'))).toBe(true);
  });

  it('should generate correct file structure', () => {
    const options = createOptions();
    const artifacts = scaffolder.scaffold('structured-app', options);

    const paths = artifacts.map((a) => a.path);
    expect(paths).toContain('package.json');
    expect(paths).toContain('tsconfig.json');
    expect(paths.some((p) => p.startsWith('src/'))).toBe(true);
  });

  it('should include package.json in artifacts', () => {
    const options = createOptions();
    const artifacts = scaffolder.scaffold('pkg-test', options);

    const pkgJson = artifacts.find((a) => a.path === 'package.json');
    expect(pkgJson).toBeDefined();
    expect(pkgJson?.type).toBe('config');

    const parsed = JSON.parse(pkgJson?.content ?? '{}');
    expect(parsed.name).toBe('pkg-test');
    expect(parsed.type).toBe('module');
  });

  it('should include tsconfig in artifacts', () => {
    const options = createOptions({ language: 'typescript' });
    const artifacts = scaffolder.scaffold('ts-test', options);

    const tsconfig = artifacts.find((a) => a.path === 'tsconfig.json');
    expect(tsconfig).toBeDefined();

    const parsed = JSON.parse(tsconfig?.content ?? '{}');
    expect(parsed.compilerOptions.strict).toBe(true);
    expect(parsed.compilerOptions.composite).toBe(true);
  });

  it('should handle unknown framework gracefully', () => {
    const options = createOptions({ framework: 'unknown-framework' });
    const artifacts = scaffolder.scaffold('unknown-fw', options);

    expect(artifacts.length).toBeGreaterThan(0);
    const entry = artifacts.find((a) => a.path === 'src/index.ts');
    expect(entry).toBeDefined();
  });

  it('should scaffold with testing framework specified', () => {
    const options = createOptions({ testing: 'vitest' });
    const artifacts = scaffolder.scaffold('tested-app', options);

    const testConfig = artifacts.find((a) => a.path === 'vitest.config.ts');
    expect(testConfig).toBeDefined();
    expect(testConfig?.content).toContain('globals: true');

    const testFile = artifacts.find((a) => a.path.includes('.test.'));
    expect(testFile).toBeDefined();
  });

  it('should not include test files when testing is none', () => {
    const options = createOptions({ testing: 'none' });
    const artifacts = scaffolder.scaffold('no-tests', options);

    const testFile = artifacts.find((a) => a.path.includes('.test.'));
    expect(testFile).toBeUndefined();
  });
});
