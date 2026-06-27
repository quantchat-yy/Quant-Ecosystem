# Requirements Document

> Feature: Unified Quant Credits & Creator Payouts Economy

## Introduction

Quant Credits is the single currency of the Quant Ecosystem. Today the ledger and metering
primitives already exist as a production-grade subsystem inside QuantMail
(`apps/quantmail/backend/modules/billing/`: `CreditWallet` over an append-only
`CreditLedgerEntry`, `UsageGate`, `OverageService` (opt-in, default OFF), `PlanService`,
`BillingService`), but the rest of the ecosystem (QuantAds, QuantTube/QuantSync/QuantNeon
creator payouts, QuantAI/QuantEdits AI overage, in-game marketplaces, QuantTrinity config)
uses **four parallel, in-memory, non-durable** credit/wallet implementations
(`packages/payments` compute-credits + unified/wallet-service, `packages/quant-economy` coins,
`packages/creator-economy` credits, `packages/user-owned-ai` daily-allowance).

This feature extracts the real ledger into a shared package and migrates every consumer onto it,
so that **one credit (≈ 1 USD)** is earned, spent, topped-up, and withdrawn through a single
authoritative, durable, idempotent ledger — the monetization backbone that lets QuantAds fund the
platform and creators get paid.

### Goals

- One unified, durable, append-only credits ledger shared by every app (no in-memory wallets).
- Top-up via UPI, PayPal, Stripe, and crypto; daily withdrawals via UPI/crypto/bank.
- Creator payouts (QuantTube/QuantSync/QuantNeon/QuantMax/QuantEdits) settle as credits.
- AI usage metered against credits with a daily free allowance; overage is opt-in, default OFF.
- Plans/tiers (Gemini/ChatGPT-style) with daily limits.
- In-game digital-goods marketplace transacted in credits, with platform commission.
- Central control of pricing/credit config from QuantTrinity.

### Out of scope (separate specs)

- Godot real-world game; OpenRouter per-user model swap (provider exists); the in-game banner-ad
  serving connector (QuantAds); KYC/AML vendor selection (referenced, not specified here).

## Glossary

- **Credit**: the ecosystem's whole-number unit; target value 1 credit ≈ 1 USD (owner-configurable).
- **Bucket**: DAILY (free, non-rollover) → MONTHLY (plan) → PURCHASED (top-ups + earnings). Debit order is fixed.
- **Earned credits**: credits a user earned (creator payout, boost, streak, marketplace sale, referral); withdrawal-eligible.
- **Overage**: metered spend beyond available balance; allowed ONLY when the owner opted in.
- **Owner**: a user or org that owns a wallet.

---

## Requirements

### Requirement 1: Single shared credits ledger

**User Story:** As a platform engineer, I want one shared credits package, so that every app reads/writes the same durable wallet instead of divergent in-memory stores.

#### Acceptance Criteria

