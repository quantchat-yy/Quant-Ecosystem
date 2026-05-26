import { describe, it, expect, beforeEach } from 'vitest';
import { ResearchPilot, ResearchSource } from '../../agents/research-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('ResearchPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has ACT_LOW default permission', () => {
    const pilot = new ResearchPilot();
    expect(pilot.defaultPermission).toBe(PermissionLevel.ACT_LOW);
  });

  it('researches and ranks sources', async () => {
    const pilot = new ResearchPilot();
    pilot.start();

    const sources: ResearchSource[] = [
      { title: 'Source A', url: 'https://a.com', snippet: 'Low relevance content', relevance: 0.3 },
      {
        title: 'Source B',
        url: 'https://b.com',
        snippet: 'High relevance content',
        relevance: 0.9,
      },
      { title: 'Source C', url: 'https://c.com', snippet: 'Medium relevance', relevance: 0.6 },
    ];

    await pilot.run({
      id: 'task-1',
      description: 'Research',
      params: { query: 'AI safety', sources },
    });

    const result = pilot.getResearchResult();
    expect(result!.sources[0]!.title).toBe('Source B');
    expect(result!.query).toBe('AI safety');
  });

  it('extracts key findings from high-relevance sources', async () => {
    const pilot = new ResearchPilot();
    pilot.start();

    const sources: ResearchSource[] = [
      {
        title: 'Important',
        url: 'https://x.com',
        snippet: 'Critical finding about topic',
        relevance: 0.8,
      },
      { title: 'Minor', url: 'https://y.com', snippet: 'Less important', relevance: 0.4 },
    ];

    await pilot.run({ id: 'task-1', description: 'Research', params: { query: 'topic', sources } });

    const result = pilot.getResearchResult();
    expect(result!.keyFindings).toHaveLength(1);
    expect(result!.keyFindings[0]).toContain('Important');
  });

  it('transitions to DONE', async () => {
    const pilot = new ResearchPilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Research', params: { query: 'test' } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
