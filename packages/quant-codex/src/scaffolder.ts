import type { ProjectArtifact, ProjectOptions } from './types.js';

interface FileTemplate {
  path: string;
  content: string;
  type: ProjectArtifact['type'];
}

export class ProjectScaffolder {
  scaffold(projectName: string, options: ProjectOptions): ProjectArtifact[] {
    const artifacts: ProjectArtifact[] = [];
    const templates = this.getTemplates(projectName, options);

    for (const template of templates) {
      artifacts.push({
        id: `artifact-${artifacts.length + 1}`,
        type: template.type,
        path: template.path,
        content: template.content,
      });
    }

    return artifacts;
  }

  private getTemplates(projectName: string, options: ProjectOptions): FileTemplate[] {
    const templates: FileTemplate[] = [];

    templates.push(this.generatePackageJson(projectName, options));
    templates.push(this.generateTsConfig(options));
    templates.push(this.generateEntryPoint(projectName, options));

    if (options.testing !== 'none') {
      templates.push(this.generateTestConfig(options));
      templates.push(this.generateTestFile(projectName, options));
    }

    const frameworkTemplates = this.getFrameworkTemplates(projectName, options);
    templates.push(...frameworkTemplates);

    return templates;
  }

  private generatePackageJson(projectName: string, options: ProjectOptions): FileTemplate {
    const deps: Record<string, string> = {};
    const devDeps: Record<string, string> = {};

    if (options.language === 'typescript') {
      devDeps['typescript'] = '~5.5.0';
      devDeps['@types/node'] = '^22.0.0';
    }

    if (options.testing === 'vitest') {
      devDeps['vitest'] = '^2.0.0';
    } else if (options.testing === 'jest') {
      devDeps['jest'] = '^29.0.0';
    }

    if (options.framework === 'express') {
      deps['express'] = '^4.18.0';
      if (options.language === 'typescript') {
        devDeps['@types/express'] = '^4.17.0';
      }
    } else if (options.framework === 'fastify') {
      deps['fastify'] = '^4.26.0';
    } else if (options.framework === 'react') {
      deps['react'] = '^18.2.0';
      deps['react-dom'] = '^18.2.0';
    } else if (options.framework === 'next') {
      deps['next'] = '^14.0.0';
      deps['react'] = '^18.2.0';
      deps['react-dom'] = '^18.2.0';
    }

    const packageJson = {
      name: projectName,
      version: '0.1.0',
      private: true,
      type: 'module',
      main: options.language === 'typescript' ? 'src/index.ts' : 'src/index.js',
      scripts: {
        build: options.language === 'typescript' ? 'tsc' : 'echo "no build"',
        test:
          options.testing === 'vitest' ? 'vitest run' : options.testing === 'jest' ? 'jest' : '',
        start: 'node dist/index.js',
      },
      dependencies: deps,
      devDependencies: devDeps,
    };

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      type: 'config',
    };
  }

  private generateTsConfig(options: ProjectOptions): FileTemplate {
    if (options.language !== 'typescript') {
      return {
        path: 'jsconfig.json',
        content: JSON.stringify({ compilerOptions: { checkJs: true } }, null, 2),
        type: 'config',
      };
    }

    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        composite: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };

    return {
      path: 'tsconfig.json',
      content: JSON.stringify(tsconfig, null, 2),
      type: 'config',
    };
  }

  private generateEntryPoint(projectName: string, options: ProjectOptions): FileTemplate {
    const ext = options.language === 'typescript' ? 'ts' : 'js';
    let content: string;

    if (options.template === 'node-api') {
      content = this.generateApiEntryPoint(projectName, options);
    } else if (options.template === 'react-app') {
      content = this.generateReactEntryPoint(projectName);
    } else if (options.template === 'library') {
      content = this.generateLibraryEntryPoint(projectName);
    } else if (options.template === 'cli') {
      content = this.generateCliEntryPoint(projectName);
    } else {
      content = this.generateDefaultEntryPoint(projectName);
    }

    return {
      path: `src/index.${ext}`,
      content,
      type: 'file',
    };
  }

  private generateApiEntryPoint(projectName: string, options: ProjectOptions): string {
    if (options.framework === 'express') {
      return [
        `// ${projectName} - Express API`,
        `import express from 'express';`,
        ``,
        `const app = express();`,
        `app.use(express.json());`,
        ``,
        `app.get('/health', (_req, res) => {`,
        `  res.json({ status: 'ok', name: '${projectName}' });`,
        `});`,
        ``,
        `export { app };`,
        ``,
      ].join('\n');
    }

    if (options.framework === 'fastify') {
      return [
        `// ${projectName} - Fastify API`,
        `import Fastify from 'fastify';`,
        ``,
        `const app = Fastify();`,
        ``,
        `app.get('/health', async () => {`,
        `  return { status: 'ok', name: '${projectName}' };`,
        `});`,
        ``,
        `export { app };`,
        ``,
      ].join('\n');
    }

    return [
      `// ${projectName} - API Server`,
      `export function createServer() {`,
      `  return { name: '${projectName}', status: 'running' };`,
      `}`,
      ``,
    ].join('\n');
  }

  private generateReactEntryPoint(projectName: string): string {
    return [
      `// ${projectName} - React App`,
      `export function App() {`,
      `  return { component: '${projectName}', type: 'react-app' };`,
      `}`,
      ``,
      `export default App;`,
      ``,
    ].join('\n');
  }

  private generateLibraryEntryPoint(projectName: string): string {
    return [
      `// ${projectName} - Library`,
      `export const VERSION = '0.1.0';`,
      ``,
      `export function create(config?: Record<string, unknown>) {`,
      `  return { name: '${projectName}', config: config ?? {} };`,
      `}`,
      ``,
    ].join('\n');
  }

  private generateCliEntryPoint(projectName: string): string {
    return [
      `// ${projectName} - CLI`,
      `export function run(args: string[]) {`,
      `  return { name: '${projectName}', args };`,
      `}`,
      ``,
    ].join('\n');
  }

  private generateDefaultEntryPoint(projectName: string): string {
    return [
      `// ${projectName}`,
      `export const name = '${projectName}';`,
      ``,
      `export function init() {`,
      `  return { name: '${projectName}', initialized: true };`,
      `}`,
      ``,
    ].join('\n');
  }

  private generateTestConfig(options: ProjectOptions): FileTemplate {
    if (options.testing === 'vitest') {
      return {
        path: 'vitest.config.ts',
        content: [
          `import { defineConfig } from 'vitest/config';`,
          ``,
          `export default defineConfig({`,
          `  test: {`,
          `    globals: true,`,
          `  },`,
          `});`,
          ``,
        ].join('\n'),
        type: 'config',
      };
    }

    return {
      path: 'jest.config.js',
      content: `export default { transform: {} };\n`,
      type: 'config',
    };
  }

  private generateTestFile(projectName: string, options: ProjectOptions): FileTemplate {
    const ext = options.language === 'typescript' ? 'ts' : 'js';

    return {
      path: `src/__tests__/index.test.${ext}`,
      content: [
        `describe('${projectName}', () => {`,
        `  it('should initialize', () => {`,
        `    expect(true).toBe(true);`,
        `  });`,
        `});`,
        ``,
      ].join('\n'),
      type: 'test',
    };
  }

  private getFrameworkTemplates(_projectName: string, options: ProjectOptions): FileTemplate[] {
    const templates: FileTemplate[] = [];

    if (
      options.template === 'react-app' ||
      options.framework === 'react' ||
      options.framework === 'next'
    ) {
      templates.push({
        path: 'src/components/.gitkeep',
        content: '',
        type: 'directory',
      });
    }

    if (options.template === 'node-api') {
      templates.push({
        path: 'src/routes/.gitkeep',
        content: '',
        type: 'directory',
      });
    }

    for (const feature of options.features) {
      templates.push({
        path: `src/features/${feature}/.gitkeep`,
        content: '',
        type: 'directory',
      });
    }

    return templates;
  }
}
