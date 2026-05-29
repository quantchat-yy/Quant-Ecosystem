# Quant Ecosystem — Integration & Realness Audit + Kiro Completion Plan

> Generated 2026-05-29 from a deep read of the integration branch (Phases 76–82 merged):
> 16 apps, 8 services, 88 packages. Method: import-graph analysis, route/screen tracing,
> backend runtime-wiring inspection, and cross-check against Kiro's own `.agents/state/`
> artifacts (`mock-debt.csv`, `simulated-inventory.md`, `risk-register.md`).

## 0. Verdict

The ecosystem is **assembled from individually-plausible parts that were never connected.**
CI is green (typecheck 117, test 121, build 94) because unit tests don't exercise the
runtime seams. The headline meta-pattern, repeated everywhere:

> Backends, schemas, engines, and UIs are **real and substantial**; the **integration seams**
> (Prisma injection, auth preHandlers, proxy ports, frontend build tooling, action handlers,
> package imports, deployment) are **consistently missing.**

This is overwhelmingly **wiring work, not rewrites.** Closing it is what takes the repo from
"demo that compiles" to a Meta/Google-grade product.

There are **4 debt classes**, in priority order:

| # | Class | Size | Severity |
|---|---|---|---|
| 0 | **Runtime foundation broken** (prisma/auth/ports not wired) | every app | 🔴 P0 — apps don't run end-to-end |
| 1 | **Unbuildable / dead frontends** | 6 apps + flagship stub flows | 🔴 P0/P1 |
| 2 | **Orphaned engines** (real code, 0 importers) | 68 packages | 🟠 P1 |
| 3 | **Frontend mock data + FAKE/NAIVE cores** | 27 screens + 39 files | 🟠 P1/P2 |

---

## 1. App archetypes (from screen-by-screen audit)

- **Next.js app-router — real, runnable (7):** quantai, quantcalendar, quantchat, quantdocs, quantdrive, quantmail, quantmeet. Frontend → Next `/api/*` → (proxy) → Fastify backend.
- **Fastify backend + ORPHANED React `pages/` (6):** quantads, quantedits, quantmax, quantneon, quantsync, quantube. **Frontends cannot build** — Next-style `pages/` importing `next/router` with **no `next`/`vite` dependency, no bundler, no HTML entry**; `build` is `tsc --noEmit`. Backends are real; the UIs are dead source.
- **Library-only "apps" (3):** marketing (components, never bundled), status (engine lib, no UI), quant-mobile (Capacitor stubs, no real `@capacitor/core` dep, no app shell).

### Per-app status

| App | Type | Maturity /5 | Headline gap |
|---|---|---|---|
| quantai | Next | 3 | Next route proxies `:3002/assistant/*`; backend is `:3020` with `/sessions`,`/agents` → chat broken; fake client streaming |
| quantcalendar | Next | 3 | Most complete; proxy `:3104` ≠ backend `:3060`; AI scheduling backend unexposed |
| quantdocs | Next | 3 | "New Document" no onClick; proxy `:3105` ≠ backend `:3040`; only `/api/docs` exposed |
| quantmail | Next | 2 | Compose Send/Save have **no onClick**, inputs unbound; Next API only covers `drive/*` |
| quantchat | Next | 2 | 3 conflicting backend targets across hooks; `getConversations` has no route; nav no-op |
| quantdrive | Next | 2 | Upload + Share are dead stubs (`void files`); only listing works |
| quantmeet | Next | 1 | **No video** — no `livekit-client`/`getUserMedia`; VideoTile shows initials; `/api/meetings/recent` 404 |
| quantube/neon/max/sync/ads/edits | Fastify + dead React | 1 | **Frontend can't build** (no bundler); components hardwired to MOCK data |
| marketing | React lib | 2 | Never served |
| status | TS lib | 3 | No UI |
| quant-mobile | Capacitor stub | 1 | No real mobile runtime |

---

