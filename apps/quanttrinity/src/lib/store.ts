// ============================================================================
// QuantTrinity - Owner control store (durable, Prisma-backed)
// ============================================================================
//
// The single source of truth for the owner control plane: team accounts, the
// app registry, the credit economy, the model registry, payouts, revenue and
// the report queue. The ENTIRE owner-tier state is persisted as one JSON
// document in the single `trinity_control_state` row (id = "singleton"), so it
// survives process restarts instead of living in process memory.

import {
  type AuditEntry,
  type CreditConfig,
  type EcosystemApp,
  type ModelRegistryEntry,
  type OwnerReport,
  type PayoutRequest,
  type RevenueStream,
  type Sector,
  type TeamMember,
  type TeamRole,
  type PrincipalKind,
  type AiEmployeeConfig,
} from './domain';
import { prisma } from './prisma';

interface TrinityState {
  team: TeamMember[];
  apps: EcosystemApp[];
  models: ModelRegistryEntry[];
  credit: CreditConfig;
  payouts: PayoutRequest[];
  revenue: RevenueStream[];
  reports: OwnerReport[];
  audit: AuditEntry[];
}

/**
 * Narrow view of the Prisma client covering only the delegate operations this
 * store uses. Lets the store be exercised against a fake in tests while the
 * real `prisma` singleton satisfies it structurally in production.
 */
