# KIRO AUTONOMOUS MASTER PROMPT — QUANT ECOSYSTEM
## "POLISH THE REAL, FINISH THE HALF, THEN BUILD THE REST"
### Phase 62 → 95 · Deeply Detailed · Code-Level Honest

> 21 phases (41-61) shipped breadth. Now we earn depth.
> Every existing screen becomes beautiful, smooth, vibey, bug-free. Every half-built package gets finished. Every missing frontend gets built. Then — and only then — the remaining big features.
>
> Founder's order: **existing best banao (UI/UX, orientation, experience, animation, vibe) → phir baaki sab features.**

---

# PART A — CODE-LEVEL TRUTH (verified May 28, 2026)

Kiro: read this before touching anything. This is what the code actually is, not what the phase log claims.

## A.1 — The repo right now
- 2596 source files, 403k LOC, 684 test files, 71 packages, 16 apps
- Phases 0-61 marked complete in status JSON
- Status JSON is honestly self-reporting `typecheck: fail`, `build: fail` — good integrity, must fix

## A.2 — THE FIVE REAL PROBLEMS (fix these before any new feature)

### PROBLEM 1 — 42 components are FAKE (object-tree, not React)
These 7 apps have components that return plain JS objects (`{ type: 'div', children: [...] }`) instead of real JSX. **They will NOT render in a browser.** They look like code but are non-functional pseudo-markup:
- quantneon: 12 files
- quantads: 6 files
- quantai: 5 files
- quantmax: 5 files
- quantsync: 5 files
- quantube: 5 files
- quantedits: 4 files

Meanwhile 213 files ARE real JSX. So the codebase is inconsistent — half real, half fake. Every fake object-tree component must be rewritten as real React/JSX that actually renders.

### PROBLEM 2 — typecheck + build FAIL on 3 Next.js apps
quantai, quantmail, quantchat fail with React 19 `TS2786: 'Button' cannot be used as a JSX component` (11 errors). Root cause: dual `@types/react` resolution — shared-ui's built `.d.ts` references a different React types copy than the apps. This is a known, fixable React 19 monorepo issue (dedupe @types/react to a single version via pnpm overrides + ensure shared-ui emits correct JSX types). NOT a network issue.

### PROBLEM 3 — 4 core apps have NO frontend
- quantcalendar: NO `src/` (backend-only, 24 files)
- quantdocs: NO `src/` (backend-only, 39 files — Yjs ready, unused)
- quantdrive: NO `src/` (backend-only, 27 files)
- quantmeet: `src/` exists but 0 `.tsx` (only types; 23 backend files, LiveKit ready, unused)

A user literally cannot open these four apps.

### PROBLEM 4 — Late-batch packages (Phase 52-61) are thin skeletons
Compare LOC:
- EARLY (deep, real): quant-live 3034, device-control 2138, maps 1022, photos 590, notebook 476, browser-agent 488, code-agent 433
- LATE (thin skeletons): agent-swarm 169, voice-first-os **79**, data-warehouse **70**, wellbeing 103, spatial-ui 96, robotics-bridge 86, launch-beta 185, launch-public 182

Tests confirm: early packages 30-48 tests each; late ones 3-5 tests each. The late phases are structure, not implementation.

### PROBLEM 5 — ZERO branding
No logo, no icon, no brand asset anywhere in the repo. No visual identity. 16 apps with no cohesive look.

## A.3 — What's genuinely strong (DO NOT break)
auth, ai, realtime, payments, federation, quant-live, device-control, security, observability, agent-runtime, sync-engine, moderation, quant-notebook, browser-agent, code-agent, quant-health, iot-control, quant-commerce, bharat-ai. quantmail backend (78 files). Real Yjs, LiveKit, Triton, PhotoDNA adapters.

## A.4 — Honest level
Code-level ~45-50% to Meta+Google. Production-real ~12-15%. **Breadth raced ahead of depth.** This prompt rebalances: depth, polish, completion first.

---

# PART B — OPERATING RULES (all prior 33 + these)