## 2. Debt class 0 — runtime foundation (🔴 P0, fix FIRST)

1. **Prisma never injected.** 36 route files read `(fastify as any).prisma`, but **no `fastify.decorate('prisma', …)` exists anywhere** (not in any `app.ts`, not in `server-core/app.ts`). `fastify.prisma` is `undefined` → services constructed with `undefined` → **first DB call throws.** Every DB endpoint is dead.
   - Fix: add a Prisma plugin in `@quant/server-core` (`packages/server-core/src/plugins/`) that `decorate`s the `@quant/database` singleton + `onClose` disconnect; register in `createApp()`.
   - Evidence: `apps/quantmail/backend/routes/emails.ts:48,77`; absent in `packages/server-core/src/app.ts`.

2. **Auth never enforced.** `server-core/src/plugins/auth.ts:25` defines `requireAuth` (jose verify is correct) but it's attached to **zero routes**; no global auth hook. `request.auth` always `undefined`; routes read `request.auth?.userId` (49 places) → unconditional 401s or identity-less execution. **JWTs never verified on any app route.**
   - Fix: global `onRequest` auth hook in `createApp()` (allowlist public routes) + `{ preHandler: fastify.requireAuth() }` on protected routes.

3. **Frontend↔backend proxy ports are wrong by default in every Next app.** Three non-agreeing port schemes (backend `PORT`, Next `*_BACKEND_URL`, `.env.local.example`). e.g. quantmail backend `:3010` vs Next proxy `:3001`; quantai `:3020` vs `:3002`. **`pnpm dev` cannot reach any backend.**
   - Fix: single source of truth via `@quant/service-discovery`; set every Next `*_BACKEND_URL` default to the matching backend `PORT`; document in `.env.example`.

4. **Only 1 of 21 deployables ships.** Only `ws-gateway` has Dockerfile + Helm + CI deploy. **12 app backends + 7 services have no container/Helm/CI.** `docker-compose.*` define only backing infra (no app containers). System can't be stood up.
   - Fix: per-app Dockerfile + Helm chart + CI matrix + compose entries.

5. **No committed Prisma migrations** (real 48-model schema applied via `db push --force-reset`) → no safe prod evolution. Generate baseline migration.

6. **`smtp-inbound` & `ci-runner` don't boot** (barrel-only entry / no `start` script).

7. **CDC/outbox has no producer** — `OutboxEvent` + cdc-relay reader + search-indexer consumer exist, but no app writes outbox rows → Kafka→search path inert.

8. **`@quant/server` is dead duplicate** (0 importers; the real one is `@quant/server-core`, 146 importers). Delete it.

---

## 3. Debt class 2 — 68 orphaned engines → intended app targets

All real, production-quality code, never imported. Wire each into its target (excerpt; full table in agent output):

| Engine (LOC) | Wire into |
|---|---|
| payments (12.6k, real Stripe) | quant-commerce, creator-economy, all paid apps |
| notifications (5.7k) | all apps |
| observability (10k), performance (10k), error-monitoring (1.3k) | server-core + all apps (cross-cutting) |
| identity-permissions (3.1k RBAC), teams (1.3k) | server-core auth + all apps |
| agent-runtime (13.6k), agent-swarm, quant-tools, browser-agent, code-agent, user-owned-ai | quantai |
| ar-lenses (3.5k) | quantneon, quantchat, quantmeet |
| encryption (E2EE) | quantchat, quantmail, quantmeet |
| federation (6.9k) | quantneon, quantchat, quantmail |
| recommendations (8.3k) + ranking + ml-pipeline + ml-runtime + triton-client | quantube, quantneon, quantmax feeds |
| quant-live (7.7k voice) | quantmeet, quantai, voice-first-os |
| media, generative-media, photos, cross-publish | quantube, quantedits, quantneon |
| creator-economy | quantube, quantneon |
| maps, quant-health, device-control, iot-control, wearables, voice-first-os, local-first | quant-mobile |
| onboarding, command-palette, contextual-sidekick, api-client, universal-timeline, wellbeing, bharat-ai | all apps |