export interface TrinityPrisma {
  trinityControlState: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string; data: unknown } | null>;
    upsert(args: {
      where: { id: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<{ id: string; data: unknown }>;
  };
}

const SINGLETON_ID = 'singleton';

function nowIso(offsetMin = 0): string {
  return new Date(Date.now() - offsetMin * 60_000).toISOString();
}

function seed(): TrinityState {
  return {
    team: [
      {
        id: 'tm-001',
        kind: 'human',
        name: 'Priya Sharma',
        email: 'priya@quant.dev',
        sector: 'moderation',
        role: 'lead',
        status: 'active',
        createdAt: nowIso(60 * 24 * 12),
      },
      {
        id: 'tm-002',
        kind: 'ai',
        name: 'QuantAI · Report Triage',
        sector: 'reporting',
        role: 'agent',
        status: 'active',
        createdAt: nowIso(60 * 24 * 5),
        ai: {
          modelId: 'or-claude-sonnet',
          autonomy: 'act-with-approval',
          dailyCreditBudget: 50,
          mandate:
            'Triage incoming user reports, label severity, resolve duplicates, escalate criticals.',
        },
      },
      {
        id: 'tm-003',
        kind: 'human',
        name: 'Arjun Mehta',
        email: 'arjun@quant.dev',
        sector: 'finance',
        role: 'analyst',
        status: 'active',
        createdAt: nowIso(60 * 24 * 30),
      },
    ],
    apps: [
      app('quantmail', 'QuantMail', 'Email + Auth + Dev hub (Gmail/GitHub)'),
      app('quantchat', 'QuantChat', 'Messaging (Snapchat/WhatsApp/Telegram)'),
      app('quantneon', 'QuantNeon', 'Photos & Reels (Instagram)'),
      app('quantmax', 'QuantMax', 'Short video + dating (TikTok/Tinder/Omegle)'),
      app('quantsync', 'QuantSync', 'Microblog + anonymous (X/Threads)'),
      app('quantube', 'QuantTube', 'Video (YouTube)'),
      app('quantedits', 'QuantEdit', 'Creative suite (CapCut/After Effects)'),
      app('quantads', 'QuantAds', 'Ad network (Meta/Google Ads)'),
      app('quantai', 'QuantAI', 'Cross-app AI assistant & device control'),
      app('quantcalendar', 'QuantCalendar', 'Calendar'),
      app('quantdrive', 'QuantDrive', 'Storage'),
      app('quantdocs', 'QuantDocs', 'Docs'),
      app('quantmeet', 'QuantMeet', 'Video meetings'),
    ],
    models: [
      model('or-claude-sonnet', 'Claude Sonnet (OpenRouter)', 'openrouter', 2.5, true, false),
      model('or-gpt-4o', 'GPT-4o (OpenRouter)', 'openrouter', 2.0, true, false),
      model('or-gemini-pro', 'Gemini Pro (OpenRouter)', 'openrouter', 1.4, true, false),
      model('local-quant-8b', 'Quant-8B (local)', 'local', 0.1, false, true),
    ],
    credit: {
      usdPerCredit: 1,
      dailyFreeCredits: 5,
      commissionRate: 0.2,
      overageEnabled: true,
    },
    payouts: [
      payout('po-001', 'NeonCreator_22', 1240, 'upi', 'pending', 30),
      payout('po-002', 'tube_arjun', 860, 'crypto', 'pending', 120),
      payout('po-003', 'editsbyriya', 430, 'stripe', 'approved', 240),
    ],
    revenue: [
      rev('rv-ads', 'QuantAds network', 184_000, 'In-app + in-game banners'),
      rev('rv-boost', 'Reel / post boosts', 62_500, 'QuantNeon, QuantMax, QuantSync'),
      rev('rv-streak', 'QuantChat streaks', 21_300, 'QuantChat'),
      rev('rv-store', 'Game store commission', 48_900, 'Quant Games digital goods'),
      rev('rv-sub', 'Subscriptions', 96_700, 'Plans across ecosystem'),
    ],
    reports: [
      report(
        'rp-001',
        'QuantNeon',
        'Spam / impersonation',
        'user_9921',
        'moderation',
        'medium',
        'open',
      ),
      report(
        'rp-002',
        'QuantSync',
        'Harassment in replies',
        'user_1180',
        'trust-safety',
        'high',
        'in-review',
      ),
      report('rp-003', 'QuantMax', 'NSFW in stream', 'user_4410', 'moderation', 'critical', 'open'),
      {
        id: 'rp-004',
        app: 'QuantChat',
        reason: 'Phishing link',
        reporter: 'user_7732',
        sector: 'reporting',
        severity: 'high',
        status: 'resolved',
        handledByAi: true,
        createdAt: nowIso(60 * 8),
      },
    ],
    audit: [
      {
        id: 'au-001',
        at: nowIso(60 * 2),
        actor: 'owner@quant.dev',
        action: 'economy.payout.approved',
        target: 'po-003',
        detail: 'editsbyriya · 430 cr · stripe',
      },
      {
        id: 'au-002',
        at: nowIso(60 * 5),
        actor: 'QuantAI · Report Triage',
        action: 'report.resolved',
        target: 'rp-004',
        detail: 'Phishing link auto-resolved by AI employee',
      },
    ],
  };
}

function app(id: string, name: string, category: string): EcosystemApp {
  return { id, name, category, status: 'live', modelId: 'or-claude-sonnet', sidekickEnabled: true };
}
function model(
  id: string,
  label: string,
  provider: ModelRegistryEntry['provider'],
  creditPer1kTokens: number,
  enabled: boolean,
  local: boolean,
): ModelRegistryEntry {
  return { id, label, provider, creditPer1kTokens, enabled, local };
}
function payout(
  id: string,
  creatorName: string,
  credits: number,
  method: PayoutRequest['method'],
  status: PayoutRequest['status'],
  offsetMin: number,
): PayoutRequest {
  return { id, creatorName, credits, method, status, requestedAt: nowIso(offsetMin) };
}
function rev(id: string, label: string, monthlyUsd: number, source: string): RevenueStream {
  return { id, label, monthlyUsd, source };
}
function report(
  id: string,
  appName: string,
  reason: string,
  reporter: string,
  sector: Sector,
  severity: OwnerReport['severity'],
  status: OwnerReport['status'],
): OwnerReport {
  return { id, app: appName, reason, reporter, sector, severity, status, createdAt: nowIso(120) };
}

// ---------------------------------------------------------------------------
// Durable load / save of the single owner-state document
// ---------------------------------------------------------------------------

/**
 * Load the owner state from the singleton row, seeding (and persisting) it on
 * first access so a fresh database always has a complete control plane.
 */
async function loadState(db: TrinityPrisma): Promise<TrinityState> {
  const row = await db.trinityControlState.findUnique({ where: { id: SINGLETON_ID } });
  if (!row) {
    const seeded = seed();
    await db.trinityControlState.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, data: seeded },
      update: { data: seeded },
    });
    return seeded;
  }
  return row.data as TrinityState;
}

