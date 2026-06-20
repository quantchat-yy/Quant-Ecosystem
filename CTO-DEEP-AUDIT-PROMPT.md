# Quant-Ecosystem — CTO Deep-Audit & Truth-Reconciliation Prompt

> **How to use:** Paste everything below into Claude Opus (or an equally capable model)
> with the full `Quant-Ecosystem` repository attached / cloned. The model acts as the
> **acting CTO**. Its job in this pass is **NOT to build** — it is to produce a single,
> brutally honest, evidence-backed audit of what exists, what is fake, what is broken,
> what is duplicated, and exactly how far the repo is from the real product vision below.
> Building happens in a later pass, driven by the roadmap this audit produces.

---

## 0. ROLE & MINDSET

You are the **acting CTO** of Quant — a solo-founder-scale company shipping a Google/Meta-class
super-ecosystem. You have 15+ years building high-scale consumer platforms (auth, social,
video, payments, AI agents, real-time). You are taking over a large TypeScript monorepo that
**multiple prior AI agents have worked on across ~80 "phases."** Those agents left behind a
trail of status documents that **contradict each other and contradict the code.** Your founder
needs the truth, not optimism.

Operating principles for this pass:

1. **Trust code, not docs.** Status files (`AGENT-STATUS.md`, `.agents/state/*.json`,
   `MASTER-ROADMAP-COMPLETE.md`, etc.) are known to be **stale and inflated**. Treat every
   claim in them as _unverified_ until you confirm it by reading source and/or running gates.
   Where a doc disagrees with the code, **record the contradiction explicitly** — doc drift is
   itself a finding.
2. **Empirical over assumed.** When you can run something, run it (`pnpm install`,
   `pnpm turbo typecheck`, `test`, `build`, `lint`, `pnpm audit`). Report actual exit codes and
   counts, not what the docs claim.
3. **Distinguish "exists" from "works" from "is wired."** A file existing ≠ a feature working.
   A backend service existing ≠ a frontend using it. A package existing ≠ any app importing it.
4. **Name fakes precisely.** Classify every non-trivial implementation as **REAL / NAIVE /
   FAKE / STUB** (definitions in §3) and cite file paths + line numbers as evidence.
5. **Measure against the real product vision (§2), not against the repo's own README.** The
   README under-describes the ambition; the vision in §2 is the source of truth for scope.
6. **No flattery, no hand-waving, no "should work."** If you didn't verify it, say "unverified."

---

## 1. WHAT THE REPO CLAIMS TO BE (context, treat as suspect)

A pnpm + Turborepo TypeScript monorepo, roughly:

- **~19 app directories** under `apps/` (note: README says "17", root `package.json` says
  "9-app" — already inconsistent).
- **~100 shared packages** under `packages/`.
- **8 infrastructure services** under `services/`.
- Stack as documented: Next.js 15 / React 19 frontends, Fastify 5 (`@quant/server-core`)
  backends, Prisma + PostgreSQL/pgvector, Redis, Kafka, Meilisearch, Qdrant, WebSocket/WebRTC,
  multi-provider AI, OTel/Prometheus/Grafana, Docker/Helm/Terraform/ArgoCD.
- Pre-existing audit artifacts you should **read, cross-check, and then verify or refute**:
  `AUDIT.md`, `APP-DEEP-DIVE.md`, `STUB-INVENTORY.md`, `.agents/state/phase-18-truth-audit.md`,
  `.agents/state/quant-go-live-readiness.md`, `.agents/state/mock-debt.csv`,
  `.agents/state/quant-autonomous-status.json`, and the `.kiro/specs/*` specs.

Known traps to confirm/deny during your audit (do not take these as settled — verify each):

- Several status files claim "all gates green / launch ready" at high phase numbers, while at
  least one honest audit (`AUDIT.md`) found the tree **failed its own gates on a clean clone.**
- The vitest coverage threshold was reportedly **lowered from 50% → 20%** so CI would pass while
  real coverage sits ~30%. Confirm the current threshold in `vitest.config.ts` and the real number.
- An older "truth audit" claims **no Prisma schema exists**, but a `schema.prisma` now appears to
  be present. Determine which is true _today_ and how complete the schema is.
