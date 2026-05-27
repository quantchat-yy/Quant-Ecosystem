import { describe, expect, it } from 'vitest';
import {
  advanceWorkspaceFlow,
  completeWorkspaceStep,
  createWorkspaceOnboardingFlow,
} from '../flows/workspace-onboarding.js';

describe('Workspace Onboarding Flow', () => {
  it('creates a flow with 4 steps', () => {
    const flow = createWorkspaceOnboardingFlow();
    expect(flow.steps).toHaveLength(4);
    expect(flow.currentStepIndex).toBe(0);
    expect(flow.completedAt).toBeUndefined();
  });

  it('starts with create-workspace as active', () => {
    const flow = createWorkspaceOnboardingFlow();
    expect(flow.steps[0]!.id).toBe('create-workspace');
    expect(flow.steps[0]!.status).toBe('active');
  });

  it('has correct step sequence', () => {
    const flow = createWorkspaceOnboardingFlow();
    const stepIds = flow.steps.map((s) => s.id);
    expect(stepIds).toEqual([
      'create-workspace',
      'invite-members',
      'configure-permissions',
      'choose-apps',
    ]);
  });

  it('advances through steps correctly', () => {
    let flow = createWorkspaceOnboardingFlow();
    flow = advanceWorkspaceFlow(flow, { name: 'My Workspace' });

    expect(flow.steps[0]!.status).toBe('completed');
    expect(flow.steps[1]!.status).toBe('active');
    expect(flow.currentStepIndex).toBe(1);
  });

  it('completes the flow after all steps are done', () => {
    let flow = createWorkspaceOnboardingFlow();
    flow = advanceWorkspaceFlow(flow, { name: 'My Workspace' });
    flow = advanceWorkspaceFlow(flow, { members: ['alice', 'bob'] });
    flow = advanceWorkspaceFlow(flow, { roles: ['admin', 'member'] });
    flow = advanceWorkspaceFlow(flow, { apps: ['email', 'docs'] });

    expect(flow.completedAt).toBeDefined();
    expect(flow.steps.every((s) => s.status === 'completed')).toBe(true);
  });

  it('completes a specific step and activates the next', () => {
    const flow = createWorkspaceOnboardingFlow();
    const updated = completeWorkspaceStep(flow, 'create-workspace', {
      name: 'Test Workspace',
    });

    expect(updated.steps[0]!.status).toBe('completed');
    expect(updated.steps[1]!.status).toBe('active');
    expect(updated.currentStepIndex).toBe(1);
  });

  it('marks invite-members and configure-permissions as optional', () => {
    const flow = createWorkspaceOnboardingFlow();
    expect(flow.steps[1]!.required).toBe(false);
    expect(flow.steps[2]!.required).toBe(false);
  });

  it('marks create-workspace and choose-apps as required', () => {
    const flow = createWorkspaceOnboardingFlow();
    expect(flow.steps[0]!.required).toBe(true);
    expect(flow.steps[3]!.required).toBe(true);
  });
});