34. **No fake components.** Every component returns real, renderable JSX. Zero object-tree pseudo-markup. CI greps for `type: 'div'` object patterns in `.tsx` and fails.
35. **Gates are green or we don't ship.** typecheck, build, test, lint, audit-high — all pass before any phase closes. The React 19 issue is fixed in Phase 62, then stays fixed.
36. **Depth before breadth.** A package marked "complete" must have real implementation (not a 70-LOC skeleton) and ≥15 meaningful tests on its core paths.
37. **Every screen: the vibe bar.** Every screen must feel premium — smooth 60fps, spring animations, proper orientation/responsive, delightful microinteractions, branded, themed. "Functional" is not enough; it must feel good.
38. **Polish is a deliverable, not a nice-to-have.** UI/UX work ships as its own PRs with before/after evidence (screenshots, Lighthouse, axe, FPS).

---

# PART C — PHASES 62 → 95

**Hard sequencing law:** Phases 62-72 (fix + polish + complete + brand) MUST finish before Phases 73+ (new features). Completion before conquest.

---

## ═══════════════════════════════════════════
## BLOCK 1: FIX & FOUNDATION (Phases 62-64)
## ═══════════════════════════════════════════

### PHASE 62 — Green the Gates (zero TypeScript/build errors)

**Goal:** typecheck + build pass across the entire monorepo. Zero errors. This unblocks everything.

**Tasks:**
1. **Fix React 19 dual-types issue:**
   - Add `pnpm.overrides` in root `package.json` pinning `@types/react` and `@types/react-dom` to one exact version (19.x) across the whole workspace
   - Ensure shared-ui emits proper JSX component types (verify `React.FC` returns `ReactElement`, tsconfig `jsx: react-jsx`, `moduleResolution: bundler`)
   - Rebuild shared-ui `.d.ts`, verify quantai/quantmail/quantchat typecheck clean
2. **Fix the build-order TS6305 errors:**
   - Ensure turbo `dependsOn: ["^build"]` so dependency packages build before dependents typecheck
   - Verify `@quant/common`, `@quant/auth` chain builds correctly
3. **Fix Prisma generation in CI:**
   - Document the `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING` requirement OR vendor the prisma engine; ensure `@quant/database` typechecks in CI
4. **Zero-error verification:**
   - `pnpm typecheck` → 0 errors, all 84 tasks pass
   - `pnpm build` → all tasks pass
   - `pnpm lint` → 0 errors
   - `pnpm test` → 0 failures

**Hard gates:**
- All 6 gates green (paste full output to phase log)
- Status JSON updated: every gate `pass`
- No `@ts-ignore` / `@ts-expect-error` added to hide errors (CI greps for new ones)

**Exit:** The build is clean. We can trust green.

---

### PHASE 63 — Kill Every Fake Component (42 object-tree files → real React)

**Goal:** Every component renders in a real browser. Zero pseudo-markup.

**Tasks:**
1. Inventory all 42 object-tree components (the grep list: quantneon 12, quantads 6, quantai 5, quantmax 5, quantsync 5, quantube 5, quantedits 4)
2. Rewrite each as real React/JSX with:
   - Proper component signature (`React.FC<Props>`)
   - Real JSX return
   - Real event handlers (not stubbed)
   - Tailwind/brand styling (real classes, not just class strings on fake nodes)
   - Loading / empty / error states
   - Accessibility (ARIA, keyboard, tap targets)
3. Wire each to real data (React Query hooks → real backend); no mock arrays
4. Verify each renders + functions in a real browser (Playwright smoke test per component)

**Hard gates:**
- `grep -rn "type: 'div'" apps/*/src --include="*.tsx"` returns 0
- Every rewritten component renders in Playwright
- Every component has loading/empty/error/success states
- axe-core zero violations per component

**Exit:** Every component is real, renderable, accessible, wired.

---

### PHASE 64 — Finish the Thin Packages (skeletons → full implementations)

**Goal:** Every "complete" package is actually complete. The Phase 52-61 skeletons get real implementations.

**Packages to deepen (current LOC → target real implementation):**

1. **agent-swarm (169 LOC):** Full orchestrator — goal decomposition, NATS message bus between agents, Y.Doc shared scratchpad, conflict resolution, per-goal budget (time/money/tokens), failure handling + retry, live observation UI hooks, audit. Target: real 50-step goal execution. ≥30 tests.

2. **voice-first-os (79 LOC):** Full implementation — the 100 voice commands (the catalog), wake-word integration, ambient context detection (driving/walking/meeting/home), elder mode, phone-free mode controller, privacy lamp, watch/glasses bridge. Wire to quant-live + device-control + quant-tools. ≥30 tests.