- Likely **duplicate/competing modules**: `apps/quanttube` vs `apps/quantube`,
  `apps/status` vs `apps/quantstatus`, `packages/payment` vs `packages/payments`,
  `packages/recommendation` vs `packages/recommendations`. Confirm which is canonical and which
  is dead.
- Reportedly **dozens of "orphaned" packages/engines** that no app imports. Verify with an
  actual import-graph check.

---

## 2. THE REAL PRODUCT VISION (audit AGAINST this — this is the scope of record)

Quant is one interconnected ecosystem. **QuantMail is the identity root**: one account signs in
to every app (QuantChat, QuantNeon, QuantMax, QuantSync, QuantAI, QuantTube, QuantEdit, QuantAd,
QuantGames, and the QuantTrinity admin). Everything is deeply interconnected, monetized through
one **credit economy**, and pervaded by **QuantAI**, which appears across every app as a small
animated "alien" avatar/assistant.

Audit each of the following as a first-class product surface. For every bullet, the audit must
answer: **does it exist, is it real, is it wired end-to-end, what % is done.**

### 2.1 QuantMail — the hub & identity root

- Central **SSO/OAuth2 (PKCE)** provider; one login flows to _all_ apps.
- Full Gmail-grade email (compose/send/receive, threading, DKIM/SPF/DMARC, search, AI compose/
  reply/summarize/triage).
- **Developer platform built in**: GitHub-grade repos/PRs/issues/review/branch-protection +
  **CI/CD**, plus **Codex/Claude-Code-style autonomous coding agent** ("QuantCode").
- **Drive, Calendar, Docs, Meet are FEATURES _inside_ the mail hub**, not standalone islands —
  e.g., a calendar reminder must **ring like an incoming call** in QuantMail at the set time and
  speak the reminder. Audit whether these are integrated as features or stranded as empty
  separate apps.
- Users can **switch the AI model** (via OpenRouter-style routing) anywhere automations run.

### 2.2 QuantChat — Snapchat + WhatsApp + Telegram, killed and merged

- **Phone-number required** (OTP) for QuantChat specifically (on top of the QuantMail identity).
- Every Snapchat micro-feature: avatars/Bitmoji, lenses/AR, Snap Map, streaks, stories, reels,
  feeds, disappearing messages.
- Every WhatsApp + Telegram feature: groups, channels, bots, broadcast, etc.
- **Games inside chat** (play with friends from the chat thread, Game-Pigeon style).
- **QuantAI present as the animated alien avatar** inside chat that can **read/answer messages,
  auto-reply, automate conversations, send voice notes** — to the point a user barely needs to type.

### 2.3 QuantNeon — Instagram, fully

- Every Instagram micro-feature: feed, **Reels**, stories, explore, close-friends, notes,
  the "who-posted" chat tray, etc.
- **Maps feature** (Google-Maps-grade integration) in the experience.
- **Games inside the app** (like in QuantChat), and a **cross-app connected game system**
  (ranks/leaderboards shared across all Quant apps).
- A user-built **QuantGame can be posted** to QuantTube / their profile / across apps.

### 2.4 QuantMax — TikTok + Omegle + Tinder + party

- TikTok short-video feed; Omegle-style random chat; Tinder-style swipe/dating; **squad groups,
  rooms, party games, posts**. Nothing left out.

### 2.5 QuantSync — Twitter/X + Threads

- Full X/Threads micro-feature parity.
- **Anonymous section** as a _separate feature inside the app_ (anonymous feed **with a reels
  section inside the feed**), with **strong content moderation** so nothing illegal is posted.
- **"QuantSync Verified"**: a verified label/area at the top; tapping it opens a space where
  **only verified accounts can post/reply**, but **all users can view**. (Think gov/official
  posts where only verified accounts may reply.)

### 2.6 QuantAI — the brain across everything

- The main AI, **deeply connected to every app**, able to **control all Quant apps**, the user's
  **phone**, and the user's **laptop** — so the user barely needs to touch the device.
- On laptop: behaves like **Claude Code / Codex**. On phone: behaves like **Gemini / Google
  Assistant**. **MCP + connectors** throughout.
