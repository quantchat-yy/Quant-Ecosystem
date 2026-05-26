import { describe, it, expect } from 'vitest';
import { AgentInstaller } from '../../marketplace/installer.js';
import { AgentPublisher } from '../../marketplace/publisher.js';
import { AgentSpec } from '../../marketplace/agent-spec.js';
import { PermissionLevel } from '../../permissions.js';

describe('AgentInstaller', () => {
  const validSpec: AgentSpec = {
    name: 'test-agent',
    version: '1.0.0',
    author: 'author',
    description: 'A test agent for installation testing',
    permissions: [PermissionLevel.OBSERVE],
    capabilities: [
      { name: 'observe', description: 'Observe data', requiredPermission: PermissionLevel.OBSERVE },
    ],
    entrypoint: './test-agent.ts',
  };

  function createPublisherWithAgent(): { publisher: AgentPublisher; agentId: string } {
    const publisher = new AgentPublisher();
    const result = publisher.publish(validSpec);
    return { publisher, agentId: result.agentId! };
  }

  it('installs from marketplace in sandbox mode', () => {
    const { publisher, agentId } = createPublisherWithAgent();
    const installer = new AgentInstaller(publisher);

    const result = installer.install(agentId);
    expect(result.success).toBe(true);
    expect(result.sandboxed).toBe(true);
  });

  it('fails to install non-existent agent', () => {
    const publisher = new AgentPublisher();
    const installer = new AgentInstaller(publisher);

    const result = installer.install('unknown-agent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('prevents double install', () => {
    const { publisher, agentId } = createPublisherWithAgent();
    const installer = new AgentInstaller(publisher);

    installer.install(agentId);
    const result = installer.install(agentId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already installed');
  });

  it('promotes agent from sandbox', () => {
    const { publisher, agentId } = createPublisherWithAgent();
    const installer = new AgentInstaller(publisher);

    installer.install(agentId);
    expect(installer.isSandboxed(agentId)).toBe(true);

    const promoted = installer.promoteFromSandbox(agentId);
    expect(promoted).toBe(true);
    expect(installer.isSandboxed(agentId)).toBe(false);
  });

  it('cannot promote non-sandboxed agent', () => {
    const { publisher, agentId } = createPublisherWithAgent();
    const installer = new AgentInstaller(publisher);

    installer.install(agentId);
    installer.promoteFromSandbox(agentId);
    expect(installer.promoteFromSandbox(agentId)).toBe(false);
  });

  it('uninstalls agent', () => {
    const { publisher, agentId } = createPublisherWithAgent();
    const installer = new AgentInstaller(publisher);

    installer.install(agentId);
    expect(installer.uninstall(agentId)).toBe(true);
    expect(installer.getInstalled()).toHaveLength(0);
  });

  it('gets installed agents', () => {
    const { publisher, agentId } = createPublisherWithAgent();
    const installer = new AgentInstaller(publisher);

    installer.install(agentId);
    const installed = installer.getInstalled();
    expect(installed).toHaveLength(1);
    expect(installed[0]!.sandboxed).toBe(true);
  });
});