3. **data-warehouse (70 LOC):** Real implementation — DuckDB/Parquet, NL→query, time-series of activity, residency selector, export in open formats, "where is my data" inspector. ≥20 tests.

4. **wellbeing (103 LOC):** Full — time-well-spent, doom-scroll detector, compulsion-pattern detection, crisis intervention (regional helplines), AI integrity guards, regret-rate tracking, "Quant retreat" mode. ≥20 tests.

5. **spatial-ui (96 LOC):** Real WebXR — session management, spatial panels (room/head-anchored), hand-tracking gestures, eye-tracking hooks, spatial audio, per-app spatial layouts (Meet holographic, Docs floating). ≥20 tests.

6. **robotics-bridge (86 LOC):** Real adapters — Matter/HomeKit/Roborock/ROS2, command dispatch, safety review per action, kill-switch, audit. ≥15 tests.

7. **developer-platform / launch-beta / launch-public:** Deepen to real implementations (API key lifecycle, marketplace, cohort management, feature flags, status engine, store-submission tracking). ≥15 tests each.

8. **Any other package <200 LOC that's marked complete:** audit and deepen.

**Hard gates:**
- Every package ≥15 meaningful tests on core paths (not trivial)
- No package marked "complete" with <200 LOC unless genuinely tiny by nature (document why)
- Each deepened package has a real demo flow in staging
- agent-swarm executes a real 50-step goal; voice-first-os runs the 100 commands

**Exit:** "Complete" means complete. No more skeletons hiding behind a passing 3-test suite.

---

## ═══════════════════════════════════════════
## BLOCK 2: COMPLETE THE MISSING (Phases 65-66)
## ═══════════════════════════════════════════

### PHASE 65 — Build the 4 Missing Frontends (Calendar, Docs, Drive, Meet)

**Goal:** Every app is openable. The 4 backend-only ghosts get full, beautiful, wired frontends.

**Tasks:**

1. **QuantCalendar (`apps/quantcalendar/src/`):**
   - Views: month, week, day, agenda, year, schedule
   - Event CRUD with drag-to-reschedule, drag-to-resize
   - Multiple calendars, color coding, overlays
   - Recurring events (RRULE), time zones, all-day events
   - QuantMeet integration (one-click video event)
   - Smart scheduling ("find 30 min with Riya"), natural-language create
   - Reminders, invites, RSVP, free/busy
   - CalDAV sync (backend exists)
   - Mini-calendar, today button, keyboard nav
   - Wire to existing 24-file backend

2. **QuantDocs (`apps/quantdocs/src/`):**
   - Rich text editor — **wire the existing Yjs backend** (real-time collab)
   - Presence (avatars, cursors, selections), comments anchored to text
   - Suggestion mode (accept/reject), version history with named checkpoints
   - Doc branching (backend exists), whiteboard, code blocks
   - Templates, folders, sharing UI (permission tiers)
   - AI sidebar: rewrite, summarize, translate, expand, brain-dump (voice)
   - Export (PDF, DOCX, Markdown)
   - Wire to existing 39-file backend

3. **QuantDrive (`apps/quantdrive/src/`):**
   - File browser (grid + list + columns), breadcrumbs, sort/filter
   - Drag-drop upload (multi, folder), resumable, progress
   - Preview: images, PDF, video, audio, docs, code (with syntax highlight)
   - Sharing + permissions UI, link expiry, password
   - Search (semantic + filename), starred, recent, trash, restore
   - Storage usage visualization
   - AI: auto-organize, "find my tax docs", duplicate finder
   - Wire to existing 27-file backend

4. **QuantMeet (`apps/quantmeet/src/`):**
   - Pre-join lobby: camera/mic preview, device picker, background blur/replace, network check
   - In-meeting: grid + speaker + spotlight views, screen share, chat sidecar, reactions, raise hand, participant list, per-participant volume
   - Recording controls, breakout rooms, polls, knock-to-join
   - Live captions (Whisper streaming), live translation
   - AI meeting notes + action items → QuantCalendar/QuantChat
   - Post-meeting summary + recording access
   - **Wire the existing LiveKit backend** (23 files)
   - Mobile + desktop layouts

