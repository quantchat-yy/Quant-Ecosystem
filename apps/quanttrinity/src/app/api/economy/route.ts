import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PlatformConfigService, type PlatformConfigPatch } from '@quant/credits';
import { prisma } from '../../../lib/prisma';
import { listModels, listPayouts, listRevenue, recordAudit } from '../../../lib/store';

// The credit/economy config is now DURABLE (a platform_config row owned by
// @quant/credits), not the in-memory store. The owner gate is enforced upstream
// by the /api middleware (owner token), so the service's write predicate trusts
// the request here; the principal is recorded as the owner for the audit trail.
const OWNER_PRINCIPAL = { principalId: 'owner', isPlatformOwner: true } as const;

function configService(): PlatformConfigService {
  return new PlatformConfigService(prisma as never, {
    writeAuthz: () => true,
  });
}

/** Map the persisted config to the API's economy `credit` shape. */
function toApiCredit(cfg: {
  usdPerCredit: number;
  dailyFreeCredits: number;
  commissionRate: number;
  overageEnabledDefault: boolean;
}) {
  return {
    usdPerCredit: cfg.usdPerCredit,
    dailyFreeCredits: cfg.dailyFreeCredits,
    commissionRate: cfg.commissionRate,
    overageEnabled: cfg.overageEnabledDefault,
  };
}

export async function GET() {
  const credit = await configService().getConfig();
  const [models, payouts, revenue] = await Promise.all([
    listModels(),
    listPayouts(),
    listRevenue(),
  ]);
  return NextResponse.json({
    success: true,
    data: {
      credit: toApiCredit(credit),
      models,
      payouts,
      revenue,
    },
  });
}

const patchSchema = z.object({
  usdPerCredit: z.number().min(0).max(1000).optional(),
  dailyFreeCredits: z.number().int().min(0).max(100_000).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  overageEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid JSON body', code: 'BAD_REQUEST' } },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: parsed.error.issues[0]?.message ?? 'Validation failed',
          code: 'VALIDATION',
        },
      },
      { status: 422 },
    );
  }

  // Map the API patch (overageEnabled) onto the durable config patch
  // (overageEnabledDefault).
  const patch: PlatformConfigPatch = {};
  if (parsed.data.usdPerCredit !== undefined) patch.usdPerCredit = parsed.data.usdPerCredit;
  if (parsed.data.dailyFreeCredits !== undefined)
    patch.dailyFreeCredits = parsed.data.dailyFreeCredits;
  if (parsed.data.commissionRate !== undefined) patch.commissionRate = parsed.data.commissionRate;
  if (parsed.data.overageEnabled !== undefined)
    patch.overageEnabledDefault = parsed.data.overageEnabled;

  try {
    const updated = await configService().setConfig(OWNER_PRINCIPAL, patch);
    await recordAudit({
      action: 'economy.credit_config.updated',
      target: 'credit',
      detail: JSON.stringify(parsed.data),
    });
    return NextResponse.json({ success: true, data: toApiCredit(updated) });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    return NextResponse.json(
      {
        success: false,
        error: { message: e.message ?? 'Failed to update config', code: e.code ?? 'CONFIG_ERROR' },
      },
      { status: e.statusCode ?? 400 },
    );
  }
}
