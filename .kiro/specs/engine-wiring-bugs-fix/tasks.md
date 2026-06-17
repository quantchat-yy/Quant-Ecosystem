# Implementation Plan

This plan turns the approved design into a sequenced, exploratory bugfix workflow for the three
engine-wiring defects. It follows the bug-condition methodology: **first reproduce each bug on
unfixed code** (exploratory bug-condition checks), **then apply each fix**, **then run fix-checking
and preservation tests** tied to the six correctness properties from the design (P1–P3 fix,
P4–P6 preservation).

Property labels use the design's numbering so hover-status maps to the correctness properties:

- **P1 / P2 / P3** — fix properties (behavior where a bug condition holds): Bug 1 / Bug 2 / Bug 3.
- **P4 / P5 / P6** — preservation properties (behavior where it does not): Bug 1 / Bug 2 / Bug 3.

> **Open implementation confirmations — resolved during this plan (see Task 0):**
>
> 1. _Workspace re-link availability._ Sandbox network mode is `OPEN_INTERNET` and the repo pins
>    `pnpm@10.28.1`, so `pnpm install` (the re-link step for Bug 1) is available. Task 0 verifies
>    the lockfile updates and the `@quant/*` symlinks appear before Bug 1 is validated.
> 2. _TS ESM loader handling of `exports`-map `.ts` targets._ Sibling workspace packages
>    `@quant/payments` and `@quant/agentic` are consumed from TS source via `main: src/index.ts`
>    (no compiled `dist`), so the Bug 2 `exports` targets must also reference `./src/*.ts` files.
>    Task 0 confirms the loader resolves `.ts` exports targets identically to the existing
>    `"."`/`main` entry before Bug 2 is validated.

---

## Phase 0 — Pre-flight (resolve open confirmations)

- [x] 0. Confirm build/loader prerequisites before touching source
  - **0.1 — Workspace re-link availability:** confirm `pnpm@10.28.1` is usable and a `pnpm install`
    re-link will create new `@quant/*` symlinks in `node_modules` (network mode is `OPEN_INTERNET`).
    Capture the baseline so Task 4.3's re-link can be verified. If installs are later constrained,
    record the fallback (commit the updated `pnpm-lock.yaml` and symlinks).
  - **0.2 — TS ESM loader / `.ts` exports targets:** inspect how `@quant/payments` and
    `@quant/agentic` are loaded (both `main: src/index.ts`, no `dist`) and confirm the app's TS ESM
    loader (tsx/vitest) resolves `.ts` files. This validates that the Bug 2 `exports` map may point
    at `./src/*.ts` targets. Note that `@quant/auth/package.json` is currently missing
    `"type": "module"` (siblings declare it) — flag for Task 5.1.
  - Document both outcomes; do not modify any source in this task.
  - _Requirements: 2.1, 2.3, 2.4_

---

## Phase 1 — Exploratory bug-condition checks (run on UNFIXED code)

- [x] 1. Reproduce Bug 1 — quantai cannot boot (phantom / undeclared `@quant/*` packages)
  - **Property 1: Bug Condition** - quantai `buildApp()` phantom-package boot failure
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists.
  - **DO NOT attempt to fix the test or the code when it fails.**
  - **GOAL**: Surface counterexamples that demonstrate the boot failure.
  - **Scoped PBT Approach**: This is a deterministic resolution failure — scope to the concrete
    case: `import('apps/quantai/backend/app.ts')` / invoking `buildApp()`.
  - From the Bug Condition `isBugConditionBug1`: an import reachable from `buildApp()` targets a
    `@quant/*` package whose folder has no `package.json` (cache, cdn, events, ml, payment,
    recommendation, scaling, ab-testing) OR is undeclared in the app (agentic).
  - Run on UNFIXED code — **EXPECTED OUTCOME**: throws `Cannot find package '@quant/*'` (e.g.
    `@quant/cache`) before any route registers. Also assert `@quant/agentic` is absent from
    `apps/quantai/package.json` though `packages/agentic/package.json` exists.
  - Document the counterexample (first unresolved `@quant/*` specifier). If a _different_ error
    surfaces, re-hypothesize before proceeding.
  - _Requirements: 1.1, 1.2_