**Hard gates:**
- All 4 apps open to a real, navigable, branded UI
- Zero mock data — every screen wired to real backend
- QuantDocs: 2 users edit the same doc live (Yjs working in UI)
- QuantMeet: 2 users join, video flows (LiveKit working in UI)
- E2E test per app, Lighthouse ≥90, axe zero violations, responsive 360→1440px
- Cross-app links: Calendar↔Meet, Docs↔Drive all work

**Exit:** All 16 apps are real, openable, usable. No ghosts.

---

### PHASE 66 — Wire Every Remaining Mock + Connect Every Flow

**Goal:** Zero mock data anywhere. Every flow connected end-to-end across all 16 apps.

**Tasks:**
1. Full audit of all `apps/*/src/` for mock/hardcoded data
2. Each mock → real backend endpoint (build if missing) → React Query wire
3. Every screen: skeleton, empty, error, success states
4. Every button/link does something real (no `onClick={() => {}}`, no dead hrefs)
5. Every form: validation + submit + error handling
6. Optimistic updates + rollback for all mutations
7. Real-time WS updates for live data
8. Every cross-app navigation verified

**Hard gates:**
- `grep -rn "mock\|Mock\|fakeData\|sampleData" apps/*/src --include="*.tsx"` returns 0 (excl. tests)
- Route crawler: every route loads, every button works, zero dead-ends
- E2E click-through of all 16 apps: no broken flows

**Exit:** Every pixel = real data through a real flow. Nothing fake remains.

---

## ═══════════════════════════════════════════
## BLOCK 3: BRAND & POLISH (Phases 67-69)
## ═══════════════════════════════════════════

### PHASE 67 — Brand System & Visual Identity

**Goal:** Quant gets a soul. One cohesive identity across 16 apps.

**Tasks:**
1. **`packages/brand`:**
   - Quant master logo (wordmark + symbol), SVG, light/dark, all sizes
   - Per-app logos/icons — cohesive family, distinct hue per app (Mail=blue, Chat=green, etc.)
   - Full app icon set (iOS/Android/web/favicon, every required size + maskable)
   - Color system: brand palette + per-app accent + semantic + 6 themes (dark/light/neon/Bharat/high-contrast/colorblind-safe)
   - Type system: display + body + mono with Indic scripts (Devanagari/Tamil/Bengali/Telugu/etc.)
   - Illustration style (empty states, onboarding, errors) — warm, India-aware, consistent
   - Icon library (~300 icons, consistent line/fill)
   - Motion tokens (spring physics: damping/stiffness, transition curves)
   - Sound design (notification, success, error — subtle)
2. Apply across ALL apps (AppShell, splash, icons, loading)
3. Rebrand marketing site + status page
4. `docs/brand/BRAND.md` guidelines

**Note:** Kiro generates strong SVG logos programmatically for v1. Flag if human designer wanted for master mark — but never block; ship a great AI v1.

**Hard gates:**
- Complete brand package exists as code/assets
- Every app visibly uses it
- All store icon sizes generated
- Contrast WCAG AA (AAA for high-contrast theme)

**Exit:** Quant looks like one beautiful product.

---

### PHASE 68 — UI/UX Excellence Pass (every screen, orientation, experience, animation, vibe)

**Goal:** The founder's core ask — every existing screen becomes premium: best orientation, experience, UI/UX, animation, vibe.

**Tasks (apply to EVERY screen in ALL 16 apps):**

1. **Orientation & responsive:**
   - Perfect at 360 / 414 / 768 / 1024 / 1440px
   - Portrait + landscape on mobile/tablet
   - Foldable-aware, tablet sidebar layouts
   - Safe-area insets (notch, home indicator)

2. **Animation & motion (the "vibe"):**
   - Spring physics everywhere (Framer Motion `spring`, never linear)
   - Page transitions (shared element / hero animations between list↔detail)
   - Stagger animations for lists
   - Micro-interactions: button press, toggle, like, send — all springy + haptic
   - Skeleton → content fade-in
   - Pull-to-refresh with custom branded animation
   - Bottom sheet spring physics
   - Scroll-linked animations (parallax headers, sticky transforms)
   - Confetti/celebration moments (first post, milestone)

