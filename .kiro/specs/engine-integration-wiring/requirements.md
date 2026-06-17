# Requirements Document: Engine Integration Wiring

## Introduction

The Quant-Ecosystem monorepo (17 apps, ~90 packages, 8 services) contains ~68 production-quality "orphaned" engine packages with zero importers — real code that no app consumes at runtime. This feature wires those engines into their intended target apps so the ecosystem becomes a connected product. The work is overwhelmingly integration-seam wiring, not rewrites, and builds on the already-complete runtime foundation (Phase 83: `@quant/server-core` `createApp()` injects `fastify.prisma` and enforces `requireAuth`; frontends declare `next@15`).

These requirements are derived from `design.md`. They define one repeatable integration seam (engine → `server-core` plugin/decorator → Fastify route → Next.js API proxy → `api-client` query), a cross-cutting-first then per-app deepest-first sequencing, an enforceable per-engine Definition of Done, a categorization of the 68 engines, and explicit scope boundaries.

### Terminology

- **Seam**: the chain of files connecting an engine to a user-visible surface.
- **Cross-cutting lane**: wiring done once in `@quant/server-core` and inherited by all apps via `createApp()`.
- **Per-app lane**: wiring done in a target app's `buildApp()` + routes + proxy + frontend.
- **DoD**: Definition of Done — the four invariants that prove a wiring is real.
- **Deferred scaffolds**: `service-discovery`, `co-presence`, `universal-capture`, `voice-input`, `quant-flow`.

---

## Requirements

### Requirement 1: Standard Integration Seam Pattern

**User Story:** As a platform engineer wiring engines, I want a single canonical seam pattern, so that every one of the 68 integrations is mechanical, consistent, and reviewable.

#### Acceptance Criteria

1. WHEN an engine is wired THEN the system SHALL follow the five-layer seam: engine package → `server-core` plugin or app `buildApp()` decorator → Fastify route → Next.js API proxy → `@quant/api-client` query.
2. WHERE an engine is decorated onto a Fastify instance THE plugin/decorator SHALL be modeled on `packages/server-core/src/plugins/prisma.ts` (decorate the instance, declare the type via `declare module 'fastify'`, register `onClose` cleanup, wrap with `fastify-plugin`).
3. WHEN an engine service requires database access THEN it SHALL be constructed with the injected `fastify.prisma` singleton rather than instantiating its own client.
4. WHEN a frontend surface consumes an engine THEN it SHALL call through a typed `@quant/api-client` query/mutation and SHALL NOT use inline `fetch` to the backend.
5. WHEN a Next.js API proxy forwards a request THEN it SHALL propagate the `Authorization` bearer header and an `x-request-id` to the backend route.
6. WHERE a backend URL is referenced by a proxy THE default value SHALL equal the matching backend's `PORT` (single source of truth via `NEXT_PUBLIC_<APP>_BACKEND_URL`).

---

### Requirement 2: Cross-Cutting Engine Wiring (Once in server-core)

**User Story:** As an app developer, I want shared engines wired once in `server-core`, so that every app inherits them without per-app duplication.

#### Acceptance Criteria

1. WHEN a cross-cutting engine is wired THEN the system SHALL implement it as a `server-core` plugin registered inside `createApp()` exactly once.
2. WHEN a cross-cutting plugin constructs an engine that needs prisma THEN it SHALL declare `dependencies: ['prisma']` (or the relevant dependency) so it registers after `prismaPlugin`.
3. WHERE the plugins `observability.ts`, `feature-flags.ts`, `audit.ts`, and `organizations.ts` already exist in `server-core` but are unregistered THE system SHALL register them in `createApp()` rather than re-implementing them.
4. WHEN an app already calls `createApp()` THEN it SHALL inherit every cross-cutting engine WITHOUT requiring any per-app registration edit.
5. IF a cross-cutting engine is registered THEN the system SHALL ensure no app re-registers the same engine (exactly one registration site).

---

### Requirement 3: Per-App Feature Engine Wiring

**User Story:** As a product engineer, I want feature engines wired into their target apps, so that each app's headline capability is powered by its real engine.

#### Acceptance Criteria

1. WHEN a per-app engine is wired THEN the system SHALL decorate it in the target app's `backend/app.ts` `buildApp()` and register its routes with a route prefix.
2. WHEN a per-app engine targets multiple apps THEN the system SHALL wire it into each named target app independently.
3. WHEN a feature route is added THEN it SHALL validate input with Zod and return the standard `{ success, data | error }` envelope.
4. WHERE a per-app engine binding is added THE global auth hook established by `createApp()` SHALL remain intact (the binding SHALL NOT bypass authentication).
5. WHEN a per-app engine depends on a cross-cutting engine or another per-app engine THEN the dependency SHALL be wired first.

---

### Requirement 4: Sequencing — Cross-Cutting First, Then Per-App Deepest-First

**User Story:** As a tech lead, I want a deterministic wiring order, so that shared substrate exists before dependents and the hardest app surfaces issues early.

#### Acceptance Criteria

1. WHEN wiring begins THEN the system SHALL wire `@quant/api-client` (frontend substrate) and the cross-cutting engines BEFORE any per-app feature engine.
2. WHEN cross-cutting wiring is complete THEN the system SHALL wire per-app engines deepest-first in the order quantai → quantmeet → quantneon → quantube, then remaining apps.
3. WHERE identity-permissions (RBAC) or teams extend the auth substrate THEY SHALL be wired before any per-app route that declares fine-grained scopes.
4. WHEN an engine declares `dependsOn` entries THEN every dependency SHALL be registered before that engine (no engine reaches `done` while registered before a dependency).