- [x] 2. Reproduce Bug 2 — quantmail cannot boot (deep `@quant/auth` subpath imports)
  - **Property 2: Bug Condition** - quantmail deep `@quant/auth` subpath resolution failure
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists.
  - **DO NOT attempt to fix the test or the code when it fails.**
  - **GOAL**: Surface the module-resolution counterexample.
  - **Scoped PBT Approach**: Deterministic — scope to loading `oauthRoutes` / invoking quantmail
    `buildApp()`, and to each of the four deep specifiers.
  - From the Bug Condition `isBugConditionBug2`: an import is a deep subpath of `@quant/auth`
    (`services/token-service`, `lib/secrets`, `lib/prisma`, `crypto/secure-random`) that the
    package's (absent) `exports` map does not expose.
  - Run on UNFIXED code — **EXPECTED OUTCOME**: throws
    `Cannot find package '@quant/auth/services/token-service' imported from .../oauth.ts`.
  - Document the counterexample(s). Confirm `packages/auth/package.json` has `main: src/index.ts`
    and **no** `exports` field.
  - _Requirements: 1.3, 1.4_

- [x] 3. Reproduce Bug 3 — quantube returns 500 instead of 403 for forbidden/ineligible upgrades
  - **Property 3: Bug Condition** - `POST /creator/tier/upgrade` 500-instead-of-403
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists.
  - **DO NOT attempt to fix the test or the code when it fails.**
  - **GOAL**: Surface counterexamples where a client/permission error surfaces as a server fault.
  - **Scoped PBT Approach**: For these deterministic cases, scope the property to concrete failing
    requests (after `setTier`/earnings setup) for reproducibility, then generalize in Task 6/10.2.
  - From the Bug Condition `isBugConditionBug3` (request passed Zod validation): the transition is
    non-upward (`indexOf(newTier) <= indexOf(current)` — same-tier or downgrade) OR the caller is
    ineligible (`!checkEligibility(userId, newTier)`).
  - Concrete counterexamples to assert on UNFIXED code:
    - `pro -> starter` (downgrade) → **EXPECTED OUTCOME**: `500 / INTERNAL_ERROR` (bug).
    - `pro -> pro` (same tier) → `500 / INTERNAL_ERROR` (bug).
    - `free -> starter` with earnings `50` (threshold `100`, ineligible) → `500 / INTERNAL_ERROR` (bug).
  - The test assertions encode the **expected** behavior (403 / `FORBIDDEN`); they FAIL now and
    will validate the fix in Task 10.2.
  - Document the counterexamples.
  - _Requirements: 1.5, 1.6, 1.7_

---

## Phase 2 — Preservation baselines (observation-first, BEFORE any fix)

- [x] 4. Capture Bug 1 preservation baseline — quantai agent seams & resolvable routes
  - **Property 4: Preservation** - quantai agent surfaces and already-resolvable routes unchanged
  - **IMPORTANT**: Follow observation-first methodology — record real behavior on the current code.
  - Non-bug condition (`NOT isBugConditionBug1`): the six wired agent surfaces (agent-runtime,
    agent-swarm, quant-tools, browser-agent, code-agent, user-owned-ai) and every route whose
    `@quant/*` dependency already resolves. (Observe via the current `createApp()`-based seam
    harness, since the real `buildApp()` cannot boot yet.)
  - Observe & record the auth-seam matrix: unauth → 401, valid JWT without `agents:execute` → 403,
    valid JWT with scope → 2xx reaching the decorated engine; plus existing prefixes/behavior of
    already-resolvable routes.
  - Write property-based tests asserting this matrix holds across the agent surfaces.
  - Run on UNFIXED code — **EXPECTED OUTCOME**: tests PASS (baseline to preserve).
  - _Requirements: 3.1, 3.2_