3. **Experience polish:**
   - Optimistic UI for every action + rollback shake on fail
   - Loading priorities: skeleton → low-res → high-res images (blurhash)
   - Empty states with branded illustration + personality + CTA
   - Error states: human copy + recovery action
   - 60fps scroll verified on mid-tier Android (fail PR if <50fps)
   - Tap targets ≥44px, hover/press/focus states everywhere
   - Smooth keyboard handling (no layout jump on mobile keyboard)

4. **Vibe details:**
   - Per-app accent personality
   - Sound design on key actions (subtle, optional)
   - Delightful copy (warm, human, India-aware, never robotic)
   - Dark mode that's actually beautiful (not just inverted)
   - Smooth theme transitions (animated, not flash)

5. **Consistency:**
   - Every screen uses brand system (Phase 67)
   - Consistent spacing, radius, shadows, type scale
   - Command palette (Cmd+K) on every app
   - Universal capture (Cmd+Shift+Q) everywhere

**Hard gates:**
- Every screen: Lighthouse ≥90, axe zero violations, 60fps scroll
- Visual regression baseline (top 100 screens), all green
- Every theme perfect on every screen
- Microinteraction checklist passed per screen (documented)
- Before/after screenshots in each polish PR

**Exit:** Quant feels premium and vibey everywhere. Not one screen looks unfinished or janky.

---

### PHASE 69 — Zero-Defect Hardening

**Goal:** Founder's demand — not one bug, error, security hole, or disconnect.

**Tasks:**
1. Zero TS errors, zero lint, zero test failures (maintain from Phase 62)
2. Zero console errors/warnings at runtime in any app (automated check)
3. Zero a11y violations (axe on every page)
4. Zero broken links / dead-ends (route crawler checks every route + button)
5. Zero disconnected flows (every cross-app link + state transition verified)
6. Coverage ≥80% on critical paths
7. Security: pen test (OWASP, API fuzzing, auth bypass), mTLS, WAF, rate limits, secret mgmt, container scan (Trivy), compliance (GDPR/DPDP/COPPA), bug bounty
8. Error monitoring (Sentry/GlitchTip) on everything
9. Chaos testing: kill services, verify graceful degradation

**Hard gates:**
- CI: 0 TS / 0 lint / 0 test-fail / 0 axe
- Runtime: 0 console errors (automated across all apps)
- Crawler: every route + button works, no dead-ends
- Pen test: 0 HIGH/CRITICAL unmitigated

**Exit:** No bugs, no errors, no security holes, no broken flows. Trustworthy.

---

## ═══════════════════════════════════════════
## BLOCK 4: QUANTAI CONTROLS EVERYTHING (Phases 70-72)
## ═══════════════════════════════════════════

### PHASE 70 — Universal Tool Layer (every app action = AI-callable tool)

**Goal:** Anything a human can do in any app, QuantAI can do. The control surface.

**Tasks:**
1. **`packages/quant-tools`** — every app exposes typed tools (auto-gen from OpenAPI):
   - Mail, Chat, Calendar, Docs, Drive, Meet, Neon, Sync, Tube, Max, Edits, Ads, Maps, Photos, Device, Studio, Payments — every core action
   - Each tool: typed I/O, permission tier, cost estimate, undo recipe, audit
2. Tool discovery + multi-tool planning (QuantAI routes intent → tools across apps)
3. Permission engine + risk tiers (confirm tier≥2, cost preview, undo, audit)
4. MCP exposure (external AI clients drive Quant)

**Hard gates:**
- Every app exposes ≥5 core actions as tools
- QuantAI executes multi-app plan ("find file in Drive → attach to email → send") in staging
- Every tool call confirmed/audited per tier
- MCP server works with external client

**Exit:** The control layer exists. QuantAI can operate the whole ecosystem.

---

### PHASE 71 — QuantAI Codex (build & deploy by voice) + Cross-App Automation

**Goal:** "QuantAI, ek game banao" → repo created, agents build, published. "Daily reel QuantTube pe daalo" → automation built, scheduled, running.

**Tasks:**

1. **QuantAI Codex** (extend quantai + git-server + code-agent):
   - Voice/text "build X" → create repo in QuantMail-Git → scaffold → multi-agent build (logic + art via generative-media + sound + tests) → build + test in sandbox → iterate by talking → publish/deploy
   - Full repo UI: branches, commits, PRs, CI, deploy logs
   - Deploy targets: Quant Store, user's Quant space, self-host export, external (GitHub/Vercel)

