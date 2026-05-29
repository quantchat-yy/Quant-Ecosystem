# Quant Ecosystem Risk Register

> **Re-verified 2026-05-29** by running every gate (install / typecheck / test / build / lint / audit)
> against the live tree. The previous version of this file was badly stale — most CRITICAL/HIGH
> entries below were already resolved and are kept only as RESOLVED history for traceability.

## CURRENT — OPEN

### R-101: Coverage debt — `test-and-coverage` CI job is red 🟠

- **Impact:** Quality-Gates `test-and-coverage` job fails; PRs cannot show a green coverage gate.
- **Details:** `turbo test` passes 121/121, but the root `vitest run --coverage` measures real product
  line/statement coverage at **~30%** vs the configured **50%** global threshold. This is genuine
  missing-tests debt, **not** a config artifact (the e2e-glob + jsdom config bug was fixed in PR #88).
- **Mitigation:** Write meaningful tests (Phase 64.1 / BUG-2), starting with the deepened-but-1-test
  packages and the coverage-gate-critical packages (auth, payments, security @ 80%). Do **not** lower
  the threshold to force green.

### R-102: ci(22) parallel-build OOM mitigation unconfirmed on runner 🟡

- **Impact:** `ci (22)` build step historically failed non-deterministically (a different Next.js app
  each run) from ~7 parallel Next.js prod builds OOM-ing the runner.
- **Details:** PR #93 fixed `turbo.json` `outputs` (zero "no output files" warnings) and added
  `--concurrency=3` + `NODE_OPTIONS=--max-old-space-size=6144`. Locally **3 cold builds = 94/94** and
  cold typecheck = 117/117, but the OOM is runner-specific and the mitigation must be **confirmed green
  on GitHub Actions** before this is closed.
- **Mitigation:** Watch #93 CI; if still OOM, lower concurrency further / raise heap.

### R-103: Moderate dependency vulnerabilities (BUG-5) 🟡

- **Impact:** Hygiene; does not block CI (`pnpm audit --audit-level=high` exits 0).
- **Details:** `pnpm audit` reports **7 moderate + 1 low**, no high/critical.
- **Mitigation:** Triage and upgrade/override; document any unavoidable waivers.

### R-104: Simulated core mislabeled as real (BUG-6) 🟡

- **Impact:** Core ML/SFU/CSAM/agent-pilot paths are naive/simulated but described as production-real.
- **Mitigation:** Honestly label simulated paths; gate "real" claims behind verification.

### R-105: E2E / staging / infra not validated 🟡

- E2E tests are advisory-only (no live server wired); no staging environment provisioned;
  Helm/Terraform not validated against a real cluster; Capacitor native builds need Xcode/Android Studio.

### R-106: README app count discrepancy ℹ️

- **Details:** README says "13 apps"; `apps/` contains **16** directories (some backend-only).
- **Mitigation:** Reconcile the count and the frontend/backend split in README.

## RESOLVED (kept for history)

- **R-001 TypeScript typecheck broken (~896 errors)** — ✅ RESOLVED. `pnpm typecheck` = **117/117**,
  verified warm and cold (fresh turbo cache) on 2026-05-29.
- **R-002 Build pipeline broken** — ✅ RESOLVED. `pnpm build` = **94/94** over 3 consecutive cold runs.
- **R-003 Prisma client not wired into turbo** — ✅ Mostly resolved. `@quant/database` build now has a
  package-level `turbo.json` (`outputs: []`); the generate step is non-blocking (`|| echo`) and
  typecheck passes. (A first-class `db:generate` turbo task is still a nice-to-have.)
- **R-004 Composite project references vs --noEmit conflict** — ✅ Not reproduced; cold typecheck =
  117/117. `typecheck dependsOn ^build` remains in turbo.json as a guard.
- **R-005 "15 high security vulnerabilities in next.js"** — ✅ FALSE as stated. Audit shows **0 high**
  (7 moderate + 1 low). See R-103.
- **R-006 "Lint is non-functional (zero tasks)"** — ✅ FALSE. Lint runs across **150** packages; 0
  errors (no-console warnings only).
- **R-007 scripts/test.js CommonJS in ESM package** — ✅ FIXED (renamed to `scripts/test.cjs`).
- **R-008 README claims 9 apps** — superseded by R-106 (now says 13; actual dir count 16).
