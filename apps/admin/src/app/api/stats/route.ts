import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, activeUsers, newToday] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    ]);

    return NextResponse.json({
      timestamp: now.toISOString(),
      users: { total: totalUsers, active: activeUsers, newToday, online: 0 },
      database: { connected: true },
    });
  } catch (error) {
    // If DB is unavailable, return zeros gracefully
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      users: { total: 0, active: 0, newToday: 0, online: 0 },
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