- [x] 5. Capture Bug 2 preservation baseline — OAuth/auth, E2EE, federation behavior
  - **Property 5: Preservation** - quantmail OAuth/auth/E2EE/federation unchanged
  - **IMPORTANT**: Follow observation-first methodology.
  - Non-bug condition (`NOT isBugConditionBug2`): all behavior other than the failing deep-subpath
    resolution. Observe via the current `createApp()`-based engine-surface harness.
  - Observe & record: OAuth/auth endpoints (`/oauth/token|authorize|consent|revoke|register`,
    `/auth/login|register`) responses including the DB-sourced open-redirect-safe
    `resolveRedirectUri` and existing 400/401/409 paths; E2EE `.strict()` ciphertext-only 400
    rejection + 401/403/2xx scope seam; federation seam.
  - Record that the four deep specifiers are the `vi.mock(...)` targets in `e2e-auth.test.ts` /
    `e2e-oauth.test.ts`, and that `import { prisma } from '@quant/auth/lib/prisma'` (named) and
    default `prisma` import are both depended upon — the fix must keep these specifiers valid.
  - Write property-based tests capturing the observed patterns.
  - Run on UNFIXED code — **EXPECTED OUTCOME**: tests PASS (baseline to preserve).
  - _Requirements: 3.3, 3.4_

- [x] 6. Capture Bug 3 preservation baseline — valid upgrades & auth/validation seams
  - **Property 6: Preservation** - quantube valid upgrade + auth/Zod seams unchanged
  - **IMPORTANT**: Follow observation-first methodology.
  - Non-bug condition (`NOT isBugConditionBug3`): valid eligible strictly-upward upgrade, auth
    failures, and invalid body. Observe on the current handler.
  - Observe & record: `free -> starter` with earnings `200` (eligible, upward) →
    `200 { success: true, data: { tier: "starter" } }` with engine state mutated; unauth → 401;
    auth without `creator:write` → 403; invalid body (`{}` or `tier: "platinum"`) →
    `400 VALIDATION_ERROR` (ZodError path); other `/creator/*` routes (dashboard, earnings, tier
    read, tip, credits) unchanged.
  - Write a **property-based test**: generate random `(currentTier, newTier, earnings)` triples
    restricted to the non-bug class (upward & eligible, or invalid body) and assert the response
    partitions as `{ upward & eligible → 200, invalid body → 400 }` with 500 never occurring.
  - Run on UNFIXED code — **EXPECTED OUTCOME**: tests PASS (baseline to preserve).
  - _Requirements: 3.5, 3.6_

---

## Phase 3 — Apply fixes