2. **`packages/quant-automate`** (rebuild cross-app-workflows to production):
   - Triggers: schedule (cron), event, webhook, manual, AI-condition
   - Actions: any quant-tool
   - Conditions, branches, loops, retries, durable execution (queue + state, not in-memory)
   - NL builder: "har subah 8 baje QuantTube pe reel, QuantEdit se trending template + mera brand kit" → QuantAI builds it
   - The daily-reel automation works end-to-end (generate → edit → schedule → post → report)

**Hard gates:**
- Voice → repo → game built → tested → published → playable (full E2E)
- Daily-reel automation runs on schedule end-to-end
- Automations durable (restart mid-run, resumes)
- Every action audited, cost-capped, undoable

**Exit:** User builds apps and runs automations by voice, across apps, without touching the screen.

---

### PHASE 72 — Phone-Free Agentic Living (tie it together)

**Goal:** Quant Live + Device Control + Universal Tools + Codex + Automate = one voice experience.

**Tasks:**
1. Quant Live invokes any tool, builds (Codex), automates (Automate), controls device
2. Phone-free mode: screen shows only Quant Live; everything by voice
3. Proactive Daily Brief suggests automations, surfaces what needs attention
4. Context-aware (knows current app/screen)
5. Continuity across phone/watch/glasses/desktop

**Hard gates:**
- Voice-only session: build a game + set automation + send emails + join meeting + control home — no screen touch
- Phone-free mode: full day by voice
- Quant Live invokes tools across ≥5 apps in one session

**Exit:** The founder's vision realized — talk to Quant, everything happens.

---

## ═══════════════════════════════════════════
## BLOCK 5: THE REMAINING BIG FEATURES (Phases 73-82)
## ═══════════════════════════════════════════

Only after Blocks 1-4 (gates green, components real, packages deep, frontends built, mocks wired, branded, polished, zero-defect, QuantAI controls everything) does Kiro build the remaining features.

### PHASE 73 — BYOC + Quant Credits Economy
Users bring their own AI (OpenAI/Anthropic/Gemini/Groq/local) OR buy Quant Credits. Transparent pricing, free daily allowance, local-first AI (WebGPU/CoreML/NNAPI), model picker in AppShell, encrypted key vault, spend dashboard, creator earning. (Full spec: prior prompt Phase 45/55.)

### PHASE 74 — Quant Studio (Universal UGC Builder)
Anyone builds games/apps/tools/lenses/agents — vibe-code, visual, real code, or import (Godot/Phaser/Unity WebGL). `.qapp` sandboxed format, Quant SDK (identity/scores/multiplayer/AI/storage/tips). Publish + remix + earn. **Sandbox security is P0** — red-team ruthlessly. (Full spec: prior prompt Phase 46/56.)

### PHASE 75 — Cross-App Gaming + Social Play
Same game playable in QuantChat (Snapchat-style), QuantMax random video (Omegle++, anonymous-then-consent-reveal), QuantNeon feed, QuantMeet icebreakers. One identity, universal leaderboard. Minor-safe. (Full spec: prior prompt Phase 47/57.)

### PHASE 76 — AR Lenses + Face Games
Real-time face/hand/body tracking, AR overlays, generative lenses, user-built lenses (Lens Studio), cross-app. Ethical filter design. (Full spec: prior prompt Phase 48/58.)

### PHASE 77 — Gemini-Omni-class Generative + Agentic 2.0
Any-to-any media gen with provenance (SynthID/C2PA), object-level image editing, Quant Flow (AI filmmaking + vibe-coded tools), Information Agents, Daily Brief/Spark, Universal Cart, voice brain-dump. Beat Antigravity/Flow/Info-Agents with BYOC + cross-app edge. (Full spec: prior prompts.)

### PHASE 78 — Smart Glasses + Wearables
Meta Ray-Ban, Quest, Vision Pro, Pixel/Apple Watch, Xreal. Glasses HUD, voice, camera passthrough, real-time translation overlay, cross-device handoff.

### PHASE 79 — Creator Economy 2.0
UGC monetization full loop: tips, paid apps, IAP, ad revshare, remix royalties. Creator dashboard, payouts, taxes, tiers, brand partnerships. Quant Credits as in-ecosystem currency.