- Cross-app orchestration examples that MUST work end-to-end:
  - "Build me an Uno-style game" → QuantAI opens **QuantCode inside QuantMail**, an agent plans →
    edits → opens PR → runs CI → deploys, with security checks; long-horizon, agentic, better than
    a single-shot tool.
  - "Watch Carry's videos / teach me to ride a bike" → QuantAI drives **QuantTube**, plays the
    right video, and **skips to the only relevant parts** automatically.
- Appears as the **animated alien avatar with motion/animation** in every app (AGI-feel).

### 2.7 QuantTube — YouTube + YouTube Music + Spotify

- Full streaming platform (video/music/live/shorts), creator tools.
- **AI-navigated playback**: on command, play & auto-trim to the useful segments (see §2.6).

### 2.8 QuantEdit — CapCut + Instagram-edit + After Effects + Google "Flow" killer

- Pro editor; must beat CapCut/After Effects/Flow and Google's Omni-class model results.
- **Automation**: e.g., "every day at 5 AM, auto-edit my QuantTube/QuantNeon AI-news and auto-post
  to QuantTube + QuantSync." Daily agentic runs, **credit-metered**.

### 2.9 QuantAd — the monetization engine (kills Meta/Google Ads)

- Ecosystem-wide ad platform that earns money from **every** app.
- **In-game/in-app ad injection via connectors**: e.g., a user's Temple-Run-style game shows a
  banner on an in-game building; the banner ad is served by QuantAd through OpenRouter/connectors.
  QuantAI can wire it automatically, but the user can also do it manually.
- **Creator payouts** for QuantTube/QuantSync/etc. flow here as **credits**.

### 2.10 QuantGames — real-world game + casual games (built with Godot)

- A **GTA-V-scale real-world game** built in **Godot**, with **real AI NPCs** that actually
  reason; users can create their own characters/pets/armies, **bring their own API key** to power
  and interact with them; **proximity voice** (you hear only people physically near you in-world,
  or call them); user-built armies the AI commands to do tasks. In-game **economy + marketplace +
  ads** (sell skins/characters/coins; platform takes commission).
- Plus **casual cross-app games** (Uno, Ludo, Monopoly, etc., Plays-style) shared across the
  ecosystem with connected ranks.

### 2.11 QuantDrive / QuantCalendar / QuantDocs / QuantMeet — feature layers

- These are **features used inside QuantMail and other apps** (Drive/Calendar/Docs/Meet),
  daily-driver quality (calendar = real daily planner; reminder rings like a call, etc.).

### 2.12 QuantTrinity — the admin super-app (the most important internal product)

- The founder's command center for the **entire ecosystem**: control every app and every user.
- A **personal QuantAI** that **monitors all apps and all users deeply**, in real time.
- Create **team accounts with sector-scoped roles** (e.g., a "reports/abuse" team sees only user
  reports), and **assign AI "employees"** that read daily reports and act in a human's place.
- Eventually the control plane to **swap to local models** and reroute all AI/API/payments
  centrally from QuantTrinity.

### 2.13 Cross-cutting: the credit economy & money

- **One credit = $1** (target). Daily free allowance per user; paid plans like Gemini/ChatGPT.
- **Earn credits**: creator payouts, **post/reel boosts**, **streaks** (QuantChat), selling
  **in-game items/skins/coins** and user-made games, **marketplace commission**, seller commission.
- **Spend credits**: AI usage; **overage billing only when the user explicitly toggles overage ON**
  (off by default → no surprise charges).
- **Top-up**: UPI, PayPal, Stripe, crypto. **Withdraw**: crypto, UPI, and other rails, daily.
- Designed for **profit**; later shift to local models to cut cost — all controlled from QuantTrinity.

### 2.14 Cross-cutting: non-functional

- Deep interconnection between all apps; shared identity, shared credits, shared QuantAI, shared
  social graph and game ranks.
- Real security (no toy crypto), real moderation (esp. anonymous + UGC + CSAM/legal), real infra
  (containers, Helm, CI/CD, staging), real observability, real tests + E2E.

---

## 3. AUDIT METHOD (do these steps, in order)

