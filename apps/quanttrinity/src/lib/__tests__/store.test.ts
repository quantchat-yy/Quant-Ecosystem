import { describe, expect, it } from 'vitest';
import {
  bulkUpdateApps,
  createTeamMember,
  getCreditConfig,
  listApps,
  listAudit,
  listPayouts,
  listTeam,
  recordAudit,
  updateApp,
  updateCreditConfig,
  updatePayout,
  updateTeamMember,
} from '../store';
import { makeFakeTrinityDb as makeFakeDb } from './_fake-trinity-db';

describe('QuantTrinity owner store', () => {
  it('seeds apps, team and a credit config', async () => {
    const db = makeFakeDb();
    expect((await listApps(db)).length).toBeGreaterThan(0);
    expect((await listTeam(undefined, db)).length).toBeGreaterThan(0);
    expect((await getCreditConfig(db)).usdPerCredit).toBe(1);
  });

  it('provisions a human member as invited', async () => {
    const db = makeFakeDb();
    const before = (await listTeam(undefined, db)).length;
    const m = await createTeamMember(
      {
        kind: 'human',
        name: 'Test Human',
        email: 'test@quant.dev',
        sector: 'support',
        role: 'analyst',
      },
      db,
    );
    expect(m.kind).toBe('human');
    expect(m.status).toBe('invited');
    expect(m.email).toBe('test@quant.dev');
    expect(m.ai).toBeUndefined();
    expect((await listTeam(undefined, db)).length).toBe(before + 1);
  });

  it('places an AI agent as an active employee with its config', async () => {
    const db = makeFakeDb();
    const m = await createTeamMember(
      {
        kind: 'ai',
        name: 'QuantAI Tester',
        sector: 'reporting',
        role: 'agent',
        ai: {
          modelId: 'or-claude-sonnet',
          autonomy: 'autonomous',
          dailyCreditBudget: 25,
          mandate: 'Triage test reports.',
        },
      },
      db,
    );
    expect(m.kind).toBe('ai');
    expect(m.status).toBe('active');
    expect(m.email).toBeUndefined();
    expect(m.ai?.autonomy).toBe('autonomous');
    expect(m.ai?.dailyCreditBudget).toBe(25);
  });

  it('updates member status (suspend/reactivate)', async () => {
    const db = makeFakeDb();
    const m = await createTeamMember(
      {
        kind: 'human',
        name: 'Suspendable',
        email: 's@quant.dev',
        sector: 'growth',
        role: 'viewer',
      },
      db,
    );
    expect((await updateTeamMember(m.id, { status: 'suspended' }, db))?.status).toBe('suspended');
    expect((await updateTeamMember(m.id, { status: 'active' }, db))?.status).toBe('active');
    expect(await updateTeamMember('does-not-exist', { status: 'active' }, db)).toBeNull();
  });

  it('controls an app status and sidekick toggle', async () => {
    const db = makeFakeDb();
    const app = (await listApps(db))[0]!;
    expect((await updateApp(app.id, { status: 'maintenance' }, db))?.status).toBe('maintenance');
    const toggled = await updateApp(app.id, { sidekickEnabled: false }, db);
    expect(toggled?.sidekickEnabled).toBe(false);
    // restore
    await updateApp(app.id, { status: 'live', sidekickEnabled: true }, db);
  });

  it('bulk-updates the whole app registry', async () => {
    const db = makeFakeDb();
    const affected = await bulkUpdateApps(
      { modelId: 'local-quant-8b', status: 'maintenance' },
      undefined,
      db,
    );
    expect(affected.length).toBe((await listApps(db)).length);
    expect((await listApps(db)).every((a) => a.modelId === 'local-quant-8b')).toBe(true);
    expect((await listApps(db)).every((a) => a.status === 'maintenance')).toBe(true);
    // subset + restore
    const first = (await listApps(db))[0]!;
    const subset = await bulkUpdateApps({ status: 'live' }, [first.id], db);
    expect(subset.length).toBe(1);
    expect((await listApps(db)).find((a) => a.id === first.id)?.status).toBe('live');
    // restore all
    await bulkUpdateApps(
      { status: 'live', modelId: 'or-claude-sonnet', sidekickEnabled: true },
      undefined,
      db,
    );
  });

  it('updates the credit config', async () => {
    const db = makeFakeDb();
    const updated = await updateCreditConfig({ dailyFreeCredits: 9, commissionRate: 0.25 }, db);
    expect(updated.dailyFreeCredits).toBe(9);
    expect(updated.commissionRate).toBe(0.25);
    // restore defaults used by other assertions
    await updateCreditConfig({ dailyFreeCredits: 5, commissionRate: 0.2 }, db);
  });

  it('advances a payout through the approval flow', async () => {
    const db = makeFakeDb();
    const payout = (await listPayouts(db)).find((p) => p.status === 'pending');
    expect(payout).toBeDefined();
    if (payout) {
      expect((await updatePayout(payout.id, 'approved', db))?.status).toBe('approved');
      expect((await updatePayout(payout.id, 'paid', db))?.status).toBe('paid');
    }
    expect(await updatePayout('missing', 'paid', db)).toBeNull();
  });

  it('records and lists owner audit entries (newest first)', async () => {
    const db = makeFakeDb();
    const before = (await listAudit(100, db)).length;
    const entry = await recordAudit(
      { action: 'test.action', target: 'x-1', detail: 'unit test' },
      db,
    );
    expect(entry.id).toMatch(/^au-/);
    expect(entry.actor).toBe('owner@quant.dev');
    const after = await listAudit(100, db);
    expect(after.length).toBe(before + 1);
    expect(after[0]?.id).toBe(entry.id);
    expect((await recordAudit({ actor: 'QuantAI', action: 'a', target: 't' }, db)).actor).toBe(
      'QuantAI',
    );
    expect((await listAudit(1, db)).length).toBe(1);
  });
});