1. WHEN any app needs credit operations THEN it SHALL use the shared `@quant/credits` package (extracted from quantmail's billing module) backed by the Prisma `CreditLedgerEntry` ledger.
2. THE ledger SHALL be append-only: balance is derived as `SUM(amount)`; no entry is ever updated or deleted.
3. WHEN a debit would make total balance negative AND overage is not enabled THEN the system SHALL reject it (`OUT_OF_CREDITS`, 402) and append nothing.
4. WHEN the same logical operation is retried with the same idempotency key THEN the system SHALL NOT double-apply it.
5. WHEN the migration is complete THEN a repo search SHALL show the four legacy in-memory credit/wallet services are removed or delegate to `@quant/credits` (no independent balance Maps remain in product paths).
6. WHERE balances are read THEN the system SHALL return the `{daily, monthly, purchased, total}` breakdown and enforce owner/tenant authorization (403 for non-owners).

### Requirement 2: Credit top-up (UPI / PayPal / Stripe / crypto)

**User Story:** As a user, I want to add credits using my preferred payment method, so that I can fund AI usage and purchases.

#### Acceptance Criteria

1. WHEN a user initiates a top-up THEN the system SHALL create a provider-hosted checkout (no card/PAN data stored) and a `pending` PaymentRecord.
2. WHEN a signed provider webhook confirms success THEN the system SHALL credit exactly the purchased credits to the PURCHASED bucket, idempotently keyed by the provider event id (at-most-once).
3. THE system SHALL support Stripe, Razorpay/UPI, PayPal, and at least one crypto rail; each behind a vendor-neutral payment-provider port.
4. IF a webhook signature is invalid or the event id was already processed THEN the system SHALL reject it and grant no credits.
5. WHEN the configured `usdPerCredit` rate applies THEN the credited amount SHALL be computed from the paid fiat/crypto amount at that rate.
6. IF a provider is not configured (missing keys) THEN top-up via that provider SHALL fail closed with a structured error (never silently succeed).

### Requirement 3: Creator payouts settle as earned credits

**User Story:** As a creator, I want my QuantTube/QuantSync/QuantNeon/QuantMax/QuantEdits earnings to land as withdrawable credits, so that I get paid in one place.

#### Acceptance Criteria

1. WHEN a creator earns revenue (ad revenue-share, boosts, streak rewards, marketplace sales, referrals) THEN the system SHALL append an earn-kind credit entry tagged with its source.
2. THE system SHALL compute a per-owner `earnedTotal` = sum of earn-kind entries, net of prior payouts.
3. WHEN platform commission applies THEN the credited earning SHALL be net of the owner-configured commission rate, and the commission SHALL be recorded.
4. WHERE earnings originate in any app THEN they SHALL post to the same shared ledger (app/source identifiable for accounting).

### Requirement 4: Withdrawals (daily, UPI / crypto / bank)

**User Story:** As a creator, I want to withdraw my earned credits daily to UPI, crypto, or bank, so that I can cash out.

#### Acceptance Criteria

1. WHEN a user requests a withdrawal THEN the system SHALL allow it only up to their withdrawal-eligible earned balance.
2. WHEN a withdrawal is accepted THEN the system SHALL debit the credits atomically and create a payout request to the chosen rail (UPI/crypto/bank), idempotently.
3. THE system SHALL support at most one in-flight withdrawal beyond available earned balance never (no overdraw).
4. THE system SHALL enforce a configurable daily withdrawal window/limit and record each payout's status (pending→processing→completed|failed).
5. IF a payout fails at the rail THEN the system SHALL refund the debited credits to the wallet (reversing entry) and mark the payout failed.
6. WHERE compliance limits apply (configurable thresholds) THEN withdrawals above the threshold SHALL be held for review rather than auto-processed.

### Requirement 5: AI usage metering with daily free allowance

**User Story:** As a user, I want a daily free credit allowance for AI usage that resets daily, so that I can use the assistant without always paying.

#### Acceptance Criteria

1. WHEN a metered AI action runs THEN the system SHALL estimate its credit cost, reserve credits (fail-closed), then settle the actual cost (reserve→settle, idempotent).
2. THE daily free allowance SHALL reset each UTC day and SHALL NOT roll over unused credits.
3. WHEN consuming credits THEN the system SHALL draw DAILY → MONTHLY → PURCHASED in that fixed order.
4. THE AI inference credit rate SHALL be derived from model token cost (tokens → USD → credits) via the pricing engine.
5. WHEN a user has insufficient credits AND overage is OFF THEN the action SHALL be blocked with `OUT_OF_CREDITS` and no charge.

### Requirement 6: Overage opt-in (default OFF, no surprise charges)

**User Story:** As a user, I want overage to be off by default and only used if I explicitly enable it, so that I'm never charged unexpectedly.

#### Acceptance Criteria

1. WHEN no overage policy exists for an owner THEN overage SHALL be treated as disabled (default OFF).
2. WHEN overage is OFF THEN a metered action that exceeds available credits SHALL be blocked, never billed.
3. WHEN an owner explicitly enables overage THEN actions beyond balance SHALL be permitted up to a per-month overage ceiling, and the excess SHALL be recorded as billable overage.
4. WHEN monthly overage reaches the configured ceiling THEN further over-balance actions SHALL be blocked.
5. THE overage policy SHALL be changeable only by the owner or a tenant admin (and by QuantTrinity centrally).

### Requirement 7: Plans & tiers with daily limits

**User Story:** As a user, I want subscription tiers (free/pro/team/enterprise) with daily limits and included credits, like Gemini/ChatGPT, so that I can pick a plan.

#### Acceptance Criteria

1. THE system SHALL resolve an owner's active tier (default free) and its entitlements: daily allowance, monthly included credits, rate limits, unlocked models/features.
2. WHEN a user upgrades THEN entitlements SHALL apply immediately; WHEN a user downgrades THEN it SHALL take effect at the next period boundary.
3. THE system SHALL enforce at most one active/trialing subscription per owner.
4. WHEN a rate-limited or feature-locked action is attempted beyond the tier THEN the system SHALL reject it with `UPGRADE_REQUIRED`.
5. WHEN a subscription payment succeeds via webhook THEN the tier SHALL activate idempotently and monthly included credits SHALL be granted.

### Requirement 8: In-game / marketplace purchases in credits with commission

**User Story:** As a user, I want to buy and sell digital goods (game items, skins, coins, boosts) in credits, so that the in-app economy runs on one currency.

#### Acceptance Criteria

1. WHEN a buyer purchases a listed digital good THEN the system SHALL debit the buyer's credits and credit the seller's earned balance in one atomic, idempotent transaction.
2. WHEN a sale settles THEN the platform commission SHALL be deducted from the seller proceeds and recorded.
3. IF the buyer has insufficient credits (overage OFF) THEN the purchase SHALL be rejected and nothing transferred.
4. WHERE a reel/streak boost is purchased THEN it SHALL debit credits via the same ledger and activate the boost.
5. THE system SHALL prevent double-spend and double-delivery under concurrent/retried purchase requests.

### Requirement 9: Central credit/pricing configuration via QuantTrinity

**User Story:** As the platform owner, I want to control credit value, free allowance, commission, and overage defaults centrally, so that I can tune the economy.

#### Acceptance Criteria

1. THE owner SHALL be able to set `usdPerCredit`, default daily free credits, platform commission rate, and plan catalog values from QuantTrinity.
2. WHEN the owner changes a credit-config value THEN subsequent ledger/pricing operations SHALL use the new value (no app restart required).
3. THE QuantTrinity credit config SHALL be persisted (not in-memory) and authorized to owner/admin only.
4. WHERE per-user or per-automation model selection affects cost THEN the resolved model's rate SHALL feed the pricing engine.

### Requirement 10: Auditability, consistency, and safety

**User Story:** As a finance/compliance reviewer, I want every credit movement to be traceable and consistent, so that the economy is trustworthy.

#### Acceptance Criteria

1. EVERY credit mutation SHALL append a ledger entry carrying owner, entryType, bucket, signed amount, source/provenance, and timestamp.
2. THE derived balance SHALL always satisfy `total ≥ 0`; a negative derived total SHALL raise a hard error rather than be served.
3. ALL money-moving endpoints SHALL validate input with schemas and require authentication; cross-owner access SHALL be denied (403).
4. THE system SHALL never use `Math.random()` for ids/keys touching credits/payments; it SHALL use crypto-strong ids.
5. WHEN secrets/keys for a provider are absent in production THEN the affected money path SHALL fail closed, never degrade to a mock that "succeeds".
6. THE migration SHALL preserve existing behavior under test: each touched package keeps a green typecheck and its unit tests pass.
