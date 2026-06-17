# Engine-Wiring Bugs Fix — Bugfix Design

## Overview

Three independent integration-seam defects prevent two backends from booting and cause a
third to return a misleading HTTP status. They share one theme — **broken seams between apps
and `@quant/*` workspace packages** — so they are fixed together:

| #     | App       | Root-cause class                                                                                                                                                                                                                                                                                                                                           | Fix class                                                                                                             |
| ----- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Bug 1 | quantai   | 8 `@quant/*` route engines exist as source-only folders **without `package.json`** (so they are not resolvable workspace packages), and the real `@quant/agentic` package is **not declared** in quantai's dependencies → `buildApp()` fails at module resolution.                                                                                         | Promote the 8 source-only folders to real workspace packages and declare all 9 packages in quantai.                   |
| Bug 2 | quantmail | `oauth.ts` / `auth.ts` import **deep subpaths** of `@quant/auth` (`services/token-service`, `lib/secrets`, `lib/prisma`, `crypto/secure-random`), but `@quant/auth` declares only `main: src/index.ts` with **no `exports` map**, so the subpaths resolve to non-existent `@quant/auth/<path>` (missing `src/`) → `buildApp()` fails at module resolution. | Add an `exports` map to `@quant/auth` exposing the four subpaths (and `.`) to their `./src/...` sources.              |
| Bug 3 | quantube  | `TierService.upgradeTier()` throws a **plain `Error`** for non-upward / ineligible transitions; the server-core error handler maps a plain `Error` to `500 / INTERNAL_ERROR`.                                                                                                                                                                              | Translate the domain rejection **at the route boundary** into `403 / FORBIDDEN`, letting genuine faults remain `500`. |

The investigation that produced this design confirmed the exact on-disk state for each bug
(see Hypothesized Root Cause). The guiding constraint throughout is **minimality**: every
already-working seam — the global auth hook (401/403), the wired agent surfaces, the OAuth
open-redirect-safe behavior, E2EE, federation, and successful tier upgrades — must behave
**byte-for-byte identically** after the fix.

## Glossary

- **Bug_Condition (C)**: The set of inputs/conditions that trigger a defect. Each bug defines its own `isBugCondition` predicate.
- **Property (P)**: The desired behavior of the fixed code on inputs where `C` holds.
- **Preservation**: Behavior for inputs where `C` does **not** hold must be unchanged: `F(X) = F'(X)`.
- **F / F'**: The original (unfixed) code / the fixed code.
- **Workspace package**: A folder under `packages/` with a `package.json` whose `name` is `@quant/<x>`, linked into apps via `workspace:*`. Without a `package.json` the folder cannot be resolved as `@quant/<x>` at runtime.
- **`exports` map**: The Node.js `package.json` field that whitelists which subpaths a package exposes. When **absent**, Node falls back to legacy resolution and deep subpaths resolve relative to the package root (no `src/`). When **present**, only listed subpaths resolve.
- **`buildApp()`**: Each app's Fastify factory (`apps/<app>/backend/app.ts`) that statically imports and registers all route modules — a single failing transitive import aborts the whole import graph before any route registers.
- **`createApp()`**: The `@quant/server-core` substrate `buildApp()` builds on; it installs the global auth hook and the error handler.
- **TierService**: `packages/creator-economy/src/tiers/tier-service.ts` — in-memory creator-tier engine consumed **as-shipped** by quantube's `creator.ts`.
- **AppError**: A server-core error carrying `statusCode: number` + `code: string`; the error handler honors these. A plain `Error` (no such fields) is mapped to `500 / INTERNAL_ERROR`.

## Bug Details

### Bug 1 — quantai phantom-package / undeclared imports (boot failure)

`buildApp()` (`apps/quantai/backend/app.ts`) statically imports route modules that pull
`@quant/*` engines. Eight of those targets are **source-only folders without a `package.json`**
(`packages/{cache,cdn,events,ml,payment,recommendation,scaling,ab-testing}/` each contain only
`src/` — no `package.json`, `tsconfig.json`, or `vitest.config.ts`), so `@quant/cache`,
`@quant/cdn`, `@quant/events`, `@quant/ml`, `@quant/payment`, `@quant/recommendation`,
`@quant/scaling`, `@quant/ab-testing` are **not resolvable workspace packages**. Separately,
`@quant/agentic` **is** a real package (`packages/agentic/package.json` → `@quant/agentic`) but
is **not declared** in `apps/quantai/package.json` dependencies.