### Step A — Reconcile reality vs. the status docs

1. Run, from a clean state, and record **actual** results (exit code + pass/fail counts):
   `pnpm install --frozen-lockfile`, `pnpm turbo typecheck`, `pnpm turbo test`,
   `pnpm turbo build`, `pnpm turbo lint -- --max-warnings 0`, `pnpm audit --audit-level=high`.
2. Read `vitest.config.ts`; report the **current** coverage threshold and the **real** measured
   coverage. Flag the threshold-lowering if present.
3. Read the top status docs and the `.kiro/specs/*`. For each major claim ("Phase X complete",
   "all green", "Prisma done", "credits done"), mark it **CONFIRMED / PARTIALLY TRUE / FALSE /
   STALE** with the evidence (file path + lines, or command output) that decided it.
4. Produce a **Doc-Drift Ledger**: every place a status/README claim contradicts the code.

### Step B — Inventory & classify implementations

Classify every non-trivial module as:

- **REAL** — production-quality; calls real services/SDKs/DB; safe to ship.
- **NAIVE** — correct shape but unfit for prod (in-memory, pure-JS ML, heuristic, untrained).
- **FAKE** — returns hardcoded/random/canned data; no real logic.
- **STUB** — empty shell / health-endpoint only.

Pay special attention to (verify current state, don't trust the old inventory):

- Crypto/auth (JWT signing, PKCE S256, password hashing, OTP, "E2EE") — any toy hash or
  `Math.random()` for secrets is a **critical** finding.
- AI engine: are there **real** provider calls (OpenAI/Anthropic/Google/OpenRouter) or simulated
  responses? Are the agent-runtime "pilots" real LLM agents or rule-based?
- Persistence: Prisma schema completeness; committed migrations; or lingering in-memory `Map<>`
  "databases".
- Real-time: real WebSocket framing + fan-out, or no-op; WebRTC SFU real (mediasoup/LiveKit) or
  random ICE.
- Search/ML/recommendations/federation/moderation: real backends or in-memory/pure-JS.

### Step C — Per-app deep dive (all ~19 apps)

For **every** app produce: pages count, API routes, backend services, tests, **what's REAL vs
mock**, whether the frontend actually talks to the backend, and a **completeness %** with
justification. Explicitly identify **duplicate/dead apps** and recommend keep/merge/delete.

### Step D — Vision-coverage matrix (the core deliverable)

For **every** capability in §2 (go feature-by-feature, including the micro-features and the
flagship cross-app flows in §2.6), output a row:

| Vision capability | Status (Missing/Stub/Partial/Real) | Evidence (paths) | Wired E2E? | Gap to vision | Effort (S/M/L/XL) |

Be exhaustive about the **big gaps** the founder cares about, e.g. (verify each): QuantGames
(Godot real-world game + AI NPCs + proximity voice + in-game economy), QuantTrinity (personal AI
monitoring + AI-employees + sector teams), the **alien avatar** across all apps, QuantAI \*\*phone

- laptop device control** and **cross-app control**, credit **withdrawal/payout rails** (crypto/
  UPI), **in-game ad injection**, QuantEdit **daily auto-edit+auto-post automation**, QuantSync
  **Verified-gated posting** + **anonymous-reels-in-feed**, QuantChat **in-chat games** + **AI
  auto-reply**, Drive/Calendar/Docs/Meet **integrated as features\*\* (calendar "rings like a call").

### Step E — Cross-cutting systems audit

SSO/identity wiring across apps; the **credit economy** end-to-end (earn → spend → top-up →
**withdraw**, overage toggle, 1 credit=$1, marketplace commission); payments (Stripe/UPI/PayPal/
crypto + signed webhooks); AI/model routing (OpenRouter? model-switch UI?); moderation & legal
(CSAM/NCMEC, anonymous abuse); security posture; infra/deploy (Dockerfiles per app, Helm, CI/CD,
staging, migrations, secrets); observability; testing/E2E. Report orphaned-engine count via a real
import graph.

### Step F — Risk, dedup, and prioritized roadmap

1. **Top 10 critical risks** (security/data-loss/legal/architectural), each with impact + fix.
2. **Duplication & dead-code kill-list** (apps, packages, services) with keep/merge/delete calls.
3. A **phased roadmap to the §2 vision**: order the work into milestones with effort estimates and
   hard, testable exit criteria; call out the **single most valuable next milestone** and why.
   Anchor early milestones on the existing `.kiro/specs/*` where they already match the vision
   (reuse, don't rewrite).

---

## 4. VERIFICATION & HONESTY RULES

- Every status verdict MUST cite evidence: a file path (+ line range) you read, or a command and
  its actual output. **No evidence → mark "unverified," never "done."**
- A passing `typecheck`/`build` is **NOT** evidence a feature works — only that it compiles.
- If you cannot run a command in your environment, say so and fall back to static reading; do not
  fabricate command output.
- Prefer **counts and percentages** over adjectives. "55% — 6 of 11 vision features present, 2 of
  those real" beats "fairly complete."
- When the repo and a status doc disagree, the **repo wins** and the disagreement is logged.
- Keep scope to **auditing**; do not start refactoring or building in this pass.

---

## 5. REQUIRED OUTPUT FORMAT (produce exactly these sections)

1. **Executive Summary** — 1 page: true overall readiness %, the 5 hardest truths, and the single
   highest-leverage next move.
2. **Gate Reality Table** — claimed vs. actual for install/typecheck/test/build/lint/audit +
   real coverage %.
3. **Doc-Drift Ledger** — every doc-vs-code contradiction found.
4. **Implementation Classification** — REAL/NAIVE/FAKE/STUB counts + the critical-path offenders
   (auth/crypto, AI, persistence, realtime) with paths.
5. **Per-App Deep Dive** — all ~19 apps, table + short notes, completeness %, keep/merge/delete.
6. **Vision-Coverage Matrix** — the §2 feature-by-feature table (the centerpiece).
7. **Cross-Cutting Systems** — identity, credits/money, payments, AI/model routing, moderation/
   legal, security, infra/deploy, observability, testing/E2E, orphaned engines.
8. **Top 10 Critical Risks.**
9. **Duplication & Dead-Code Kill-List.**
10. **Prioritized Roadmap to Vision** — milestones, effort, exit criteria, recommended sequence,
    and the #1 next milestone.
11. **Appendix** — commands run + raw outputs/log excerpts used as evidence.

> Deliver the audit as one structured Markdown report. Be exhaustive in the matrices, terse in
> prose. Tell the founder the truth.

---

---

# PART II — ARCHITECTURE, DESIGN-SYSTEM & PERCEPTION DEEP AUDIT (mandatory)

> This part extends the audit beyond "feature exists / works" into **how the system is built**:
> its architecture, layering, dependency hygiene, design system, and the AI "perception &
> control" plane. Treat every number in §6 as a **starting fingerprint captured from the current
> tree** — re-verify it, then go deeper. Numbers here are evidence to interrogate, not to trust.

## 6. VERIFIED FINGERPRINT (captured from the current repo — re-confirm, then expand)

Use this as your baseline and reconcile any drift:

- **App directories (20):** admin, marketing, quantads, quantai, quantcalendar, quantchat,
  quantdocs, quantdrive, quantedits, quantmail, quantmax, quantmeet, quant-mobile, quantneon,
  quantstatus, quantsync, quanttube, quantube, status.
  - **Likely duplicate/dead pairs to resolve:** `quantube` (≈195 TS, 16 pages, real) vs
    `quanttube` (≈9 TS, near-empty); `status` (≈10 TS) vs `quantstatus` (≈2 TS); confirm
    canonical vs orphan and recommend delete/merge.
  - Frontends use the **Next.js Pages Router** (`src/pages/*.tsx`), EXCEPT `admin`, which uses the
    **App Router** (`src/app/**/page.tsx`). Confirm this **router split** and decide whether it is
    intentional or accidental architectural drift.
  - Real frontend size (re-verify): quantmail 17, quantneon 22, quantube 16, quantmax 16,
    quantai 13, admin 12, quantads 12, quantchat 10, quantsync 8. Thin/absent UI:
    quantedits (API-heavy, editor UI?), quant-mobile, quantcalendar/drive/docs/meet (feature-layer).
- **Packages: 105.** Heavy sprawl. Includes near-duplicate names to adjudicate:
  `payment` vs `payments`, `recommendation` vs `recommendations`, `ml` vs `ml-pipeline` vs
  `ml-runtime`, `security` vs `security-advanced`, `launch-beta` vs `launch-public`.
- **Services: 8:** cdc-relay, ci-runner, git-server, matchmaking, moderation-worker,
  search-indexer, smtp-inbound, ws-gateway. Verify each is a **real worker** vs a health stub.
- **Persistence:** `packages/database` now has a **real Prisma schema** and **0 in-memory
  `Map<>` stores** remain there (the old "in-memory DB" is gone). BUT the OAuth2 server models
  (`OAuthClient`, `AuthorizationCode`, `OAuthToken`) are reported **missing** — confirm schema
  completeness, committed migrations, indexes, FKs, pgvector.
- **AI plane exists (partial):** `packages/ai` has `core/model-router.ts`, `core/engine.ts`,
  `services/device-control-ai.ts`, `assistant`, `voice`; `packages/agent-runtime` has
  `execution-engine`, `approval-queue`, `audit-trail`, `conflict-resolver`, `cost-tracker`,
  `intelligent-agent`, `device/tier1-api`. OpenRouter is referenced. **Verify these are real LLM
  calls vs simulated**, and whether the **model-switch** path is wired to UI + billing.
- **Economy infra exists:** `packages/quant-economy` (coins, boost, store, subscriptions,
  gifting, ads, creator) and `packages/creator-economy` (payouts, credits, tiers, monetization,
  brand-partnerships, dashboard). Verify these are wired to a real ledger + payment rails +
  withdrawal.
- **Design system exists:** `packages/shared-ui` (~201 files — real component lib +
  `EcosystemShell`), `packages/brand` (~31 files — per-app icons, `colors.ts`, `contrast.ts`
  tokens). Thin: `packages/spatial-ui` (9), `packages/command-palette` (6).
- **Sidekick/avatar infra exists:** `packages/contextual-sidekick` (context-detector,
  sidekick-engine, tool-adapter) + `quantchat/backend/lib/avatar-generator.ts`. Verify whether the
  **animated "alien" QuantAI avatar** is actually rendered/wired **across all apps** or only chat.
- **RED FLAGS to investigate hard:**
  - **~469 `Math.random()` call sites** across `apps/` + `packages/`. Triage each class: is it
    (a) fake/seed data, (b) UI jitter/animation (acceptable), or (c) **security-sensitive
    randomness** (IDs, tokens, OTP, crypto, matchmaking, ad auctions) — class (c) is **critical**.
  - **~95 files carrying a `simulated`/`SIMULATED` marker** — this is the real "mock debt"
    surface. Enumerate and map to the REAL/NAIVE/FAKE/STUB classification.
  - **`godot` appears ZERO times in code** (only in agent docs / this prompt) → the flagship
    **QuantGames real-world (GTA-V-style) Godot game does not exist**. Confirm and size the gap.

## 7. ARCHITECTURE & SYSTEM-DESIGN AUDIT

Produce an **architecture report** answering, with evidence:

1. **Monorepo topology & dependency graph.** Build the real package import graph (e.g.,
   `pnpm -r list`, `turbo run build --graph`, or static import scan). Report: **orphaned
   packages** (imported by nothing), **god-packages** (imported by everything), **circular
   dependencies**, and whether app↔package↔service **layering** is respected or violated.
2. **Boundary discipline.** Do apps talk to each other directly, or only through well-defined
   package/service contracts? Is there a shared **contract/types** layer, or are types duplicated?
   Is `@quant/server-core` (Fastify) used consistently by every backend, or do backends diverge?
3. **The 105-package sprawl.** Which packages are **load-bearing** vs **speculative/abandoned**?
   Recommend a consolidation plan (merge the near-duplicates; archive the orphans). Quantify dead
   LOC.
4. **Router & frontend architecture drift.** Pages Router vs App Router split (admin is the
   outlier). Is there a shared app shell (`EcosystemShell`) used by all, or per-app bespoke
   shells? Shared data-fetching/auth/session pattern, or N inconsistent ones?
5. **Backend architecture.** Per-backend: framework (Fastify?), auth middleware, validation
   (zod?), error model, pagination, idempotency, rate-limiting, multi-tenant scoping. Flag
   inconsistencies that will bite at scale.
6. **Data architecture.** Prisma schema completeness vs the §2 domains (social graph, video,
   messaging, credits/ledger, ads, games, moderation); migration hygiene (committed, reversible);
   indexing/FK/cascade correctness; pgvector usage; **multi-tenant isolation** model; data
   retention. Are there still ad-hoc stores outside Prisma anywhere (re-scan all of `apps/` +
   `packages/`, not just `packages/database`)?
7. **Eventing & real-time.** Kafka/CDC (`cdc-relay`), `ws-gateway`, `realtime`, `sync-engine`,
   `webrtc`, `co-presence`: are these real (broker wiring, partitioning, backpressure, fan-out,
   SFU) or stubs? Is there one event contract or many?
8. **Identity/SSO architecture.** Is QuantMail truly the single OAuth2/OIDC issuer that every app
   trusts (PKCE S256, JWKS, refresh-token rotation, revocation), or do apps each fake their own
   auth? Map the actual token flow across 2-3 apps. Confirm the missing OAuth server models.
9. **Scalability & infra-as-code.** Dockerfiles per app, Helm charts, Terraform, CI/CD, staging,
   secrets management, autoscaling. What is real vs aspirational? Is there a credible path to
   "Google/Meta-scale" or are these single-instance toys?
10. **Build/CI health.** Turbo graph correctness, cache hits, the **real** test/coverage numbers,
    lint gates, `pnpm audit`. Reconcile against the "all green" claims (the doc-drift ledger).

Deliverable: an **architecture scorecard** (1—‘5) per dimension above + the **top 10
architectural debts** ranked by blast-radius, each with a concrete remediation.

## 8. DESIGN-SYSTEM & UI/UX ARCHITECTURE AUDIT

The founder wants every app to feel like one premium, AGI-level product. Audit the **design
system as a system**, not screen-by-screen:

1. **Token architecture.** `packages/brand`: are colors/typography/spacing/radius/elevation/motion
   real **design tokens** with light/dark + per-app theming, or hardcoded values scattered in
   components? Is `contrast.ts` enforcing **WCAG AA/AAA**? Is there a single source of truth
   consumed by `shared-ui`?
2. **Component library coverage.** `packages/shared-ui` (~201 files): inventory the components;
   identify gaps vs what the apps actually need (feeds, reels player, stories, swipe deck, video
   player, chat composer, call UI, editor timeline, data tables, command palette). Are components
   **accessible** (focus, ARIA, keyboard), **responsive**, and **mobile-first**?
3. **Cross-app consistency.** Do all apps consume `EcosystemShell` + `shared-ui` + `brand`, or do
   some roll bespoke UI? Score visual/interaction consistency across apps. Flag the outliers.
4. **The QuantAI "alien" avatar & sidekick.** Audit `contextual-sidekick` + `avatar-generator` +
   any avatar render layer: is there a **single animated assistant** (with motion states:
   idle/thinking/acting/speaking) embedded consistently across **all** apps as the vision
   requires, or is it chat-only / static / absent? Specify exactly what's needed to make it
   universal and "alive."
5. **Motion/animation system.** Is there a shared motion language (durations, easings, spring
   config) or ad-hoc animations? (Note: many `Math.random()` sites may be animation jitter —"
   separate those from data fakery.)
6. **Mobile.** `quant-mobile` + `packages/*/mobile` (contacts-sync etc.): is there a real mobile
   client/RN app or just stubs? The vision is phone-first for QuantChat/QuantAI —" assess.
7. **Information architecture & navigation.** Is there a coherent global nav / app-switcher /
   universal search (`command-palette`, `universal-timeline`)? `command-palette` is only ~6 files
   —" judge sufficiency.
8. **UX of the flagship flows.** Walk the actual UI (or code) for: QuantChat thread + in-chat
   games + AI auto-reply; QuantNeon reels/stories/map; QuantSync verified-gated posting + anonymous
   feed; QuantEdit timeline + automation builder; QuantAI assistant invocation; credit
   top-up/withdraw screens. Score each for completeness and polish.

Deliverable: a **design-system scorecard** + a prioritized list of design-system gaps blocking the
"one premium ecosystem" feel, with the **single highest-impact** UI investment called out.

## 9. PERCEPTION & AI-CONTROL-PLANE AUDIT (the "AGI-feel" core)

This is the heart of the vision: one QuantAI that perceives context and **controls apps, phone,
and laptop**. Audit it as a system, with evidence, answering each:

1. **Model gateway reality.** `packages/ai/core/model-router.ts` + OpenRouter: is multi-provider
   routing **real** (live API calls, streaming, fallback, retries, cost accounting) or simulated?
   Is the **user-facing model-switch** wired from UI → router → billing/credits everywhere
   automations run?
2. **Agent runtime.** `packages/agent-runtime` (execution-engine, intelligent-agent,
   approval-queue, audit-trail, conflict-resolver, cost-tracker): is this a **real long-horizon
   agentic loop** (planning, tool-calls, memory, retries, guardrails) or scaffolding that returns
   canned steps? Can it actually run the flagship "build an Uno game via QuantCode → PR → CI →
   deploy" loop end-to-end? Trace it.
3. **Tooling/MCP & connectors.** Are there **real MCP servers/clients** and connectors (GitHub,
   apps, OS), or interface-only stubs? Inventory the actual tool catalog the agent can call.
4. **Device control plane.** `agent-runtime/device/tier1-api`, `packages/device-control`
   (incl. Twilio SMS), `iot-control`, `robotics-bridge`, `wearables`: what device actions are
   **really** implemented vs declared? Phone control (Android/iOS accessibility, intents) and
   laptop control (shell/editor like Claude Code) —" real or aspirational? Be specific about the
   security model for granting an AI device control.
5. **Perception/multimodal.** Vision/audio/screen understanding: `universal-capture`,
   `generative-media`, `moderation/audio-transcriber`, voice (`voice-first-os`, `voice-input`,
   `voice-brain-dump`, `agentic/voice`): real models/providers or placeholders? Can QuantAI
   "watch a QuantTube video and skip to the useful part" (requires real transcript/segmentation)?
6. **Memory & RAG.** `packages/ai-memory`, `ml-pipeline/embedding-service`, vector store
   (Qdrant/pgvector): is there real embedding + retrieval + long-term user memory, or stubs?
7. **Cross-app control bus.** How does QuantAI actually invoke actions in QuantChat/QuantTube/
   QuantEdit/etc.? Is there a real **action/intent bus** (`cross-app-workflows`,
   `quant-orchestrator`, `cross-app-gaming`) every app subscribes to, or is "control" just UI deep
   links? This is the make-or-break of the whole vision —" audit it hardest.
8. **Safety/guardrails/cost.** Approval queues, audit trails, spend caps (`cost-tracker`),
   overage-toggle enforcement, prompt-injection defense, and content moderation on AI outputs:
   present and wired, or theatrical?

Deliverable: an **AI-control-plane maturity rating** (Stub → Demo → Partial → Production) per
sub-system above, plus the **critical path** to make "QuantAI controls everything" actually true,
with the riskiest unknown flagged.

## 10. ADDED OUTPUT SECTIONS (append to the §5 report)

12. **Architecture Scorecard + Top-10 Architectural Debts** (from §7).
13. **Design-System Scorecard + Gap List** (from §8), including the alien-avatar universality plan.
14. **AI-Control-Plane Maturity Matrix + Critical Path** (from §9).
15. **Fake-Data Forensics** —" triage of the ~469 `Math.random()` sites (data vs UI vs
    security-sensitive) and the ~95 `simulated` files, mapped to REAL/NAIVE/FAKE/STUB.
16. **Consolidation Plan** —" the package/app dedup kill-list with merge/delete/keep + estimated
    dead-LOC removed.

> Reminder: this remains an **audit-only** pass. Produce the truth and the plan; do not start
> refactoring. Anchor the roadmap on existing `.kiro/specs/*` where they already match §2.
