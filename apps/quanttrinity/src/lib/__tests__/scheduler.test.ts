import { describe, expect, it } from 'vitest';
import { createTeamMember, type TrinityPrisma } from '../store';
import { getEntry, listSchedule, runDueShifts, setCadence, setEnabled } from '../scheduler';
import { makeFakeTrinityDb } from './_fake-trinity-db';

function deployAi(
  db: TrinityPrisma,
  autonomy: 'suggest' | 'act-with-approval' | 'autonomous',
  budget = 50,
) {
  return createTeamMember(
    {
      kind: 'ai',
      name: `Sched ${autonomy} ${Math.random().toString(36).slice(2)}`,
      sector: 'reporting',
      role: 'agent',
      ai: { modelId: 'or-claude-sonnet', autonomy, dailyCreditBudget: budget, mandate: 'triage' },
    },
    db,
  );
}

describe('AI workforce scheduler', () => {
  it('derives default cadence from autonomy', async () => {
    const db = makeFakeTrinityDb();
    const auto = await deployAi(db, 'autonomous');
    const approval = await deployAi(db, 'act-with-approval');
    const suggest = await deployAi(db, 'suggest');
    expect(getEntry(auto).cadence).toBe('hourly');
    expect(getEntry(approval).cadence).toBe('daily');
    expect(getEntry(suggest).cadence).toBe('manual');
  });

  it('runs a forced shift for an active employee and advances the schedule', async () => {
    const db = makeFakeTrinityDb();
    const emp = await deployAi(db, 'autonomous');
    const before = getEntry(emp);
    expect(before.lastRunAt).toBeNull();
    const result = await runDueShifts(Date.now(), true, db);
    expect(result.results.some((r) => r.employeeId === emp.id)).toBe(true);
    expect(getEntry(emp).lastRunAt).not.toBeNull();
  });

  it('does not run due shifts when the scheduler is disabled (non-forced)', async () => {
    const db = makeFakeTrinityDb();
    setEnabled(false);
    const result = await runDueShifts(Date.now(), false, db);
    expect(result.enabled).toBe(false);
    expect(result.dueCount).toBe(0);
    setEnabled(true);
  });

  it('manual cadence is never due', async () => {
    const db = makeFakeTrinityDb();
    const emp = await deployAi(db, 'autonomous');
    await setCadence(emp.id, 'manual', db);
    const view = (await listSchedule(Date.now(), db)).find((e) => e.employeeId === emp.id);
    expect(view?.cadence).toBe('manual');
    expect(view?.due).toBe(false);
  });

  it('respects nextRunAt for cadence (future schedule not due)', async () => {
    const db = makeFakeTrinityDb();
    const emp = await deployAi(db, 'autonomous');
    // run once so nextRunAt is pushed an hour out
    await runDueShifts(Date.now(), true, db);
    const view = (await listSchedule(Date.now(), db)).find((e) => e.employeeId === emp.id);
    expect(view?.due).toBe(false);
  });
});