/** Persist the entire owner state back to the singleton row. */
async function saveState(db: TrinityPrisma, s: TrinityState): Promise<void> {
  await db.trinityControlState.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, data: s },
    update: { data: s },
  });
}

// IDs must stay unique without a module-level counter (which would not survive
// restarts). We derive them from a timestamp plus a short random suffix. This
// is an identifier, not a security token, so Math.random is acceptable here.
function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const defaultDb = (): TrinityPrisma => prisma as unknown as TrinityPrisma;

// ---------------------------------------------------------------------------
// Team / sectors / AI-as-employee
// ---------------------------------------------------------------------------

export async function listTeam(
  sector?: Sector,
  db: TrinityPrisma = defaultDb(),
): Promise<TeamMember[]> {
  const s = await loadState(db);
  return sector ? s.team.filter((m) => m.sector === sector) : s.team;
}

export async function getTeamMember(
  id: string,
  db: TrinityPrisma = defaultDb(),
): Promise<TeamMember | null> {
  const s = await loadState(db);
  return s.team.find((m) => m.id === id) ?? null;
}

export interface CreateTeamMemberInput {
  kind: PrincipalKind;
  name: string;
  email?: string;
  sector: Sector;
  role: TeamRole;
  ai?: AiEmployeeConfig;
}

export async function createTeamMember(
  input: CreateTeamMemberInput,
  db: TrinityPrisma = defaultDb(),
): Promise<TeamMember> {
  const s = await loadState(db);
  const member: TeamMember = {
    id: nextId('tm'),
    kind: input.kind,
    name: input.name,
    email: input.kind === 'human' ? input.email : undefined,
    sector: input.sector,
    role: input.role,
    status: input.kind === 'human' ? 'invited' : 'active',
    createdAt: new Date().toISOString(),
    ai: input.kind === 'ai' ? input.ai : undefined,
  };
  s.team.unshift(member);
  await saveState(db, s);
  return member;
}

export async function updateTeamMember(
  id: string,
  patch: Partial<Pick<TeamMember, 'sector' | 'role' | 'status'>> & { ai?: AiEmployeeConfig },
  db: TrinityPrisma = defaultDb(),
): Promise<TeamMember | null> {
  const s = await loadState(db);
  const member = s.team.find((m) => m.id === id);
  if (!member) return null;
  if (patch.sector) member.sector = patch.sector;
  if (patch.role) member.role = patch.role;
  if (patch.status) member.status = patch.status;
  if (patch.ai && member.kind === 'ai') member.ai = patch.ai;
  await saveState(db, s);
  return member;
}

// ---------------------------------------------------------------------------
// App registry control
// ---------------------------------------------------------------------------

export async function listApps(db: TrinityPrisma = defaultDb()): Promise<EcosystemApp[]> {
  const s = await loadState(db);
  return s.apps;
}

export async function updateApp(
  id: string,
  patch: Partial<Pick<EcosystemApp, 'status' | 'modelId' | 'sidekickEnabled'>>,
  db: TrinityPrisma = defaultDb(),
): Promise<EcosystemApp | null> {
  const s = await loadState(db);
  const a = s.apps.find((x) => x.id === id);
  if (!a) return null;
  if (patch.status) a.status = patch.status;
  if (patch.modelId) a.modelId = patch.modelId;
  if (typeof patch.sidekickEnabled === 'boolean') a.sidekickEnabled = patch.sidekickEnabled;
  await saveState(db, s);
  return a;
}

/**
 * Apply a control patch across the whole app registry (or a subset of ids).
 * Powers the owner's ecosystem-wide actions (e.g. "switch every app to the
 * local model" or "put everything in maintenance"). Returns the affected apps.
 */