**Formal Specification:**

```
FUNCTION isBugConditionBug1(import)
  INPUT:  import — a static dependency reached transitively from buildApp()
  OUTPUT: boolean

  RETURN import targets a @quant/* package AND
         ( the package folder has no package.json   -- phantom (cache, cdn, events, ml,
                                                        payment, recommendation, scaling, ab-testing)
           OR the package is not declared in the app's package.json )  -- undeclared (agentic)
END FUNCTION
```

**Examples (manifestation):**

- Importing `apps/quantai/backend/app.ts` throws `Cannot find package '@quant/cache'` (or the first unresolved `@quant/*`) before any route registers → quantai cannot boot.
- The agent-seam harness (`__tests__/agent-surfaces.seam.test.ts`, lines 38–45) is forced to **avoid** importing `../app` and re-replicate the agent wiring on `createApp()` because importing `buildApp()` throws.
- `@quant/agentic` resolves only after it is added to `apps/quantai/package.json`; today the `agentic.ts` route's `import { orchestrator, WorkflowEngine } from '@quant/agentic'` is unresolved/unlinked.

### Bug 2 — quantmail deep `@quant/auth` subpath imports (module-resolution failure)

`apps/quantmail/backend/routes/oauth.ts` and `routes/auth.ts` import four deep subpaths:
`@quant/auth/services/token-service` (`TokenService`), `@quant/auth/lib/secrets`
(`getJwtSecret`, `getJwtRefreshSecret`), `@quant/auth/lib/prisma` (default `prisma`), and
`@quant/auth/crypto/secure-random` (`generateId`). `packages/auth/package.json` declares
`"main": "src/index.ts"` and `"types": "src/index.ts"` with **no `"exports"` field**, so Node
resolves the subpaths against the package root (`@quant/auth/services/...`) — paths that do not
exist because the real files live under `src/` (`packages/auth/src/services/token-service.ts`, etc.).

The public entrypoint (`packages/auth/src/index.ts`) **does** export `TokenService`,
`getJwtSecret`, `getJwtRefreshSecret`, and `generateId` — **but it does NOT export the Prisma
client** (`prisma` is only a default + named export of `src/lib/prisma.ts`).

**Formal Specification:**

```
FUNCTION isBugConditionBug2(import)
  INPUT:  import — an import specifier in a quantmail route module
  OUTPUT: boolean

  RETURN import is a deep subpath of @quant/auth
         (@quant/auth/services/*, @quant/auth/lib/*, @quant/auth/crypto/*)
         AND @quant/auth has no exports entry that maps that subpath to ./src/<path>
END FUNCTION
```

**Examples (manifestation):**

- Loading `oauthRoutes` throws `Cannot find package '@quant/auth/services/token-service' imported from apps/quantmail/backend/routes/oauth.ts` → quantmail cannot boot.
- The engine-surface seam test (`__tests__/engine-surfaces.seam.test.ts`, lines 18–27) is forced to avoid `buildApp()`/`getConfig` and replicate wiring on `createApp()`.
- The two e2e tests (`e2e-auth.test.ts`, `e2e-oauth.test.ts`) `vi.mock(...)` all four deep specifiers and import `{ prisma } from '@quant/auth/lib/prisma'` — they depend on the deep specifiers **continuing to exist**, so the fix must keep those subpaths valid (not rename them).

### Bug 3 — quantube `POST /creator/tier/upgrade` returns 500 instead of 403/400

In `apps/quantube/backend/routes/creator.ts`, the handler validates the body with Zod
(`upgradeTierSchema.safeParse`, `throw parsed.error` on failure) then calls
`fastify.creatorEconomy.tiers.upgradeTier(userId, tier)`. `TierService.upgradeTier()`
throws `new Error('Cannot upgrade from <current> to <new>')` for a non-upward transition and
`new Error('Creator <id> is not eligible for tier <new>')` for an ineligible one. Both are
**plain `Error`s with no `statusCode`/`code`**, so the server-core error handler's final branch
maps them to `500 / INTERNAL_ERROR`.

**Formal Specification:**

