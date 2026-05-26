import { describe, it, expect, beforeEach } from 'vitest';
import { EmailPilot, EmailItem } from '../../agents/email-pilot.js';
import { PermissionLevel } from '../../permissions.js';
import { AgentState } from '../../state-machine.js';
import { KillSwitch } from '../../kill-switch.js';

describe('EmailPilot', () => {
  beforeEach(() => {
    KillSwitch.resetInstance();
  });

  it('has correct default configuration', () => {
    const pilot = new EmailPilot();
    expect(pilot.name).toBe('Email Pilot');
    expect(pilot.defaultPermission).toBe(PermissionLevel.ACT_LOW);
    expect(pilot.icon).toBe('mail');
  });

  it('archives spam emails', async () => {
    const pilot = new EmailPilot();
    pilot.start();

    const emails: EmailItem[] = [
      {
        id: '1',
        from: 'spam@bad.com',
        subject: 'Win money!',
        body: 'Click here',
        isSpam: true,
        isRead: false,
        timestamp: Date.now(),
      },
      {
        id: '2',
        from: 'real@work.com',
        subject: 'Meeting',
        body: 'Hello',
        isSpam: false,
        isRead: false,
        timestamp: Date.now(),
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Process inbox', params: { emails } });

    const result = pilot.getProcessingResult();
    expect(result.archived).toContain('1');
    expect(result.archived).not.toContain('2');
  });

  it('drafts replies for emails needing response', async () => {
    const pilot = new EmailPilot();
    pilot.start();

    const emails: EmailItem[] = [
      {
        id: '1',
        from: 'boss@work.com',
        subject: 'Status update?',
        body: 'Can you provide an update?',
        isSpam: false,
        isRead: false,
        timestamp: Date.now(),
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Process inbox', params: { emails } });

    const result = pilot.getProcessingResult();
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]!.inReplyTo).toBe('1');
    expect(result.drafts[0]!.body).toContain('Status update?');
  });

  it('flags emails that do not need action', async () => {
    const pilot = new EmailPilot();
    pilot.start();

    const emails: EmailItem[] = [
      {
        id: '1',
        from: 'newsletter@info.com',
        subject: 'Weekly digest',
        body: 'Here is your weekly summary.',
        isSpam: false,
        isRead: false,
        timestamp: Date.now(),
      },
    ];

    await pilot.run({ id: 'task-1', description: 'Process inbox', params: { emails } });

    const result = pilot.getProcessingResult();
    expect(result.flagged).toContain('1');
  });

  it('transitions to DONE on success', async () => {
    const pilot = new EmailPilot();
    pilot.start();
    await pilot.run({ id: 'task-1', description: 'Process', params: { emails: [] } });
    expect(pilot.stateMachine.getState()).toBe(AgentState.DONE);
  });
});