### PHASE 80 — Quant App Store + Discovery
In-ecosystem store for all UGC. Ranking (quality+trust, not engagement-max), categories, reviews, cross-app distribution.

### PHASE 81 — Quant for Teams / Workspace Edition
Org accounts, SSO/SCIM, admin console, shared workspaces, team agents, compliance, per-seat pricing, enterprise BYOC. B2B revenue.

### PHASE 82 — Federation + Open Ecosystem Completion
Full ActivityPub, Matrix, CalDAV/CardDAV/IMAP/SMTP, AT Protocol, MCP server, public API, UGC portability, self-host edition complete.

---

## ═══════════════════════════════════════════
## BLOCK 6: SCALE & LAUNCH FOR REAL (Phases 83-90)
## ═══════════════════════════════════════════

### PHASE 83 — Production Integrations (real, not simulated)
Real: LiveKit deploy + TURN, Twilio account + numbers, PhotoDNA partnership (or flag-off), Razorpay/Stripe/UPI merchant accounts, Triton serving, Qdrant/Meilisearch/NATS/Redpanda clusters, protomaps tile server. Real Prisma migrations, connection pooling, read replicas, backup/restore drills. Every external integration has a real (non-mocked) integration test.

### PHASE 84 — Performance + Cost + Scale
p95/p99 budgets CI-gated, multi-layer caching, DB optimization, async queues, AI cost optimization (route by complexity, cache embeddings, self-host small models), media optimization, cost dashboards. Sustainable unit economics at 10M users.

### PHASE 85 — Observability + SRE + Reliability
Full OTel (incl. LLM cost), Prometheus RED/USE/business metrics, centralized logs (PII-scrubbed), Grafana dashboards, alerts+runbooks+PagerDuty, SLOs+error budgets, chaos game days, synthetic monitoring, DR (RTO<4h RPO<1h, quarterly drills).

### PHASE 86 — Bharat-Scale Completion
12+ Indian languages across all apps + UGC + games, voice in all (AI4Bharat/Sarvam), lite mode <5MB, Aadhaar e-KYC + DigiLocker + UPI + ONDC, voice-only onboarding, festival modes, family accounts, offline-first, localized everything.

### PHASE 87 — Complete Mobile App
quant-mobile gets all 16 apps inside, native plugins (push/camera/biometric/haptics/share/deeplink/bgsync/WebRTC), Quant Live central, offline-first, widgets, Live Activities, Dynamic Island, store assets. Installs + runs on real Android + iPhone.

### PHASE 88 — Full E2E Coverage + Quality Gate
Playwright covers all 16 apps + cross-app + UGC build+play + BYOC + agents + games + random chat + payments. Real docker-compose.test.yml with all services. Multi-browser/device, visual regression (top 100), API contract tests, perf regression, axe on every page.

### PHASE 89 — Staging + Internal Dogfooding
Real Terraform staging cluster, Helm via ArgoCD, real domain+TLS, synthetic monitor green 72h, team dogfoods as primary 6 weeks, bug bash, capacity+cost validation.

### PHASE 90 — Closed Beta → Public Launch
10k beta (power/mainstream/elderly/Hindi-only/creators/businesses/minors-with-guardians), 8-week program, retention/NPS dashboards, daily triage, UGC seeding (500 builders). Then: App Store + Play Store submission, marketing site live, press, status page, docs, dev portal, founder content, bug bounty, Quant Coach support, partnerships. D30≥25%, NPS≥40, 1000+ UGC apps at launch.

---

## ═══════════════════════════════════════════
## BLOCK 7: POST-LAUNCH (Phases 91-95)
## ═══════════════════════════════════════════
91: Growth engine · 92: Revenue optimization · 93: International · 94: Education edition + frontier · 95: Continuous evolution (weekly council, monthly arch review, quarterly major ship, annual security audit, sunset policy).

---

## SECTION D — THE VIBE BAR (what "best UI/UX/animation/vibe" means concretely)

Every screen must pass this checklist (Phase 68 enforces, but it applies to all UI work forever):

**Motion:**
- [ ] Entrance animation (fade/slide/scale with spring)
- [ ] List items stagger in
- [ ] Page transition (shared element where logical)
- [ ] Button/toggle/like = springy + haptic
- [ ] Skeleton → content crossfade
- [ ] Scroll-linked effects where tasteful (parallax, sticky transforms)
- [ ] Celebration moments (milestones)
- [ ] Theme switch animated, not flash