```
FUNCTION isBugConditionBug3(req)
  INPUT:  req — a POST /creator/tier/upgrade request that passed Zod validation
  OUTPUT: boolean

  current := tiers.getTier(req.auth.userId)
  RETURN indexOf(req.body.tier) <= indexOf(current)        -- (a) non-upward / downgrade / same-tier
         OR NOT tiers.checkEligibility(req.auth.userId, req.body.tier)  -- (b) ineligible
END FUNCTION
```

**Examples (manifestation):**

- `pro -> starter` (downgrade): expected `403 FORBIDDEN`, actual `500 INTERNAL_ERROR`.
- `pro -> pro` (same tier): expected `403 FORBIDDEN`, actual `500 INTERNAL_ERROR`.
- `free -> starter` with earnings `50` (threshold `100`): expected `403 FORBIDDEN`, actual `500 INTERNAL_ERROR`.
- Invalid body (`{}` or `tier: "platinum"`): **already** `400 VALIDATION_ERROR` (ZodError branch) — must stay 400.
- `free -> starter` with earnings `200`: **already** `200 { success: true, data: { tier: "starter" } }` — must stay 200.

## Expected Behavior

### Preservation Requirements

**Unchanged behaviors (Bug 1 — quantai):**

- The six already-wired agent surfaces (agent-runtime, agent-swarm, quant-tools, browser-agent, code-agent, user-owned-ai) keep the exact auth seam: unauth → 401, valid JWT w/o `agents:execute` → 403, valid JWT w/ scope → 2xx reaching the decorated engine.
- Every route whose `@quant/*` dependency already resolves keeps its existing prefix and behavior; engine construction/decoration order in `buildApp()` is unchanged.

**Unchanged behaviors (Bug 2 — quantmail):**

- All OAuth/auth endpoints (`/oauth/token|authorize|consent|revoke|register`, `/auth/login|register`) keep their existing responses, including the open-redirect-safe `resolveRedirectUri` (DB-sourced URI only) and existing 400/401/409 paths.
- The four deep `@quant/auth/*` specifiers continue to resolve to the **same modules** (so the e2e `vi.mock(...)` targets and `import { prisma } from '@quant/auth/lib/prisma'` keep working). `prisma`'s default-import access path is preserved.
- E2EE (`.strict()` ciphertext-only 400 rejection, 401/403/2xx scope seam) and federation seams are untouched.

**Unchanged behaviors (Bug 3 — quantube):**

- A valid, eligible, strictly-upward upgrade with `creator:write` still returns `200 { success: true, data: { tier } }` and mutates the engine state.
- `POST /creator/tier/upgrade` without auth → 401, with auth but missing `creator:write` → 403 (unchanged auth seam). Invalid body → 400 `VALIDATION_ERROR` (unchanged Zod path).
- All other `/creator/*` routes (dashboard, earnings, tier read, tip, credits earn) are untouched.

**Scope (what must NOT change):**

- No route handler logic, schema, prefix, scope, or response envelope is altered except the single `upgradeTier` call site in `creator.ts`.
- `TierService` and every other `@quant/creator-economy` / `@quant/auth` source file is consumed **as-shipped** — no engine rewrites.
- The eight promoted packages' **source** (`src/`) is not modified; only packaging metadata (`package.json` + matching `tsconfig.json`/`vitest.config.ts`) is added.

## Hypothesized Root Cause

Confirmed by direct inspection of the repository:

1. **Bug 1 — missing package manifests + one undeclared dependency.**
   - `packages/{cache,cdn,events,ml,payment,recommendation,scaling,ab-testing}/` each contain only a `src/` folder (verified: no `package.json`). Their `src/index.ts` files export real singletons (`cacheManager`, `cdnManager`, `eventPipeline`, `mlPipeline`, `paymentEngine`, `recommendationEngine`, `autoScaler`, `abTesting`) — so the engines exist; only the package manifest is missing, making them unresolvable as `@quant/*`.
   - `packages/agentic/package.json` exists (`@quant/agentic`) but `@quant/agentic` is **absent** from `apps/quantai/package.json` dependencies (verified), so it is unlinked from quantai.
   - Note: sibling packages `@quant/payments` and `@quant/recommendations` (plural) are valid, but the routes import the singular `@quant/payment` / `@quant/recommendation` — the singular folders are the ones missing manifests; the fix targets the singular folders the routes actually import (no specifier change).