---

### Requirement 5: Per-Engine Definition of Done Enforcement

**User Story:** As a reviewer, I want each wiring proven done by automatable checks, so that "individually-plausible" code becomes verifiably connected.

#### Acceptance Criteria

1. WHEN an engine is marked done THEN DoD-1 SHALL hold: a non-test module under `apps/**` or `packages/server-core/**` statically imports the engine's package specifier AND the engine appears in the consumer's `dependencies`.
2. WHEN an engine-backed route is tested with a valid JWT THEN it SHALL respond 2xx (DoD-2), AND WHEN tested without a valid JWT THEN it SHALL respond 401.
3. WHEN an engine is marked done THEN DoD-3 SHALL hold: a Next `app/api/*` proxy forwards to the route AND a UI surface calls it via `api-client`.
4. WHEN an engine is marked done THEN DoD-4 SHALL hold: a seam test traverses proxy/route → engine (not the engine in isolation).
5. IF any DoD invariant is false THEN the engine status SHALL NOT be `done`.
6. WHEN a route declares `requireAuth({ scopes })` AND a valid JWT lacks those scopes THEN the route SHALL respond 403.

---

### Requirement 6: Engine Categorization and Inventory

**User Story:** As a planner, I want the 68 engines categorized with targets and order, so that the work can be scheduled and tracked.

#### Acceptance Criteria

1. WHEN the inventory is produced THEN each engine SHALL be assigned exactly one lane: `cross-cutting`, `per-app`, or `deferred`.
2. WHERE an engine is `cross-cutting` ITS targets SHALL be `['server-core']`; WHERE an engine is `per-app` ITS targets SHALL list at least one app directory.
3. WHEN an engine is categorized THEN it SHALL record `stage` (0–6) and `dependsOn` for sequencing.
4. WHERE an engine is a thin scaffold (`service-discovery`, `co-presence`, `universal-capture`, `voice-input`, `quant-flow`) IT SHALL be marked `deferred` and SHALL NOT be wired in this feature, UNLESS another non-deferred engine depends on it for correct sequencing, IN WHICH CASE it MAY be processed normally to unblock that dependent.
5. IF an engine depends on a deferred scaffold THEN that engine SHALL also be deferred, UNLESS the scaffold has been promoted to normal processing under criterion 6.4.
6. WHEN an engine does not expose a constructible service (dependencies are unbuilt externals) THEN it SHALL be routed to `deferred` rather than forced into a lane.
7. WHERE a non-scaffold engine cannot yet meet its DoD for reasons other than being a thin scaffold (e.g., a blocking external dependency) IT MAY be marked `deferred` with a recorded reason.

---

### Requirement 7: Authentication and Security Preservation

**User Story:** As a security owner, I want wiring to preserve the auth model, so that connecting engines never opens an unprotected path.

#### Acceptance Criteria

1. WHEN any engine-backed route outside the public allowlist receives an unauthenticated request THEN it SHALL respond 401 with `{ success:false, error:{ code:'UNAUTHORIZED' } }`.
2. WHEN any engine-backed route receives a valid JWT THEN `request.auth` SHALL be populated before the engine is invoked.
3. WHILE wiring engines THE system SHALL NOT add entries to the public allowlist without explicit review.
4. WHERE an engine is sensitive (payments, identity-permissions, federation, encryption) ITS routes SHALL require appropriate scopes via `requireAuth({ scopes })`.
5. WHEN `encryption` (E2EE) is wired for quantchat/quantmail/quantmeet THEN the seam SHALL transport ciphertext only and SHALL keep key material client-side.
6. WHEN `payments` is wired THEN Stripe keys SHALL be read from config/secrets and SHALL NOT be hardcoded, AND webhook handlers SHALL verify signatures.

---

### Requirement 8: Verification, Testing, and Observability of Seams

**User Story:** As a QA engineer, I want seam-level tests and traceability, so that runtime connections (not just isolated units) are validated.

#### Acceptance Criteria

1. WHEN a plugin/decorator is added THEN a unit test SHALL assert it decorates the instance with a usable service and registers `onClose`.
2. WHEN a seam is wired THEN an integration test SHALL use Fastify `inject()` against `buildApp()` to assert authed 2xx, unauthed 401, and (where applicable) insufficient-scope 403.
3. WHEN a cross-cutting engine is wired THEN a test SHALL prove an app that only calls `createApp()` exposes the capability without local registration.
4. WHEN the DoD evaluator / wiring state machine is implemented THEN property-based tests (fast-check) SHALL assert the categorization invariants (single registration site, dependency ordering, done implies importer).
5. WHEN a Next proxy is added THEN a test SHALL assert it forwards method/body and propagates `authorization` + `x-request-id` and relays status.

---

### Requirement 9: Scope Boundaries

**User Story:** As a stakeholder, I want explicit boundaries, so that this feature stays focused on wiring and does not absorb adjacent efforts.

#### Acceptance Criteria

1. WHERE an engine internally calls a `@simulated` core THE wiring SHALL connect the engine as-is AND SHALL NOT de-simulate the core (that is a separate effort).
2. WHEN this feature is executed THEN it SHALL NOT undertake replacement of the 27 mock-data screens beyond what is required to demonstrate DoD-3 consumption.
3. WHEN this feature is executed THEN it SHALL NOT add Dockerfiles, Helm charts, CI deploy changes, or Prisma migrations (deployability is out of scope).
4. WHEN this feature is executed THEN it SHALL NOT wire the deferred thin scaffolds.
5. WHEN this feature is executed THEN it SHALL NOT introduce new persistent database schema; it SHALL wire existing engine models to existing routes.
