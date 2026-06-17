# Bugfix Requirements Document

## Introduction

Three pre-existing wiring defects were flagged by an automated reviewer but merged into the codebase unfixed. They are independent in their root cause but share a single theme — **broken integration seams between apps and `@quant/*` workspace packages** — so they are tracked together as one cohesive bugfix spec.

| #     | App / File                                                       | Symptom                                                                                 | Impact                                                                                                    |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Bug 1 | `apps/quantai/backend/app.ts` (`buildApp()`)                     | Static imports of route modules that pull non-existent / undeclared `@quant/*` packages | The entire **quantai** backend cannot boot; the agent-seam test harness must avoid importing `buildApp()` |
| Bug 2 | `apps/quantmail/backend/routes/oauth.ts` (and `routes/auth.ts`)  | Deep subpath imports of `@quant/auth` that do not resolve                               | **quantmail**'s `buildApp()` fails at module resolution before any route loads                            |
| Bug 3 | `apps/quantube/backend/routes/creator.ts` (`POST /tier/upgrade`) | Forbidden / illegal tier transitions surface as HTTP 500                                | Clients receive a misleading server-error code for what is actually a client/permission error             |

Bugs 1 and 2 are **boot / module-resolution failures** (the app process cannot start). Bug 3 is a **wrong-HTTP-status defect** (the app runs, but returns the wrong code for a class of inputs). The fix must make all three integration seams resolve and respond correctly, **without changing the behavior of any already-working route, engine, or successful request.**

The bug-condition definitions below use:

- **F** — the current (unfixed) code; **F'** — the fixed code.
- **C(X)** — the bug condition: the inputs/conditions that trigger the defect.
- **¬C(X)** — non-buggy inputs whose behavior must be preserved (`F(X) = F'(X)`).

## Bug Analysis

### Current Behavior (Defect)

**Bug 1 — quantai `buildApp()` phantom-package / undeclared imports (boot failure)**

`buildApp()` statically imports route modules (e.g. `./routes/cache`, `./routes/cdn`, `./routes/events`, `./routes/ml`, `./routes/payments`, `./routes/recommendations`, `./routes/scaling`, `./routes/ab-testing`, `./routes/agentic`) that in turn import `@quant/*` packages which either do not exist as workspace packages (no `package.json`) or are undeclared/unlinked in the quantai app: `@quant/cache`, `@quant/cdn`, `@quant/events`, `@quant/ml`, `@quant/payment`, `@quant/recommendation`, `@quant/scaling`, `@quant/ab-testing`, plus the undeclared `@quant/agentic`.

```pascal
FUNCTION isBugConditionBug1(import)
  INPUT:  import — a static dependency reached transitively from buildApp()
  OUTPUT: boolean
  RETURN import targets a @quant/* package that is not a resolvable,
         declared/linked workspace package
END FUNCTION
```

1.1 WHEN `buildApp()` (or any module that imports it) is loaded THEN the system fails at module resolution before any route is registered, so the quantai backend cannot boot.
1.2 WHEN the agent-seam test harness (`apps/quantai/backend/__tests__/agent-surfaces.seam.test.ts`, lines 38-45) needs to exercise the real app THEN the system forces it to avoid importing `buildApp()` and re-replicate the wiring on `createApp()` because importing `buildApp()` throws.

**Bug 2 — quantmail `oauth.ts` deep `@quant/auth` subpath imports (module-resolution failure)**

`oauth.ts` (and `auth.ts`) import deep subpaths: `@quant/auth/services/token-service`, `@quant/auth/lib/secrets`, `@quant/auth/lib/prisma`, and `@quant/auth/crypto/secure-random`. `@quant/auth`'s `package.json` declares `"main": "src/index.ts"` and has **no** `"exports"` map, so these subpaths do not resolve at runtime (they map to non-existent paths without `src/`).

```pascal
FUNCTION isBugConditionBug2(import)
  INPUT:  import — an import specifier in a quantmail route module
  OUTPUT: boolean
  RETURN import is a deep subpath of @quant/auth (e.g. @quant/auth/services/*,
         @quant/auth/lib/*, @quant/auth/crypto/*) that the package's
         resolution config does not expose
END FUNCTION
```