- [x] 7. Fix Bug 1 — promote 8 source-only engines to packages + declare 9 deps in quantai
  - [x] 7.1 Add a package manifest to each of the 8 source-only engine folders
    - For each of `packages/{cache,cdn,events,ml,payment,recommendation,scaling,ab-testing}/`, add a
      `package.json` mirroring the sibling convention (verified against `@quant/payments` /
      `@quant/agentic`): `"type": "module"`, `main`/`types` = `src/index.ts`, standard
      build/typecheck/test/lint scripts, devDeps (`@types/node`, `typescript ~5.5.0`, `vitest`).
    - `name` maps exactly to the route import: `@quant/cache`, `@quant/cdn`, `@quant/events`,
      `@quant/ml`, `@quant/payment`, `@quant/recommendation`, `@quant/scaling`, `@quant/ab-testing`
      (singular folders — do NOT change route specifiers).
    - Add a matching `tsconfig.json` (extends root, `composite: true`, `include: ["src/**/*"]`) and a
      `vitest.config.ts` consistent with siblings. **Do NOT edit any `src/` file.**
    - These engines have no `@quant/*` runtime deps (only Node's built-in `events`) — no `@quant/*`
      dependencies in their manifests.
    - _Bug_Condition: isBugConditionBug1(import) — folder has no package.json_
    - _Expected_Behavior: P1 — every reachable `@quant/*` import resolves; `buildApp()` boots_
    - _Requirements: 2.1_
  - [x] 7.2 Declare all nine `@quant/*` packages in `apps/quantai/package.json`
    - Add (alphabetical, `workspace:*`): `@quant/ab-testing`, `@quant/agentic`, `@quant/cache`,
      `@quant/cdn`, `@quant/events`, `@quant/ml`, `@quant/payment`, `@quant/recommendation`,
      `@quant/scaling`. (`@quant/agentic` already exists as a package but was undeclared here.)
    - _Bug_Condition: isBugConditionBug1(import) — package undeclared in app (agentic)_
    - _Expected_Behavior: P1 — all 9 declared/linked_
    - _Requirements: 2.1_
  - [x] 7.3 Re-link the workspace
    - Run `pnpm install` so the new `@quant/*` symlinks appear in `node_modules` and
      `pnpm-lock.yaml` updates (re-link availability confirmed in Task 0.1).
    - _Expected_Behavior: P1 — import graph resolves end-to-end_
    - _Requirements: 2.1, 2.2_
  - [x] 7.4 Convert `agent-surfaces.seam.test.ts` to the real `buildApp()`
    - In `apps/quantai/backend/__tests__/agent-surfaces.seam.test.ts` (lines ~38–45), remove the
      `createApp()` work-around and import/invoke the real `buildApp()` from `../app`.
    - _Bug_Condition: isBugConditionBug1_
    - _Expected_Behavior: P1 — test harness imports `buildApp()` without resolution failure_
    - _Requirements: 2.2_
  - [x] 7.5 Verify Bug 1 fix check (real `buildApp()` boots)
    - **Property 1: Expected Behavior** - quantai boots with all engine seams resolvable
    - **IMPORTANT**: Re-run the SAME test from Task 1 — do NOT write a new test.
    - Run the Task 1 exploration test plus the converted seam test from 7.4; assert `buildApp()`
      returns a booted app registering the previously-broken prefixes (`/cache`, `/cdn`, `/events`,
      `/ml`, `/payments`, `/recommendations`, `/scaling`, `/ab-testing`, `/agentic`).
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 1 fixed).
    - _Requirements: 2.1, 2.2_
  - [x] 7.6 Verify Bug 1 preservation (agent seams unchanged)
    - **Property 4: Preservation** - agent surfaces and resolvable routes unchanged
    - **IMPORTANT**: Re-run the SAME tests from Task 4 (now against the real `buildApp()`) — do NOT
      write new tests.
    - **EXPECTED OUTCOME**: Tests PASS (401/403/2xx matrix and prefixes unchanged; no regressions).
    - _Requirements: 3.1, 3.2_

- [x] 8. Fix Bug 2 — add an `exports` map to `@quant/auth`
  - [x] 8.1 Add the `exports` map (and `"type": "module"`) to `packages/auth/package.json`
    - Add alongside the existing `main`/`types` (keep both = `src/index.ts`):
      `"."` → `./src/index.ts`, `"./services/token-service"` → `./src/services/token-service.ts`,
      `"./lib/secrets"` → `./src/lib/secrets.ts`, `"./lib/prisma"` → `./src/lib/prisma.ts`,
      `"./crypto/secure-random"` → `./src/crypto/secure-random.ts`.
    - Add `"type": "module"` to match sibling packages (flagged in Task 0.2) so ESM resolution of
      the `.ts` targets matches `@quant/payments`/`@quant/agentic`.
    - `./lib/prisma` is mapped explicitly so BOTH `import prisma from '@quant/auth/lib/prisma'`
      (default) and `import { prisma } from '@quant/auth/lib/prisma'` (named, used by e2e) keep
      working. **Do NOT edit `oauth.ts`, `auth.ts`, or `src/index.ts`** — the specifiers stay valid.
    - _Bug_Condition: isBugConditionBug2(import) — deep subpath with no exports entry_
    - _Expected_Behavior: P2 — each deep subpath resolves to its `./src/...` module_
    - _Preservation: deep specifiers resolve to the SAME modules; prisma default+named intact_
    - _Requirements: 2.3, 2.4_
  - [x] 8.2 Convert `engine-surfaces.seam.test.ts` to the real `buildApp()`/`getConfig`
    - In `apps/quantmail/backend/__tests__/engine-surfaces.seam.test.ts` (lines ~18–27), remove the
      `createApp()` work-around and import the real `buildApp()`/`getConfig`.
    - _Bug_Condition: isBugConditionBug2_
    - _Expected_Behavior: P2 — `buildApp()` boots without `Cannot find package '@quant/auth/...'`_
    - _Requirements: 2.4_
  - [x] 8.3 Verify Bug 2 fix check (subpaths resolve, quantmail boots)
    - **Property 2: Expected Behavior** - `@quant/auth` deep subpaths resolve & quantmail boots
    - **IMPORTANT**: Re-run the SAME test from Task 2 — do NOT write a new test.
    - Assert each of the four subpaths resolves to `packages/auth/src/<subpath>` exposing the
      expected symbols (`TokenService`; `getJwtSecret`/`getJwtRefreshSecret`; default+named
      `prisma`; `generateId`), and quantmail `buildApp()` boots.
    - **EXPECTED OUTCOME**: Test PASSES (confirms Bug 2 fixed).
    - _Requirements: 2.3, 2.4_
  - [x] 8.4 Verify Bug 2 preservation (OAuth/auth/E2EE/federation + mocks unchanged)
    - **Property 5: Preservation** - OAuth/auth/E2EE/federation behavior unchanged
    - **IMPORTANT**: Re-run the SAME tests from Task 5 (now via real `buildApp()`) — do NOT write
      new tests. Confirm the e2e `vi.mock('@quant/auth/...')` targets and the `prisma` default+named
      import still work (subpaths resolve to the same modules).
    - **EXPECTED OUTCOME**: Tests PASS (responses, `resolveRedirectUri`, `.strict()` 400, scope seam
      unchanged; no regressions).
    - _Requirements: 3.3, 3.4_

