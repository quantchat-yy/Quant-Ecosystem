import { NextResponse } from 'next/server';
import { PlatformConfigService, DEFAULT_PLATFORM_CONFIG } from '@quant/credits';
import { prisma } from '../../../lib/prisma';
import { listApps, listRevenue, listTeam } from '../../../lib/store';

/**
 * Owner command-center aggregate: ecosystem-wide user totals (from Prisma, with
 * graceful fallback when the DB is unavailable) combined with the owner control
 * store (apps, revenue, team, credit config).
 */
export async function GET() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let users = { total: 0, activeToday: 0, dbConnected: false as boolean };
  try {
    const [total, activeToday] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
    ]);
    users = { total, activeToday, dbConnected: true };
  } catch {
    users = { total: 0, activeToday: 0, dbConnected: false };
  }

  const apps = await listApps();
  const revenue = await listRevenue();
  const team = await listTeam();
  // Durable credit/economy config (falls back to defaults if the DB is down,
  // mirroring the user-count graceful fallback above).
  let credit = DEFAULT_PLATFORM_CONFIG;
  try {
    credit = await new PlatformConfigService(prisma as never).getConfig();
  } catch {
    credit = DEFAULT_PLATFORM_CONFIG;
  }

  const monthlyRevenueUsd = revenue.reduce((sum, r) => sum + r.monthlyUsd, 0);
  const aiStaff = team.filter((m) => m.kind === 'ai').length;

  return NextResponse.json({
    timestamp: now.toISOString(),
    users,
    apps: {
      total: apps.length,
      live: apps.filter((a) => a.status === 'live').length,
      maintenance: apps.filter((a) => a.status === 'maintenance').length,
      disabled: apps.filter((a) => a.status === 'disabled').length,
    },
    team: { total: team.length, humans: team.length - aiStaff, aiStaff },
    economy: {
      monthlyRevenueUsd,
      usdPerCredit: credit.usdPerCredit,
      dailyFreeCredits: credit.dailyFreeCredits,
      commissionRate: credit.commissionRate,
    },
  });
}
