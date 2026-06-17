# Implementation Plan: Engine Integration Wiring

> Sequenced per the design: Stage 0 (seam scaffolding) → Stage 1 (cross-cutting, once in `server-core`) → Stages 2–6 (per-app, deepest-first: quantai → quantmeet → quantneon → quantube → remaining). Every wiring task ends only when its four DoD invariants pass. Tasks are wiring/integration, not rewrites.

## Stage 0 — Seam foundation and tooling

- [x] 1. Establish the canonical plugin/decorator convention and document it next to `prisma.ts`
  - Add a short `packages/server-core/src/plugins/README.md` describing the seam: decorate → `declare module 'fastify'` → `onClose` → `fp(..., { name, dependencies })`, using `prisma.ts` as the reference.
  - Define the `{ success, data | error }` response envelope helper usage for engine routes.
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Build the engine wiring inventory and DoD model
  - [x] 2.1 Create `EngineWiring` / `SeamArtifacts` / `DoDResult` types and a checked-in inventory of all 68 engines with `lane`, `targets`, `stage`, `dependsOn`, `status`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [x] 2.2 Implement a DoD evaluator script: DoD-1 import-graph check (`@quant/<engine>` imported in non-test `apps/**`/`server-core/**` + present in `dependencies`).
    - _Requirements: 5.1, 5.5_
  - [x] 2.3 **[PBT]** Property tests (fast-check) for inventory invariants: single registration site for cross-cutting (P3), dependency ordering (P4), `done ⟹ importer exists` (P1).
    - _Requirements: 8.4, 5.5_

- [x] 3. Wire `@quant/api-client` as the frontend consumption substrate
  - Ensure `useApiQuery`/`useApiMutation` exist and are exported; add to consuming apps' `dependencies`.
  - Add a lint/test guard that flags inline `fetch` to backends in UI surfaces (enforces "api-client only").
  - _Requirements: 1.4, 4.1_

## Stage 1 — Cross-cutting engines (once in `server-core`, inherited by all apps)

- [x] 4. Register the already-existing-but-unregistered plugins in `createApp()`
  - [x] 4.1 Register `observability`, `feature-flags`, `audit`, `organizations` plugins in `createApp()` with correct `dependencies` ordering (after `prisma`/`auth`).
    - _Requirements: 2.1, 2.2, 2.3, 4.3_
  - [x] 4.2 Unit-test each: plugin decorates the instance and registers `onClose`; OTel stays import-gated behind `OTEL_EXPORTER_OTLP_ENDPOINT`.
    - _Requirements: 8.1_

- [x] 5. Wire `identity-permissions` (RBAC) and `teams` into the auth substrate
  - Decorate `server-core` with permission/team context; expose `requireAuth({ scopes })` scope evaluation backed by `identity-permissions`.
  - Add seam test: valid JWT lacking a required scope → 403; with scope → 2xx.
  - _Requirements: 2.1, 4.3, 5.6, 7.4, 8.2_

- [x] 6. Wire `notifications` as a cross-cutting plugin
  - Create `plugins/notifications.ts` (`dependencies: ['prisma']`) constructing `PreferenceService` + `NotificationFanout`/`CrossAppDispatcher` from `fastify.prisma`; register in `createApp()`.
  - Add unit test (decorate + onClose) and inheritance test (an app calling only `createApp()` exposes `fastify.notifications`).
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 8.1, 8.3_

- [x] 7. Wire remaining cross-cutting engines: `performance`, `error-monitoring`
  - [x] 7.1 `performance`: request timing/budget hook modeled on `observability.ts`.
    - _Requirements: 2.1, 2.2_
  - [x] 7.2 `error-monitoring`: hook into the `error-handler` plugin to capture/forward errors; correlate via `x-request-id`.
    - _Requirements: 2.1, 7.x (request-id propagation), 8.5_

- [x] 8. Wire cross-cutting frontend surfaces: `onboarding`, `command-palette`, `contextual-sidekick`, `universal-timeline`, `wellbeing`, `bharat-ai`
  - Decide shared-layout-wrapper vs per-app (resolve design Open Question 1); wire via `api-client` where backend-backed.
  - Verify inheritance: apps using `createApp()` + shared layout get the surface without per-app re-registration.
  - _Requirements: 2.1, 2.4, 1.4_

- [x] 9. Stage 1 gate: run DoD evaluator for all cross-cutting engines; confirm single registration site and no per-app duplication
  - _Requirements: 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

## Stage 2 — quantai (deepest agent stack)