2. **Bug 2 — `exports` map absent.** `packages/auth/package.json` has `main`/`types` = `src/index.ts` and **no `exports`** (verified). Under Node ESM, deep subpaths therefore resolve to `@quant/auth/<subpath>` (package root, no `src/`) and fail. The public index re-exports `TokenService`/`getJwtSecret`/`getJwtRefreshSecret`/`generateId` but **not** `prisma` (verified) — so any "re-route through the public entrypoint" approach would additionally have to widen the public API to export the Prisma singleton.

3. **Bug 3 — domain error lacks transport metadata.** `TierService.upgradeTier()` throws plain `Error` (verified). The server-core handler honors `ZodError` (→400) and `AppError` (→ its `statusCode`/`code`) but maps any other `Error` to `500 / INTERNAL_ERROR` (verified in `error-handler.ts`). The domain engine deliberately does not depend on HTTP semantics, so the correct adapter point is the route, not the engine.

## Correctness Properties

> Single source of truth for the properties that the tests validate. Properties P1–P3 are
> **fix** properties (behavior where a bug condition holds); P4–P6 are **preservation**
> properties (behavior where it does not).

**Property 1: Bug 1 Fix — quantai boots with all engine seams resolvable**

_For any_ import reachable from quantai's `buildApp()` where `isBugConditionBug1` held (a
phantom or undeclared `@quant/*` package), the fixed workspace SHALL resolve it successfully, so
that importing and invoking `buildApp()` returns a booted Fastify app with every route
registered at its existing prefix.

**Validates: Requirements 2.1, 2.2**

**Property 2: Bug 2 Fix — quantmail `@quant/auth` deep subpaths resolve**

_For any_ deep `@quant/auth` subpath import where `isBugConditionBug2` held
(`services/token-service`, `lib/secrets`, `lib/prisma`, `crypto/secure-random`), the fixed
`@quant/auth` package SHALL resolve it to its `./src/...` module, so that loading `oauthRoutes`/
`authRoutes` and invoking quantmail's `buildApp()` succeeds without a `Cannot find package` error.

**Validates: Requirements 2.3, 2.4**

**Property 3: Bug 3 Fix — forbidden/ineligible upgrades return 403**

_For any_ `POST /creator/tier/upgrade` request where `isBugConditionBug3` held (non-upward
transition OR ineligible caller), the fixed handler SHALL respond with `HTTP 403` and a
forbidden-class error envelope (`{ success: false, error: { code: 'FORBIDDEN', ... } }`), not 500.

**Validates: Requirements 2.5, 2.6, 2.7**

**Property 4: Bug 1 Preservation — agent seams and resolvable routes unchanged**

_For any_ request to a quantai surface where `isBugConditionBug1` did **not** hold (the six wired
agent surfaces and every already-resolvable route), `F'` SHALL produce the same result as `F`:
unauth → 401, valid JWT lacking `agents:execute` → 403, valid JWT with scope → 2xx reaching the
decorated engine, and unchanged behavior/prefixes for other routes.

**Validates: Requirements 3.1, 3.2**

**Property 5: Bug 2 Preservation — OAuth/auth/E2EE/federation behavior unchanged**

_For any_ quantmail request where `isBugConditionBug2` did **not** hold, `F'` SHALL equal `F`:
the OAuth/auth endpoints keep their responses (including DB-sourced `resolveRedirectUri` and
400/401/409 paths), the four deep specifiers still resolve to the same modules (mocks/`prisma`
default import intact), and the E2EE `.strict()` 400 + scope seam and federation seam are unchanged.

**Validates: Requirements 3.3, 3.4**

**Property 6: Bug 3 Preservation — valid upgrades and auth/validation seams unchanged**

_For any_ `POST /creator/tier/upgrade` request where `isBugConditionBug3` did **not** hold, `F'`
SHALL equal `F`: a valid eligible upward upgrade with `creator:write` → `200 { success: true,
data: { tier } }` with the engine mutated; unauth → 401; missing scope → 403; invalid body →
`400 VALIDATION_ERROR`; and all other `/creator/*` routes unchanged.

**Validates: Requirements 3.5, 3.6**