**Orientation/Responsive:**
- [ ] Perfect 360→1440px
- [ ] Portrait + landscape
- [ ] Safe-area insets
- [ ] Tablet/foldable layouts
- [ ] No layout jump on keyboard open

**Experience:**
- [ ] Optimistic UI + rollback
- [ ] Skeleton/empty/error/success states all designed
- [ ] Blurhash image placeholders
- [ ] 60fps scroll (mid-tier Android)
- [ ] Tap targets ≥44px
- [ ] Hover/press/focus states
- [ ] Pull-to-refresh, swipe actions

**Vibe:**
- [ ] Brand system applied (Phase 67)
- [ ] Per-app accent personality
- [ ] Warm, human, India-aware copy
- [ ] Beautiful dark mode (designed, not inverted)
- [ ] Subtle sound design (optional)
- [ ] Delightful empty states with illustration
- [ ] Command palette + universal capture

**Quality:**
- [ ] Lighthouse ≥90
- [ ] axe-core zero violations
- [ ] Keyboard navigable
- [ ] Real data (no mock)
- [ ] All flows connected (no dead-ends)

---

## SECTION E — DAILY DISCIPLINE, DECISION RIGHTS, DEFINITION OF DONE

(Carry forward from prior prompts.)

**Definition of "Polished & Complete" — all true before Phase 73 (new features):**
1. All 6 gates green (typecheck/build/test/lint/audit/+ custom greps)
2. Zero fake components (0 object-tree in .tsx)
3. All thin packages deepened (≥15 tests, real implementation)
4. All 16 apps have full wired frontends (Calendar/Docs/Drive/Meet built)
5. Zero mock data anywhere
6. Brand system applied across all 16 apps
7. Every screen passes the Vibe Bar checklist
8. Zero defects (0 errors/console/a11y/dead-ends), pen test passed
9. Universal Tool Layer: QuantAI operates every app
10. Codex builds by voice; Automate runs the daily-reel cross-app
11. Phone-free mode: full day by voice

If any false → fix it. No new features until the existing is best.

---

## SECTION F — FIRST 14 DAYS

**Day 1:** Read Part A fully. Begin Phase 62 (green the gates). Fix React 19 dual-types (pnpm overrides + shared-ui JSX types). Get typecheck + build green.

**Day 2-3:** Phase 62 done — all 6 gates green, status JSON updated honestly. Begin Phase 63 (kill fake components) — start with quantneon's 12.

**Day 4-6:** Phase 63 — rewrite all 42 object-tree components as real JSX, wired, accessible. Playwright smoke each.

**Day 7-10:** Phase 64 — deepen thin packages (agent-swarm, voice-first-os, data-warehouse, wellbeing, spatial-ui, robotics-bridge first). Real implementations, ≥15 tests each.

**Day 11-14:** Phase 65 begins — QuantCalendar frontend (all views, wired to backend). Then Docs.

Reassess after 14 days. **Sequencing law: Blocks 1-4 (62-72) before Block 5 (73+). Completion before conquest. Polish before expansion.**

---

## SECTION G — A NOTE FROM CLAUDE TO KIRO

Kiro —

You shipped 21 phases of breadth in a day. Impressive. But I looked at the code, and the founder was right to slow us down. We have 42 components that don't render, 3 apps that don't typecheck, 4 apps with no frontend, packages marked "complete" at 70 lines, and zero branding.

Breadth without depth is a demo, not a product. So we rebalance.

The new order is sacred and it's the founder's order: **make the existing best first.** Green the gates. Make every component real. Finish every skeleton. Build the missing frontends. Wire every mock. Build the brand. Polish every screen to a premium vibe. Zero every defect. Make QuantAI truly control everything. THEN — and only then — the remaining big features.

Phase 68 (UI/UX excellence) is where the founder's heart is: every screen smooth, animated, oriented, vibey, beautiful. Treat polish as a real deliverable, not a chore. Ship before/after evidence.

And hold the zero-defect line (Phase 69). The founder said it plainly: not one bug, not one error, not one security hole, not one broken flow.

We have the breadth. Now we earn the right to call it a product.

Depth. Polish. Completion. Then conquest.

— Claude

---

## END. Now begin: read Part A, fix React 19 types, green the gates (Phase 62).