- [x] 10. Wire the agent engines into quantai `buildApp()`
  - [x] 10.1 Decorate and register `agent-runtime` (routes under `/agents`); construct with `app.prisma` (+ `@quant/ai` where the engine expects it).
    - _Requirements: 3.1, 3.3, 3.4_
  - [x] 10.2 Wire `agent-swarm`, `quant-tools`, `browser-agent`, `code-agent`, `user-owned-ai` into their route prefixes, honoring `dependsOn` order.
    - _Requirements: 3.1, 3.2, 3.5, 4.4_
  - [x] 10.3 Add Next `app/api/*` proxies (propagate Bearer + `x-request-id`; default URL = backend `PORT`) and `api-client` hooks for the agent surfaces.
    - _Requirements: 1.4, 1.5, 1.6, 5.3_
  - [x] 10.4 Seam tests via `inject()`: authed 2xx, unauthed 401, scope 403; proxy forward test.
    - _Requirements: 5.2, 5.6, 8.2, 8.5_
  - [x] 10.5 quantai DoD gate (DoD-1..4 green for each agent engine).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

## Stage 3 — quantmeet

- [x] 11. Wire `quant-live` (voice) and `encryption` (E2EE) into quantmeet
  - [x] 11.1 Decorate `quant-live` in quantmeet `buildApp()`; routes + proxy + `api-client` hook.
    - _Requirements: 3.1, 3.3, 1.4, 1.5, 1.6_
  - [x] 11.2 Wire `encryption`: seam transports ciphertext only; key material stays client-side.
    - _Requirements: 7.5, 3.1_
  - [x] 11.3 Seam tests + quantmeet DoD gate.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.2_

## Stage 4 — quantneon

- [x] 12. Wire `ar-lenses`, `federation`, `media`/`generative-media`/`photos`, and feed engines into quantneon
  - [x] 12.1 `ar-lenses` decorator + routes + proxy + hook (shared-vs-app config per design Open Question 2).
    - _Requirements: 3.1, 3.2, 1.4_
  - [x] 12.2 `federation` wiring (scoped routes); `recommendations` + `ranking` + `ml-pipeline` + `ml-runtime` + `triton-client` for the feed (wire as-is even if internals are `@simulated`).
    - _Requirements: 3.1, 3.5, 7.4, 9.1_
  - [x] 12.3 Seam tests + quantneon DoD gate.
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Stage 5 — quantube and creator surfaces

- [x] 13. Wire `media`, `recommendations`/`ranking`/`ml-*`, `cross-publish`, `creator-economy` into quantube
  - [x] 13.1 Decorators + routes + proxies + `api-client` hooks for video/feed/creator surfaces.
    - _Requirements: 3.1, 3.2, 1.4, 1.5, 1.6_
  - [x] 13.2 Wire `payments` into creator-economy/paid surfaces: Stripe keys from secrets (never hardcoded), webhook signature verification, scoped routes. (Resolve design Open Question 3: Stripe test mode acceptable for DoD.)
    - _Requirements: 7.4, 7.6, 3.1_
  - [x] 13.3 Seam tests + quantube DoD gate.
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Stage 6 — remaining apps

- [x] 14. Wire remaining per-app engines into their targets
  - [x] 14.1 `encryption` + `federation` into quantchat and quantmail (ciphertext-only seam; scoped routes).
    - _Requirements: 3.1, 3.2, 7.4, 7.5_
  - [x] 14.2 Feed/recommendation engines into quantmax; `ar-lenses` into quantchat.
    - _Requirements: 3.1, 3.2_
  - [x] 14.3 quant-mobile engines (`maps`, `quant-health`, `device-control`, `iot-control`, `wearables`, `voice-first-os`, `local-first`) wired where the mobile shell supports them; otherwise recorded `deferred` with reason.
    - _Requirements: 3.1, 6.7_
  - [x] 14.4 `payments` into other paid apps per target list.
    - _Requirements: 3.2, 7.6_
  - [x] 14.5 Per-app DoD gates.
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Final verification

- [x] 15. Whole-feature acceptance
  - [x] 15.1 Run the DoD evaluator across the full inventory; assert every non-deferred engine is `done` and every deferred engine has a recorded reason (scaffold or blocked external).
    - _Requirements: 6.1, 6.4, 6.5, 6.6, 6.7, 5.5_
  - [x] 15.2 Confirm scope boundaries upheld: no `@simulated` core de-simulated, no Dockerfiles/Helm/CI/migrations added, no new persistent schema, deferred scaffolds untouched (except promoted-for-sequencing cases).
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 15.3 Confirm auth invariant repo-wide: every engine-backed route 401s unauthenticated and reaches the engine with a valid JWT; public allowlist unchanged.
    - _Requirements: 7.1, 7.2, 7.3_