## Fix Implementation

### Bug 1 — quantai: promote 8 packages + declare 9 dependencies

**A. Add a package manifest to each source-only engine folder** (no `src/` edits). For each of
`packages/{cache,cdn,events,ml,payment,recommendation,scaling,ab-testing}/`, add a `package.json`
mirroring the established convention (verified against `packages/agentic` and `packages/payments`):

```jsonc
// packages/cache/package.json  (repeat per folder, changing only "name")
{
  "name": "@quant/cache",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint .",
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "~5.5.0",
    "vitest": "^4.1.0",
  },
}
```

- These engines import nothing from `@quant/*` (verified — only Node's built-in `events`), so **no `@quant/*` runtime dependencies** are required in their manifests.
- Add a matching `tsconfig.json` (extending the root, `composite: true`, `include: ["src/**/*"]`) and a `vitest.config.ts` consistent with sibling packages so typecheck/test wiring stays uniform.
- Names map exactly to the route imports: `@quant/cache`, `@quant/cdn`, `@quant/events`, `@quant/ml`, `@quant/payment`, `@quant/recommendation`, `@quant/scaling`, `@quant/ab-testing`.

**B. Declare all nine packages in `apps/quantai/package.json` dependencies** (alphabetical, `workspace:*`):

```
"@quant/ab-testing": "workspace:*",
"@quant/agentic": "workspace:*",
"@quant/cache": "workspace:*",
"@quant/cdn": "workspace:*",
"@quant/events": "workspace:*",
"@quant/ml": "workspace:*",
"@quant/payment": "workspace:*",
"@quant/recommendation": "workspace:*",
"@quant/scaling": "workspace:*",
```

**C. Re-link the workspace** (`pnpm install` / equivalent) so the new `@quant/*` symlinks appear
in `node_modules`. After this, `buildApp()`'s import graph resolves end-to-end.

> **Decision (create/declare, not gate/remove):** Requirement 2.1 permits either creating the
> packages or gating/removing the offending routes. The engine source already exists and is
> exported, and the routes are intentionally wired, so **creating manifests + declaring deps** is
> the minimal change that keeps all routes live and behavior identical. Removing/gating routes
> would change the app's surface and is rejected.

### Bug 2 — quantmail: add an `exports` map to `@quant/auth`

Add an `"exports"` field to `packages/auth/package.json` that exposes the public entrypoint plus
the four subpaths the quantmail routes (and e2e mocks) require, mapped to their `./src/...`
TypeScript sources (consistent with `main`/`types` = `src/index.ts`):

```jsonc
// packages/auth/package.json  (add alongside existing "main"/"types")
"exports": {
  ".": "./src/index.ts",
  "./services/token-service": "./src/services/token-service.ts",
  "./lib/secrets": "./src/lib/secrets.ts",
  "./lib/prisma": "./src/lib/prisma.ts",
  "./crypto/secure-random": "./src/crypto/secure-random.ts"
}
```

- Keep `"main"`/`"types": "src/index.ts"` so the bare `@quant/auth` import (used by quantai and quantmail) still resolves via the `"."` entry.
- `./lib/prisma` is mapped explicitly so `import prisma from '@quant/auth/lib/prisma'` (default) and `import { prisma } from '@quant/auth/lib/prisma'` (named, used by the e2e tests) both keep working — **this is why the exports-map approach is chosen over re-routing through the public index**, which does not export `prisma` and would force widening the package's public API.
- The map is intentionally narrow (only the subpaths actually imported repo-wide — verified there are no other deep `@quant/auth/*` source imports). A `"./*": "./src/*"` wildcard entry MAY be added as a forward-compatible safety net if desired, but is not required by the current import set.

> **Decision (exports map, not re-route):** Requirement 2.3 permits either approach. The exports
> map is the more surgical fix: it touches **one file** (`packages/auth/package.json`), leaves
> both route files and `prisma`'s default-import access path **byte-for-byte unchanged**, and
> keeps the e2e `vi.mock('@quant/auth/...')` specifiers valid. Re-routing would require editing
> `oauth.ts`, `auth.ts`, **and** the public `src/index.ts` (to export `prisma`), and would change
> the prisma access path — rejected.

> **Loader/extension note:** Workspace `@quant/*` packages are consumed from TS source
> (`main: src/index.ts`) via the app's TS ESM loader, so the `exports` targets reference `.ts`
> files to match. Implementation must confirm the resolved targets are loaded the same way the
> existing `"."`/`main` entry is (the loader already handles `src/index.ts`).

### Bug 3 — quantube: translate the domain rejection at the route boundary

Edit only the `POST /creator/tier/upgrade` handler in
`apps/quantube/backend/routes/creator.ts`. Add `import { createAppError } from '@quant/server-core';`
(quantube already depends on `@quant/server-core`) and wrap the `upgradeTier` call so a domain
rejection is classified — **using the engine's own read-only predicates, not string matching** —
into a forbidden-class `AppError`:

```ts
const { tiers } = fastify.creatorEconomy;
const newTier = parsed.data.tier as CreatorTier;
try {
  const tier = tiers.upgradeTier(request.auth.userId, newTier);
  return reply.send({ success: true, data: { tier } });
} catch (err) {
  // upgradeTier rejected the transition. Classify with the engine's as-shipped
  // read predicates so the right client-facing status is returned without
  // modifying TierService or matching on error message text.
  const current = tiers.getTier(request.auth.userId);
  const nonUpward = TIER_VALUES.indexOf(newTier) <= TIER_VALUES.indexOf(current);
  const ineligible = !tiers.checkEligibility(request.auth.userId, newTier);
  if (nonUpward || ineligible) {
    throw createAppError((err as Error).message, 403, 'FORBIDDEN');
  }
  throw err; // genuine, unexpected fault → handler maps to 500
}
```

Why this shape:

1. **Happy path untouched** — on success the code path and `200 { success: true, data: { tier } }` envelope are identical to today (Property 6 / Req 3.5).
2. **Zod path untouched** — invalid body still `throw parsed.error` (ZodError) → existing 400 branch (Req 2.7); no new logic on that path.
3. **403 for both forbidden classes** — non-upward (same-tier/downgrade) and ineligible both map to `403 / FORBIDDEN` via `createAppError`, honored by the server-core handler's `isAppError` branch (Req 2.5, 2.6).
4. **500 reserved for real faults** — any rejection that is neither non-upward nor ineligible re-throws the original error → handler's default `500 / INTERNAL_ERROR` (Req 2.7).
5. **Engine consumed as-shipped** — `TierService` is not modified; `getTier`/`checkEligibility`/`upgradeTier` are its public methods, and its own unit tests (message-based `toThrow`) remain valid.

`TIER_VALUES` (already defined in `creator.ts` as `['free','starter','pro','enterprise']`)
matches the engine's internal `TIER_ORDER`, so the route's index comparison mirrors the engine's
upgrade rule exactly.

## Testing Strategy

### Validation Approach

Two phases per bug: first surface counterexamples that demonstrate the defect on **unfixed**
code, then verify the fix and prove preservation. Because Bugs 1 & 2 are boot/resolution
failures, their primary fix check is "the previously-failing real `buildApp()` now imports and
boots, and the seam harnesses no longer need their `createApp()` work-arounds."

### Exploratory Bug-Condition Checking (run on UNFIXED code)

**Goal:** Confirm the root-cause analysis by reproducing each failure before fixing.

**Test cases:**

1. **Bug 1 — import the real app**: `import('../app')` / `buildApp()` in quantai → expect a module-resolution throw naming a `@quant/*` package (e.g. `@quant/cache`). Confirms phantom packages.
2. **Bug 1 — agentic undeclared**: confirm `@quant/agentic` is absent from `apps/quantai/package.json` even though `packages/agentic/package.json` exists.
3. **Bug 2 — import the real app**: `buildApp()` in quantmail → expect `Cannot find package '@quant/auth/services/token-service' ...`. Confirms missing exports map.
4. **Bug 3 — forbidden transition**: `POST /creator/tier/upgrade` with `pro -> starter` (after `setTier('pro')`) → observe `500 / INTERNAL_ERROR`.
5. **Bug 3 — ineligible transition**: `free -> starter` with earnings below `100` → observe `500 / INTERNAL_ERROR`.

**Expected counterexamples:** items 1/3 → `Cannot find package '@quant/*'`; items 4/5 → `500` where `403` is correct. If item 1/3 instead surfaced a _different_ error, re-hypothesize.

### Fix Checking

**Goal:** For all inputs where the bug condition holds, the fixed code produces the expected behavior.

```
-- Bug 1
ASSERT import('apps/quantai/backend/app.ts') resolves AND buildApp() returns a booted app

-- Bug 2
FOR ALL subpath IN { services/token-service, lib/secrets, lib/prisma, crypto/secure-random } DO
  ASSERT import('@quant/auth/' + subpath) resolves to packages/auth/src/<subpath>
END FOR
ASSERT quantmail buildApp() boots without "Cannot find package '@quant/auth/...'"

-- Bug 3
FOR ALL req WHERE isBugConditionBug3(req) DO
  ASSERT status(handler(req)) = 403 AND body.error.code = 'FORBIDDEN'
END FOR
```

### Preservation Checking

**Goal:** For all inputs where the bug condition does NOT hold, `F'(X) = F(X)`.

```
-- Bug 1
FOR ALL agentSurface DO ASSERT (401 unauth, 403 missing scope, 2xx with scope reaching engine) unchanged

-- Bug 2
FOR ALL oauth/auth/e2ee/federation request WHERE NOT isBugConditionBug2 DO
  ASSERT F'(req) = F(req)   -- incl. resolveRedirectUri (DB-sourced), 400/401/409, E2EE .strict() 400
END FOR
ASSERT the four deep specifiers still resolve to the same modules (vi.mock targets + prisma default import intact)

-- Bug 3
FOR ALL req WHERE NOT isBugConditionBug3(req) DO ASSERT F'(req) = F(req) END FOR
  -- valid eligible upward upgrade → 200 {success,data:{tier}} + engine mutated; 401; 403 (scope); 400 (Zod)
```

Property-based testing is recommended for Bug 3 preservation/fix: generate random
`(currentTier, newTier, earnings)` triples and assert the response status partitions exactly as
`{ upward & eligible → 200, non-upward → 403, ineligible → 403, invalid body → 400 }`, with 500
never occurring for these generated (non-faulting) inputs.

### Unit Tests

- **Bug 1**: a test that imports the real quantai `buildApp()` and asserts it boots and registers the previously-broken prefixes (`/cache`, `/cdn`, `/events`, `/ml`, `/payments`, `/recommendations`, `/scaling`, `/ab-testing`, `/agentic`).
- **Bug 2**: a resolution test importing each of the four `@quant/auth` subpaths and asserting the expected symbols (`TokenService`, `getJwtSecret`/`getJwtRefreshSecret`, default `prisma`, `generateId`); quantmail `buildApp()` boots.
- **Bug 3**: handler tests for `pro->starter` (403), `pro->pro` (403), ineligible `free->starter` (403), invalid body (400), and eligible `free->starter` (200).

### Property-Based Tests

- **Bug 3**: random tier/earnings generation verifying the status partition above and that the success envelope/engine mutation is unchanged for the valid-upgrade class.
- **Bug 2**: (optional) generate over the set of exposed subpaths and assert each resolves; assert unexposed/typo subpaths still fail (the exports map is intentionally narrow).

### Integration Tests

- **Bug 1**: convert `agent-surfaces.seam.test.ts` to exercise the **real** `buildApp()` (remove the `createApp()` work-around) and re-run the full 401/403/2xx agent-surface matrix unchanged.
- **Bug 2**: convert `engine-surfaces.seam.test.ts` to use the **real** `buildApp()`/`getConfig`; re-run OAuth/auth, E2EE (`.strict()` 400 + scope), and federation seams.
- **Bug 3**: full quantube flow — authenticate with `creator:write`, perform a valid upgrade (200), then attempt a downgrade (403) and an ineligible upgrade (403), and a malformed body (400), confirming no 500.

---

### Open implementation confirmations (to resolve during the tasks phase)

1. Confirm the workspace re-link step (`pnpm install`) is available in the build/CI sandbox so the new `@quant/*` symlinks are created; if installs are constrained, the tasks must account for it.
2. Confirm the TS ESM loader resolves `exports`-map `.ts` targets identically to the existing `main: src/index.ts` entry (Bug 2). If the loader requires extensionless or `./dist` targets for some packages, mirror whatever `@quant/payments`/`@quant/agentic` use.