- [x] 9. Fix Bug 3 — classify domain rejection at the route boundary (403, not 500)
  - [x] 9.1 Edit only the `POST /creator/tier/upgrade` handler in `creator.ts`
    - In `apps/quantube/backend/routes/creator.ts`, add `import { createAppError } from '@quant/server-core';`
      (quantube already depends on `@quant/server-core`).
    - Wrap the `tiers.upgradeTier(userId, newTier)` call in try/catch. On rejection, classify using
      the engine's own as-shipped read predicates — **no string matching, engine unchanged**:
      `nonUpward = TIER_VALUES.indexOf(newTier) <= TIER_VALUES.indexOf(tiers.getTier(userId))` and
      `ineligible = !tiers.checkEligibility(userId, newTier)`.
    - If `nonUpward || ineligible` → `throw createAppError(message, 403, 'FORBIDDEN')`; otherwise
      re-throw the original error (genuine fault → handler maps to 500).
    - **Do NOT change** the Zod `safeParse`/`throw parsed.error` 400 path or the
      `200 { success: true, data: { tier } }` success path; touch no other `/creator/*` route or
      `TierService`.
    - _Bug_Condition: isBugConditionBug3(req) — non-upward OR ineligible (post-Zod)_
    - _Expected_Behavior: P3 — forbidden/ineligible → 403 `FORBIDDEN`; genuine faults → 500_
    - _Preservation: P6 — 200 success path, 401/403 auth seam, 400 Zod path unchanged_
    - _Requirements: 2.5, 2.6, 2.7_
  - [x] 9.2 Verify Bug 3 fix check (403 for forbidden/ineligible)
    - **Property 3: Expected Behavior** - forbidden/ineligible upgrades return 403
    - **IMPORTANT**: Re-run the SAME tests from Task 3 — do NOT write new tests.
    - Assert `pro->starter`, `pro->pro`, and ineligible `free->starter` now return `403` with
      `{ success: false, error: { code: 'FORBIDDEN', ... } }`.
    - Extend with a **property-based test**: for all `req` where `isBugConditionBug3(req)` holds
      (random non-upward or ineligible triples), status = 403 and code = `FORBIDDEN`; 500 never
      occurs for these non-faulting inputs.
    - **EXPECTED OUTCOME**: Tests PASS (confirms Bug 3 fixed).
    - _Requirements: 2.5, 2.6, 2.7_
  - [x] 9.3 Verify Bug 3 preservation (valid upgrades + auth/Zod seams)
    - **Property 6: Preservation** - valid upgrades and auth/validation seams unchanged
    - **IMPORTANT**: Re-run the SAME tests from Task 6 — do NOT write new tests.
    - **EXPECTED OUTCOME**: Tests PASS — eligible upward `free->starter` (earnings 200) → 200 with
      engine mutated; unauth → 401; missing scope → 403; invalid body → 400 `VALIDATION_ERROR`;
      other `/creator/*` routes unchanged.
    - _Requirements: 3.5, 3.6_

