import type { DeployResult, DeployTarget, ProjectArtifact } from './types.js';

// ============================================================
// Project Deployer
// ============================================================

export class ProjectDeployer {
  async deploy(artifacts: ProjectArtifact[], target: DeployTarget): Promise<DeployResult> {
    const startTime = Date.now();

    switch (target.type) {
      case 'quant-store':
        return this.deployToQuantStore(artifacts, target, startTime);
      case 'self-host':
        return this.deployToSelfHost(artifacts, target, startTime);
      case 'export':
        return this.deployExport(artifacts, target, startTime);
      default:
        return {
          success: false,
          target: target.type,
          artifacts: [],
          error: `Unknown deploy target: ${String(target.type)}`,
          duration: Date.now() - startTime,
        };
    }
  }

  private async deployToQuantStore(
    artifacts: ProjectArtifact[],
    target: DeployTarget,
    startTime: number,
  ): Promise<DeployResult> {
    const packageArtifact: ProjectArtifact = {
      id: 'deploy-package',
      type: 'file',
      path: 'dist/package.tar.gz',
      content: JSON.stringify({
        files: artifacts.map((a) => a.path),
        metadata: {
          publishedAt: Date.now(),
          store: 'quant-store',
          config: target.config,
        },
      }),
    };

    return {
      success: true,
      target: 'quant-store',
      url: `https://store.quant.dev/packages/${String(target.config['name'] ?? 'unnamed')}`,
      artifacts: [packageArtifact],
      duration: Date.now() - startTime,
    };
  }

  private async deployToSelfHost(
    artifacts: ProjectArtifact[],
    target: DeployTarget,
    startTime: number,
  ): Promise<DeployResult> {
    const dockerfile: ProjectArtifact = {
      id: 'deploy-dockerfile',
      type: 'config',
      path: 'Dockerfile',
      content: [
        'FROM node:22-alpine',
        'WORKDIR /app',
        'COPY package.json pnpm-lock.yaml ./',
        'RUN corepack enable && pnpm install --frozen-lockfile',
        'COPY . .',
        'RUN pnpm build',
        'EXPOSE 3000',
        'CMD ["node", "dist/index.js"]',
      ].join('\n'),
    };

    const compose: ProjectArtifact = {
      id: 'deploy-compose',
      type: 'config',
      path: 'docker-compose.yml',
      content: [
        'version: "3.9"',
        'services:',
        '  app:',
        '    build: .',
        `    ports:`,
        `      - "${String(target.config['port'] ?? '3000')}:3000"`,
        '    environment:',
        '      - NODE_ENV=production',
      ].join('\n'),
    };

    return {
      success: true,
      target: 'self-host',
      url: `http://localhost:${String(target.config['port'] ?? '3000')}`,
      artifacts: [dockerfile, compose, ...artifacts],
      duration: Date.now() - startTime,
    };
  }

  private async deployExport(
    artifacts: ProjectArtifact[],
    _target: DeployTarget,
    startTime: number,
  ): Promise<DeployResult> {
    const manifest: ProjectArtifact = {
      id: 'deploy-manifest',
      type: 'file',
      path: 'export/manifest.json',
      content: JSON.stringify(
        {
          exportedAt: Date.now(),
          files: artifacts.map((a) => ({ path: a.path, type: a.type })),
          totalFiles: artifacts.length,
        },
        null,
        2,
      ),
    };

    return {
      success: true,
      target: 'export',
      artifacts: [manifest, ...artifacts],
      duration: Date.now() - startTime,
    };
  }
}