1.3 WHEN `oauthRoutes` / `authRoutes` are loaded (which quantmail's `buildApp()` registers statically) THEN the system throws `Cannot find package '@quant/auth/services/token-service' imported from apps/quantmail/backend/routes/oauth.ts` and the quantmail backend cannot boot.
1.4 WHEN the engine-surface seam test (`apps/quantmail/backend/__tests__/engine-surfaces.seam.test.ts`, lines 18-27) needs the real app THEN the system forces it to avoid `buildApp()`/`getConfig` and replicate wiring on `createApp()` because the oauth import chain fails resolution.

**Bug 3 — quantube `POST /creator/tier/upgrade` returns 500 instead of 400/403**

The handler calls `fastify.creatorEconomy.tiers.upgradeTier(...)`. `TierService.upgradeTier()` throws a plain `new Error(...)` for a non-upward/illegal transition (`Cannot upgrade from <current> to <new>`) and for an ineligible upgrade (`Creator <id> is not eligible for tier <new>`). The global error handler maps a plain `Error` (no `statusCode`/`code`) to `500 / INTERNAL_ERROR`.

```pascal
FUNCTION isBugConditionBug3(req)
  INPUT:  req — a POST /creator/tier/upgrade request that passed Zod validation
  OUTPUT: boolean
  RETURN upgradeTier() rejects the transition because:
         (a) newTier is not strictly higher than the caller's current tier
             (same-tier or downgrade), OR
         (b) the caller is not eligible for newTier
END FUNCTION
```

1.5 WHEN a forbidden/illegal tier transition is requested (same-tier or downgrade, e.g. `pro` -> `starter`) THEN the system returns HTTP 500 with `code: "INTERNAL_ERROR"`.
1.6 WHEN an upgrade is requested for which the caller is not eligible THEN the system returns HTTP 500 with `code: "INTERNAL_ERROR"`.
1.7 WHEN the request body is invalid (missing `tier` or a value outside the allowed set) THEN the response should be a client error, yet a forbidden-transition/eligibility failure of the same endpoint is indistinguishable from a genuine server fault because both surface as 500.

### Expected Behavior (Correct)

**Bug 1 — quantai boots cleanly**

2.1 WHEN `buildApp()` is imported and invoked THEN the system SHALL resolve every static import successfully and return a booted Fastify app (the phantom/undeclared `@quant/*` packages are created/declared/linked, or the offending routes are properly gated/removed so module resolution succeeds).
2.2 WHEN a test harness needs the real quantai app THEN the system SHALL allow it to import `buildApp()` directly without module-resolution failure.

**Bug 2 — quantmail oauth/auth imports resolve**

2.3 WHEN `oauthRoutes` / `authRoutes` are loaded THEN the system SHALL resolve all `@quant/auth` imports (either by adding an `exports` map to `@quant/auth`'s `package.json` that exposes the required subpaths, or by importing the needed symbols — `TokenService`, `getJwtSecret`, `getJwtRefreshSecret`, `generateId`, the Prisma client — from the package's public entrypoint).
2.4 WHEN quantmail's `buildApp()` is imported and invoked THEN the system SHALL boot without a `Cannot find package '@quant/auth/...'` error, and a test harness SHALL be able to import `buildApp()`/`getConfig` directly.

**Bug 3 — correct HTTP status codes**

2.5 WHEN a forbidden/illegal tier transition is requested (same-tier or downgrade) THEN the system SHALL respond with HTTP 403 and a forbidden-class error envelope (`success: false`), not 500.
2.6 WHEN an upgrade is requested for which the caller is not eligible THEN the system SHALL respond with HTTP 403 and a forbidden-class error envelope, not 500.
2.7 WHEN the request body is invalid (missing `tier` or a value outside `free|starter|pro|enterprise`) THEN the system SHALL respond with HTTP 400 / `VALIDATION_ERROR`; only a genuine, unexpected server fault SHALL surface as 500.

### Unchanged Behavior (Regression Prevention)

**Bug 1 — quantai**

3.1 WHEN the already-wired agent surfaces are exercised (agent-runtime, agent-swarm, quant-tools, browser-agent, code-agent, user-owned-ai) THEN the system SHALL CONTINUE TO enforce the auth seam unchanged: unauthenticated -> 401, valid JWT without the required scope -> 403, valid JWT with scope -> 2xx reaching the decorated engine.
3.2 WHEN routes whose `@quant/*` dependencies already resolve are registered THEN the system SHALL CONTINUE TO register them at their existing prefixes with unchanged behavior.

**Bug 2 — quantmail**

3.3 WHEN the OAuth/auth endpoints run after imports resolve (`/oauth/token`, `/oauth/authorize`, `/oauth/consent`, `/oauth/revoke`, `/oauth/register`, `/auth/login`, `/auth/register`) THEN the system SHALL CONTINUE TO produce their existing responses, including the open-redirect-safe `resolveRedirectUri` behavior and existing 400/401/409 paths.
3.4 WHEN the encryption (E2EE) and federation engine seams are exercised THEN the system SHALL CONTINUE TO behave exactly as before (401 unauth, 403 missing scope, 2xx with scope, and the `.strict()` ciphertext-only rejection at 400).

**Bug 3 — quantube**

3.5 WHEN a valid, eligible, strictly-upward tier upgrade is requested with the `creator:write` scope (e.g. `free` -> `starter` with sufficient earnings) THEN the system SHALL CONTINUE TO upgrade the tier and return HTTP 200 with `{ success: true, data: { tier } }`.
3.6 WHEN `POST /creator/tier/upgrade` is called without authentication or without the `creator:write` scope THEN the system SHALL CONTINUE TO return 401 and 403 respectively, and all other `/creator/*` routes (dashboard, earnings, tier read, tip, credits) SHALL CONTINUE TO behave unchanged.