---

## Phase 4 — Checkpoint

- [x] 10. Checkpoint — full validation across all three bugs
  - Run integration seam suites end-to-end: quantai `agent-surfaces.seam.test.ts` (real
    `buildApp()`, full 401/403/2xx agent matrix), quantmail `engine-surfaces.seam.test.ts` (real
    `buildApp()`/`getConfig`, OAuth/auth + E2EE `.strict()` 400 + federation), and the full quantube
    flow (200 valid upgrade, 403 downgrade, 403 ineligible, 400 malformed body — no 500).
  - Confirm all fix-checking tests (P1, P2, P3) and all preservation tests (P4, P5, P6) pass; run
    `pnpm typecheck`/`pnpm test`/`pnpm build` to confirm the promoted packages and re-link are clean.
  - Ensure all tests pass; ask the user if any questions arise.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

---

## Task Dependency Graph

```
                      ┌─────────────────────────────────────────────┐
                      │ 0. Pre-flight (resolve open confirmations)   │
                      │    0.1 pnpm re-link   0.2 TS ESM .ts exports │
                      └───────────────────────┬─────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │ EXPLORATION (UNFIXED — must FAIL)    │ PRESERVATION BASELINE (UNFIXED — PASS)│
        │                                      │                                       │
        │  1. Bug1 boot (P1 bug-cond)          │  4. Bug1 agent seams (P4 baseline)    │
        │  2. Bug2 boot (P2 bug-cond)          │  5. Bug2 oauth/e2ee (P5 baseline)     │
        │  3. Bug3 500 (P3 bug-cond)           │  6. Bug3 upgrade/zod (P6 baseline)    │
        └───────────────┬──────────────────────┴───────────────────┬───────────────────┘
                        │                                          │
                        ▼                                          ▼
   ┌───────────────────────────────────┐   ┌───────────────────────────────────┐
   │ 7. Fix Bug 1 (quantai)            │   │ depends on: 0.1, 1, 4              │
   │   7.1 add 8 package manifests     │   └───────────────────────────────────┘
   │   7.2 declare 9 deps in quantai   │
   │   7.3 pnpm install (re-link)      │
   │   7.4 convert agent seam test     │
   │   7.5 verify P1 fix  ◄── needs 1  │
   │   7.6 verify P4 preserve ◄─ needs 4│
   └───────────────┬───────────────────┘
                   │
   ┌───────────────▼───────────────────┐   ┌───────────────────────────────────┐
   │ 8. Fix Bug 2 (quantmail)          │   │ depends on: 0.2, 2, 5              │
   │   8.1 add exports map + type:module│   └───────────────────────────────────┘
   │   8.2 convert engine seam test    │
   │   8.3 verify P2 fix  ◄── needs 2  │
   │   8.4 verify P5 preserve ◄─ needs 5│
   └───────────────┬───────────────────┘
                   │
   ┌───────────────▼───────────────────┐   ┌───────────────────────────────────┐
   │ 9. Fix Bug 3 (quantube)           │   │ depends on: 3, 6                  │
   │   9.1 edit upgrade handler        │   └───────────────────────────────────┘
   │   9.2 verify P3 fix  ◄── needs 3  │
   │   9.3 verify P6 preserve ◄─ needs 6│
   └───────────────┬───────────────────┘
                   │
   ┌───────────────▼───────────────────┐
   │ 10. Checkpoint — all P1–P6 pass    │
   └───────────────────────────────────┘
```

**Notes on the graph:**

- Bugs 1, 2, 3 are **independent in root cause** — Tasks 7, 8, 9 may proceed in parallel once their
  respective exploration + preservation-baseline tasks are complete. They are listed sequentially
  for review clarity and to keep the final checkpoint deterministic.
- Every fix's verify sub-tasks **re-run the same tests** authored in the exploration (Tasks 1–3) and
  preservation-baseline (Tasks 4–6) phases — no new tests are written at verification time.
- Task 0 gates Bug 1 (re-link, 0.1) and Bug 2 (TS ESM `.ts` exports, 0.2) before their fixes apply.
