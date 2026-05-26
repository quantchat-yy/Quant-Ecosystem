import { describe, it, expect, beforeEach } from 'vitest';
import { QuantCLI } from '../core/cli-tool';

describe('QuantCLI', () => {
  let cli: QuantCLI;

  beforeEach(() => {
    cli = new QuantCLI({
      workingDirectory: '/test-workspace',
      registry: 'https://registry.test.quant.dev',
    });
  });

  describe('scaffoldApp', () => {
    it('should scaffold a basic app', () => {
      const result = cli.scaffoldApp({
        name: 'my-app',
        template: 'basic',
        language: 'typescript',
        description: 'A test app',
        author: 'test-user',
      });

      expect(result.success).toBe(true);
      expect(result.appId).toBeTruthy();
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.message).toContain('my-app');
    });

    it('should scaffold an API template', () => {
      const result = cli.scaffoldApp({
        name: 'my-api',
        template: 'api',
      });

      expect(result.success).toBe(true);
      expect(result.files).toContain('my-api/src/routes.ts');
      expect(result.files).toContain('my-api/src/handlers.ts');
    });

    it('should scaffold a webhook template', () => {
      const result = cli.scaffoldApp({
        name: 'my-webhook',
        template: 'webhook',
        language: 'typescript',
      });

      expect(result.success).toBe(true);
      expect(result.files).toContain('my-webhook/src/webhook-handler.ts');
    });

    it('should scaffold a plugin template', () => {
      const result = cli.scaffoldApp({
        name: 'my-plugin',
        template: 'plugin',
        language: 'typescript',
      });

      expect(result.success).toBe(true);
      expect(result.files).toContain('my-plugin/src/plugin.ts');
      expect(result.files).toContain('my-plugin/src/manifest.json');
    });

    it('should scaffold a fullstack template', () => {
      const result = cli.scaffoldApp({
        name: 'my-fullstack',
        template: 'fullstack',
        language: 'typescript',
      });

      expect(result.success).toBe(true);
      expect(result.files.some((f) => f.includes('api/'))).toBe(true);
      expect(result.files.some((f) => f.includes('ui/'))).toBe(true);
    });

    it('should fail validation with empty name', () => {
      const result = cli.scaffoldApp({
        name: '',
        template: 'basic',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation error');
    });
  });

  describe('testApp', () => {
    it('should run tests for an existing app', () => {
      const scaffold = cli.scaffoldApp({ name: 'test-app', template: 'basic' });
      const result = cli.testApp(scaffold.appId);

      expect(result.success).toBe(true);
      expect(result.results.passed).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for non-existent app', () => {
      const result = cli.testApp('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('App not found');
    });
  });

  describe('deployApp', () => {
    it('should deploy an app to staging', () => {
      const scaffold = cli.scaffoldApp({ name: 'deploy-app', template: 'api' });
      const result = cli.deployApp({
        appId: scaffold.appId,
        version: '1.0.0',
        environment: 'staging',
      });

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeTruthy();
      expect(result.url).toContain('staging');
      expect(result.url).toContain('deploy-app');
    });

    it('should deploy an app to production', () => {
      const scaffold = cli.scaffoldApp({ name: 'prod-app', template: 'api' });
      const result = cli.deployApp({
        appId: scaffold.appId,
        version: '1.0.0',
        environment: 'production',
      });

      expect(result.success).toBe(true);
      expect(result.url).toContain('production');
    });

    it('should fail for non-existent app', () => {
      const result = cli.deployApp({
        appId: 'non-existent',
        version: '1.0.0',
        environment: 'staging',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should fail with invalid version format', () => {
      const scaffold = cli.scaffoldApp({ name: 'version-app', template: 'basic' });
      const result = cli.deployApp({
        appId: scaffold.appId,
        version: 'invalid',
        environment: 'staging',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation error');
    });
  });

  describe('listApps', () => {
    it('should list all apps', () => {
      cli.scaffoldApp({ name: 'app-1', template: 'basic' });
      cli.scaffoldApp({ name: 'app-2', template: 'api' });

      const result = cli.listApps();

      expect(result.apps).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by template', () => {
      cli.scaffoldApp({ name: 'app-1', template: 'basic' });
      cli.scaffoldApp({ name: 'app-2', template: 'api' });

      const result = cli.listApps({ template: 'api' });

      expect(result.apps).toHaveLength(1);
      expect(result.apps[0]?.name).toBe('app-2');
    });

    it('should return empty list when no apps exist', () => {
      const result = cli.listApps();

      expect(result.apps).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('generateSDK', () => {
    it('should generate SDK for an app', () => {
      const scaffold = cli.scaffoldApp({ name: 'sdk-app', template: 'api' });
      const result = cli.generateSDK(scaffold.appId, { language: 'typescript' });

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.files.some((f) => f.endsWith('.ts'))).toBe(true);
    });

    it('should generate Python SDK', () => {
      const scaffold = cli.scaffoldApp({ name: 'py-app', template: 'api' });
      const result = cli.generateSDK(scaffold.appId, { language: 'python' });

      expect(result.success).toBe(true);
      expect(result.files.some((f) => f.endsWith('.py'))).toBe(true);
    });

    it('should fail for non-existent app', () => {
      const result = cli.generateSDK('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('initProject', () => {
    it('should initialize a new project', () => {
      const result = cli.initProject({
        name: 'new-project',
        description: 'My new project',
      });

      expect(result.success).toBe(true);
      expect(result.projectId).toBeTruthy();
      expect(result.configFile).toContain('quant.config.json');
    });

    it('should fail with empty name', () => {
      const result = cli.initProject({ name: '' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('required');
    });
  });

  describe('configureApp', () => {
    it('should configure an existing app', () => {
      const scaffold = cli.scaffoldApp({ name: 'config-app', template: 'basic' });
      const result = cli.configureApp({
        appId: scaffold.appId,
        settings: { debug: true, timeout: 5000 },
      });

      expect(result.success).toBe(true);
      expect(result.appliedSettings).toEqual({ debug: true, timeout: 5000 });
    });

    it('should fail for non-existent app', () => {
      const result = cli.configureApp({
        appId: 'non-existent',
        settings: { debug: true },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('getCommandHistory', () => {
    it('should track command history', () => {
      cli.scaffoldApp({ name: 'hist-app', template: 'basic' });
      cli.listApps();

      const history = cli.getCommandHistory();

      expect(history.length).toBe(2);
      expect(history[0]?.command).toBe('scaffold');
      expect(history[1]?.command).toBe('list');
    });
  });
});