export async function bulkUpdateApps(
  patch: Partial<Pick<EcosystemApp, 'status' | 'modelId' | 'sidekickEnabled'>>,
  onlyIds?: string[],
  db: TrinityPrisma = defaultDb(),
): Promise<EcosystemApp[]> {
  const s = await loadState(db);
  const targets = s.apps.filter((a) => !onlyIds || onlyIds.includes(a.id));
  for (const a of targets) {
    if (patch.status) a.status = patch.status;
    if (patch.modelId) a.modelId = patch.modelId;
    if (typeof patch.sidekickEnabled === 'boolean') a.sidekickEnabled = patch.sidekickEnabled;
  }
  await saveState(db, s);
  return targets;
}

// ---------------------------------------------------------------------------
// Economy: credits, models, payouts, revenue
// ---------------------------------------------------------------------------

export async function getCreditConfig(db: TrinityPrisma = defaultDb()): Promise<CreditConfig> {
  const s = await loadState(db);
  return s.credit;
}
export async function updateCreditConfig(
  patch: Partial<CreditConfig>,
  db: TrinityPrisma = defaultDb(),
): Promise<CreditConfig> {
  const s = await loadState(db);
  Object.assign(s.credit, patch);
  await saveState(db, s);
  return s.credit;
}

export async function listModels(db: TrinityPrisma = defaultDb()): Promise<ModelRegistryEntry[]> {
  const s = await loadState(db);
  return s.models;
}
export async function updateModel(
  id: string,
  patch: Partial<Pick<ModelRegistryEntry, 'enabled' | 'local' | 'creditPer1kTokens'>>,
  db: TrinityPrisma = defaultDb(),
): Promise<ModelRegistryEntry | null> {
  const s = await loadState(db);
  const m = s.models.find((x) => x.id === id);
  if (!m) return null;
  Object.assign(m, patch);
  await saveState(db, s);
  return m;
}

export async function listPayouts(db: TrinityPrisma = defaultDb()): Promise<PayoutRequest[]> {
  const s = await loadState(db);
  return s.payouts;
}
export async function updatePayout(
  id: string,
  status: PayoutRequest['status'],
  db: TrinityPrisma = defaultDb(),
): Promise<PayoutRequest | null> {
  const s = await loadState(db);
  const p = s.payouts.find((x) => x.id === id);
  if (!p) return null;
  p.status = status;
  await saveState(db, s);
  return p;
}

export async function listRevenue(db: TrinityPrisma = defaultDb()): Promise<RevenueStream[]> {
  const s = await loadState(db);
  return s.revenue;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function listReports(
  sector?: Sector,
  db: TrinityPrisma = defaultDb(),
): Promise<OwnerReport[]> {
  const s = await loadState(db);
  return sector ? s.reports.filter((r) => r.sector === sector) : s.reports;
}
export async function updateReport(
  id: string,
  status: OwnerReport['status'],
  db: TrinityPrisma = defaultDb(),
): Promise<OwnerReport | null> {
  const s = await loadState(db);
  const r = s.reports.find((x) => x.id === id);
  if (!r) return null;
  r.status = status;
  await saveState(db, s);
  return r;
}

// ---------------------------------------------------------------------------
// Owner audit trail
// ---------------------------------------------------------------------------

export async function recordAudit(
  entry: {
    actor?: string;
    action: string;
    target: string;
    detail?: string;
  },
  db: TrinityPrisma = defaultDb(),
): Promise<AuditEntry> {
  const s = await loadState(db);
  const audit: AuditEntry = {
    id: nextId('au'),
    at: new Date().toISOString(),
    actor: entry.actor ?? 'owner@quant.dev',
    action: entry.action,
    target: entry.target,
    detail: entry.detail,
  };
  s.audit.unshift(audit);
  // keep the trail bounded
  if (s.audit.length > 500) s.audit.length = 500;
  await saveState(db, s);
  return audit;
}

export async function listAudit(
  limit = 100,
  db: TrinityPrisma = defaultDb(),
): Promise<AuditEntry[]> {
  const s = await loadState(db);
  return s.audit.slice(0, limit);
}