**Thin scaffolds (defer until host needs them):** service-discovery, co-presence, universal-capture, voice-input, universal-timeline, quant-flow.

---

## 4. Debt class 3 — mock data (27 screens) + FAKE/NAIVE (39 files)

- **27 mock screens** (`.agents/state/mock-debt.csv`): quantai, quantchat, quantmail, quantedits, quantmax, quantneon, quantube — replace hardcoded arrays with live `api-client` queries.
- **39 FAKE/NAIVE** (`.agents/state/simulated-inventory.md`): all 12 agent pilots (no LLM → wire `@quant/ai`); 14 ml-pipeline files (→ Triton/ONNX/pgvector); recommendations 3 (→ trained model); quantmeet SFU 3 (→ LiveKit/mediasoup); moderation CSAM fake (→ PhotoDNA/Thorn); search index (→ Meilisearch); federation matrix 2 (→ matrix-js-sdk).

---

## 5. Kiro execution plan (waves, in order)

**Wave 0 — Runtime foundation (unblocks everything; ~days, high leverage).**
Prisma plugin in server-core → auth enforcement → reconcile proxy ports → per-app Docker/Helm/CI → baseline Prisma migration → fix smtp-inbound/ci-runner entrypoints → delete dead `@quant/server`.
**DoD:** `pnpm dev` boots every app, a DB-backed request succeeds, a protected route 401s without a valid JWT and 200s with one, every app has a green container build.

**Wave 1 — Make the 6 dead frontends buildable + fix flagship stub flows.**
Add Next (or Vite) bundler/router/entry to quantube/neon/max/sync/ads/edits. Wire quantmail compose (Send/Save → `useEmail.sendEmail`), quantdrive upload/share, quantai/quantchat backend connections.
**DoD:** every app frontend builds and runs; the headline action of each flagship works end-to-end.

**Wave 2 — Kill the 27 mock screens.** Per `mock-debt.csv`: add backend route + Next proxy + `api-client` query; flagships first.
**DoD:** zero hardcoded arrays; every list view hits a real API.

**Wave 3 — Wire the 68 orphaned engines** (§3 table), cross-cutting first (notifications/observability/identity), then per-app deepest-first (quantai → quantmeet → quantneon → quantube).
**DoD:** each app's headline feature is powered by its real engine.

**Wave 4 — Replace FAKE/NAIVE** (§4), behind feature flags; agent-pilots→LLM and SFU→LiveKit highest impact.
**DoD:** `simulated-inventory.md` → zero FAKE; only intentional NAIVE fallbacks remain.

**Wave 5 — Quality/infra.** Coverage 30%→50% (auth/payments/security 80%); E2E against live server; staging cluster; validate Helm/Terraform; refresh stale `quant-autonomous-status.json` (says phase-75 while 82 exists).

---

## 6. Quick-reference fix anchors

- Prisma plugin: `packages/server-core/src/plugins/` + `packages/server-core/src/app.ts` `createApp()`
- Auth: `packages/server-core/src/plugins/auth.ts:25` (`requireAuth`, currently unused)
- Ports: each `apps/*/backend/app.ts` `PORT` vs each `apps/*/src/app/api/**` `*_BACKEND_URL`
- Dead frontends: `apps/{quantube,quantneon,quantmax,quantsync,quantads,quantedits}/package.json` (no `next`/`vite`)
- quantmail compose: `apps/quantmail/src/app/compose/page.tsx` (no onClick)
- quantmeet video: `apps/quantmeet/src/**` (no `livekit-client`/`getUserMedia`)
- Deploy: `.github/workflows/{ci,deploy-production}.yml` (`SERVICES="ws-gateway"`), `infra/helm/quant-platform/values.yaml`
- Schema: `packages/database/prisma/schema.prisma` (no `migrations/`)
- Dead pkg: `packages/server/` (delete)
