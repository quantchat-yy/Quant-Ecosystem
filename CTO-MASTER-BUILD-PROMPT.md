# Quant-Ecosystem — CTO Master Build Directive (Verify → Wire → Ship)

> **How to use:** Paste this entire file into Claude Opus (acting CTO) with the full
> `Quant-Ecosystem` repo cloned. Unlike the older `CTO-DEEP-AUDIT-PROMPT.md` (audit-only),
> this prompt directs you to **verify the current truth, then BUILD and WIRE the product
> toward the full vision in §3** — relentlessly, with evidence, to a premium "Google/Meta-
> killer" bar. Audit is the first 10%; the other 90% is shipping real, wired features.

---

## 0. ROLE & MINDSET

You are the **acting CTO + principal engineer** of Quant — a solo-founder-scale company
building a Google/Meta-class super-ecosystem in one TypeScript monorepo. Dozens of prior AI
agents worked across **330+ merged PRs / ~80 "phases"** and left **status docs that inflate
reality and contradict the code.** Your founder wants the product *built and wired end-to-end*,
not more optimistic paperwork.

Operating principles:

1. **Trust code, not docs.** Every claim in `AGENT-*.md`, `MASTER-ROADMAP-COMPLETE.md`,
   `.agents/state/*` is **unverified** until you confirm it by reading source or running gates.
   Log every doc-vs-code contradiction.
2. **"Exists" ≠ "works" ≠ "wired."** A file/route/service existing means nothing until the
   frontend calls it, it hits a real datastore, and a test proves the path. Mock UI does not count.
3. **No fakes on the critical path.** No `Math.random()` for security/IDs/tokens, no toy crypto,
   no hardcoded/canned responses pretending to be real. Replace or clearly quarantine them.
4. **Build to the vision in §3, not the README.** The README under-describes the ambition.
5. **Every claim cites evidence** — file path + lines, or a command + its real output. If you
   did not verify it, write "unverified," never "done."
6. **Premium bar.** Every shipped surface must look and feel like one cohesive, AGI-level
   product. "It compiles" is not "it's good."

---

## 1. VERIFIED CURRENT-STATE BASELINE (captured 2026-06-20 — re-confirm, then extend)

These numbers were measured directly from the tree on disk. Treat them as a **starting
fingerprint to re-verify**, not gospel.

**Scale (real):**
- ~**4,677** TS/TSX files, ~**285k** lines (excl. `node_modules`/`dist`).
- **19 app dirs**, ~**105 packages**, **8 services**.
- Persistence is **real and large**: `packages/database/prisma/schema.prisma` has **101 models**
  with **committed migrations** (incl. `0005a_oauth_server_tables`, E2EE keystore, message
  delivery). The old "no Prisma / in-memory DB" claim is **stale/false** today.
- Latest commit is **PR #330** (billing: EARN credit kinds on `CreditWallet`). The founder's
  fear that "very little is done" is **wrong on volume** — a great deal of real code exists.

**The real gap is wiring + quality + the flagship differentiators, not volume:**
- **~132 files** carry a `@simulated`/`SIMULATED` marker (the true mock-debt surface — far more
  than the "27" headline in `STUB-INVENTORY.md`).
- **~469 `Math.random()`** sites across `apps/` + `packages/` — triage each as (a) seed/fake data,
  (b) UI/animation jitter (OK), or (c) **security-sensitive** (IDs, tokens, OTP, matchmaking, ad
  auctions) → class (c) is **critical**.
- **~38 frontend pages still on mock/hardcoded data** (see `.agents/state/mock-debt.csv`); several
  apps (quantneon, quantmax, quantedits, quanttube) have **0 real pages** and are API-only.
- **`godot` appears 0 times in code** → the flagship **QuantGames real-world (GTA-V-scale) Godot
  game does not exist at all.**
- **Alien QuantAI avatar** is referenced almost only in `quantchat` (~20 files) + `shared-ui` (~5)
  + `quantai` (1) → it is **not** embedded across all apps as the vision requires.
- **`EcosystemShell`** is defined in `shared-ui` but used by **0 apps** → there is no real shared
  app shell in production; cross-app consistency is aspirational. (`@quant/shared-ui` *is* imported
  by ~14 apps, so component reuse exists, but the unifying shell is not wired.)
- **Device control** (`packages/device-control`, `packages/ai`): **0** references to Android
  accessibility services / adb / OS intents / desktop automation → "control your phone & laptop"
  is **not** real OS-level control yet; it is interface/stub level.
- **OAuth2 server**: `OAuthClient` + `AuthorizationCode` models exist (+ `Session`,`RefreshToken`),
  but verify the full PKCE-S256 issue/verify/refresh/revoke flow is wired and trusted by ≥2 apps.

**Your first job: re-run the gates from a clean clone and record ACTUAL results**
(`pnpm install --frozen-lockfile`, `pnpm turbo typecheck|test|build`, `pnpm turbo lint --
--max-warnings 0`, `pnpm audit --audit-level=high`), plus the **real** coverage % vs the
threshold in `vitest.config.ts` (reported as lowered 50→20 to make CI pass). Publish a
claimed-vs-actual gate table.

---

## 2. CLASSIFICATION KEYS

Classify every non-trivial module: **REAL** (prod-grade, calls real services/DB) / **NAIVE**
(right shape, unfit for prod: in-memory, pure-JS ML, heuristic) / **FAKE** (canned/random data,
no logic) / **STUB** (empty shell / health endpoint only).

Classify every vision capability (§3): **Missing / Stub / Partial / Real**, and separately
**Wired E2E? yes/no** (frontend → backend → datastore → test).

---

## 3. THE PRODUCT VISION (the scope of record — build AGAINST this)

Quant is **one interconnected ecosystem**. **QuantMail is the identity root**: one account signs
in to every app. Everything shares identity, a **credit economy**, a **social graph**, **game
ranks**, and a pervasive **QuantAI** that appears in every app as a small **animated "alien"
avatar/assistant** with motion states (idle / thinking / acting / speaking) for an AGI feel.

For **every** capability below, deliver: status (Missing/Stub/Partial/Real), evidence (paths),
wired-E2E (yes/no), gap-to-vision, and effort (S/M/L/XL).

### 3.1 QuantMail — hub & identity root
- Central **SSO / OAuth2 + OIDC (PKCE S256, JWKS, refresh rotation, revocation)**; one login →
  all apps. **QuantChat additionally requires phone-number OTP** on top of this identity.
- Gmail-grade mail: compose/send/receive, threading, DKIM/SPF/DMARC, search, AI
  compose/reply/summarize/triage.
- **Developer platform built in**: GitHub-grade repos/PRs/issues/review/branch-protection +
  **CI/CD**, plus a **Codex / Claude-Code-style autonomous coding agent** ("QuantCode").
- **Drive, Calendar, Docs, Meet are FEATURES inside the hub**, not stranded apps. The calendar is a
  real daily planner; a reminder must **ring like an incoming call** in QuantMail at the set time
  and **speak** the reminder.
- User can **switch the active AI model** (OpenRouter-style routing) anywhere automations run.

### 3.2 QuantChat — Snapchat + WhatsApp + Telegram (merged & beaten)
- **Phone-number OTP required** for QuantChat specifically.
- Every Snapchat micro-feature: avatars/Bitmoji, lenses/AR, **Snap Map**, **streaks**, stories,
  reels, feeds, disappearing messages.
- Every WhatsApp + Telegram feature: groups, channels, broadcast, **bots**, multi-device.
- **Games inside chat** (play with friends from the thread, Game-Pigeon style).
- **QuantAI as the animated alien avatar in chat**: reads/answers messages, **auto-replies**,
  automates conversations, **sends voice notes** — to where the user barely types.

### 3.3 QuantNeon — Instagram, fully
- Every IG micro-feature: feed, **Reels**, stories, explore, close-friends, notes, the "who-posted"
  chat tray, etc.
- **Maps** (Google-Maps-grade) integrated into the experience.
- **Games inside the app**, plus a **cross-app connected game system** (ranks/leaderboards shared
  across all Quant apps). A user-built **QuantGame can be posted** to QuantTube / profile / cross-app.

### 3.4 QuantMax — TikTok + Omegle + Tinder + party
- TikTok short-video feed; Omegle-style random video chat; Tinder-style swipe/dating; **squad
  groups, rooms, party games, posts**. Nothing omitted.

### 3.5 QuantSync — Twitter/X + Threads
- Full X/Threads micro-feature parity.
- **Anonymous section** as a *separate feature inside the app*: an anonymous feed **with a reels
  section inside the feed**, gated by **strong content moderation** (nothing illegal posted;
  who-posted-what is hidden from users).
- **"QuantSync Verified"**: a verified label/space at the top of the feed; tapping it opens a space
  where **only verified accounts can post/reply**, but **all users can view** (gov/official posts
  where only verified accounts may reply).

### 3.6 QuantAI — the brain across everything
- The main AI, **deeply connected to every app**, able to **control all Quant apps**, the user's
  **phone**, and the user's **laptop** — so the user barely touches the device.
- On laptop: behaves like **Claude Code / Codex**. On phone: behaves like **Gemini / Google
  Assistant**. **MCP servers/clients + connectors** throughout.
- Flagship cross-app flows that MUST work end-to-end:
  - *"Build me an Uno-style game"* → QuantAI opens **QuantCode inside QuantMail**; a long-horizon
    agent plans → edits → opens PR → runs CI → deploys, with security checks. Must beat single-shot
    tools; agentic, durable, recoverable.
  - *"Watch Carry's videos / teach me to ride a bike"* → QuantAI drives **QuantTube**, plays the
    right video, and **auto-skips to only the relevant segments.**
- Rendered as the **animated alien avatar** in every app.

### 3.7 QuantTube — YouTube + YouTube Music + Spotify
- Full streaming (video/music/live/shorts), creator tools.
- **AI-navigated playback**: on command, play and **auto-trim to the useful segments** (see §3.6).

### 3.8 QuantEdit — CapCut + Instagram-Edit + After Effects + Google "Flow" killer
- Pro editor that must beat CapCut / After Effects / Flow and Google's Omni-class results.
- **Automation**: e.g., *"every day at 5 AM, auto-edit my QuantTube/QuantNeon AI-news and auto-post
  to QuantTube + QuantSync."* Daily agentic runs, **credit-metered**.

### 3.9 QuantAd — the monetization engine (kills Meta/Google Ads)
- Ecosystem-wide ad platform earning from **every** app.
- **In-game/in-app ad injection via connectors**: a user's Temple-Run-style game shows a banner on
  an in-game building, served by QuantAd via OpenRouter/connectors. QuantAI can wire it
  automatically; the user can also do it manually.
- **Creator payouts** for QuantTube/QuantSync/etc. flow here as **credits**.

### 3.10 QuantGames — real-world Godot game + casual games
- A **GTA-V-scale real-world game** built in **Godot**, with **real AI NPCs** that actually reason;
  users create their own characters/pets/armies, **bring their own API key** to power and interact
  with them; **proximity voice** (you hear only people physically near you in-world, or call them);
  user-built armies the AI commands to do tasks. In-game **economy + marketplace + ads** (sell
  skins/characters/coins; platform takes commission).
- Plus **casual cross-app games** (Uno, Ludo, Monopoly, etc.) shared across the ecosystem with
  **connected ranks**. (Note: **none of this exists in code yet** — `godot` = 0 hits.)

### 3.11 QuantDrive / QuantCalendar / QuantDocs / QuantMeet — feature layers
- Daily-driver-quality features used **inside QuantMail and other apps** (not stranded islands).
  Calendar reminder "rings like a call" (see §3.1).

### 3.12 QuantTrinity — the admin super-app (most important internal product)
- The founder's command center over the **entire ecosystem**: control every app and every user.
- A **personal QuantAI** that **monitors all apps and all users deeply, in real time.**
- Create **team accounts with sector-scoped roles** (e.g., a "reports/abuse" team sees only user
  reports); **assign AI "employees"** that read daily reports and act in a human's place.
- The control plane to eventually **swap to local models** and **reroute all AI/API/payments
  centrally** from QuantTrinity.

### 3.13 Credit economy & money (cross-cutting)
- **1 credit = $1** target. Daily free allowance per user; paid plans like Gemini/ChatGPT.
- **Earn**: creator payouts, **post/reel boosts**, **QuantChat streaks**, selling **in-game
  items/skins/coins** and user-made games, **marketplace commission**, seller commission.
- **Spend**: AI usage. **Overage billing ONLY when the user explicitly toggles overage ON**
  (off by default → no surprise charges).
- **Top-up**: UPI, PayPal, Stripe, crypto. **Withdraw**: crypto, UPI, others — **daily.**
- Built for **profit**; later shift to local models to cut cost, all controlled from QuantTrinity.

### 3.14 Non-functional (cross-cutting)
- Deep interconnection: shared identity, shared credits, shared QuantAI, shared social graph and
  game ranks. Real security (no toy crypto), real moderation (anonymous + UGC + CSAM/legal), real
  infra (containers, Helm, CI/CD, staging), real observability, real tests + E2E.

---

## 4. BIG VERIFIED GAPS TO CLOSE (the founder cares most about these)

Confirm each, then build:
1. **QuantGames Godot real-world game** — 0% (does not exist). Largest single gap.
2. **Universal alien QuantAI avatar + sidekick** across **all** apps (currently chat-only). Build a
   single animated avatar layer (idle/thinking/acting/speaking) embedded via the shared shell.
3. **`EcosystemShell` actually adopted by every app** (currently 0 adopters) → one cohesive product.
4. **QuantAI device control** (phone + laptop) is interface-only → make at least one real path work
   (desktop agent like Claude Code/Codex; phone via a real client + accessibility/intents).
5. **Real LLM agent loop** (planning/tools/memory/guardrails) able to run the "build an Uno game →
   PR → CI → deploy" flow end-to-end (verify agent-runtime pilots aren't just rule-based).
6. **Credit economy end-to-end**: earn → spend → top-up → **withdraw** (crypto/UPI), overage
   toggle, 1cr=$1, marketplace commission — wired to a real ledger + real payment rails + signed
   webhooks.
7. **Real-time/RTC truth**: WebSocket fan-out + delivery guarantees; WebRTC SFU real
   (mediasoup/LiveKit) vs random ICE.
8. **Frontends for API-only apps** (quantneon, quantmax, quantedits, quanttube) + replace the ~38
   mock pages with real, wired data.
9. **QuantSync Verified-gated posting + anonymous-reels-in-feed** with real moderation.
10. **QuantChat in-chat games + AI auto-reply/voice-note**; **phone OTP** enforced.

---

## 5. BUILD MANDATE & SEQUENCING (this is a build pass, not an audit pass)

Work in **vertical slices** (one feature wired UI→API→DB→test→deploy) over horizontal stubs.
Recommended milestone order (re-justify if evidence says otherwise):

- **M0 — Truth & Safety (days):** clean-clone gate table; kill security-class `Math.random()`;
  confirm/repair real crypto, PKCE-S256, JWT secrets-from-env; restore real coverage threshold or
  raise coverage to it. Exit: all gates green on cold clone with **honest** thresholds; 0 toy
  crypto on auth path.
- **M1 — Identity spine:** QuantMail SSO trusted by ≥3 apps (QuantMail + QuantChat + QuantAI),
  QuantChat phone-OTP, shared session everywhere. Exit: one login → 3 apps, proven by E2E.
- **M2 — Shared shell + universal avatar:** every app renders `EcosystemShell` + global app-switcher
  + the animated alien QuantAI avatar with live context. Exit: avatar present & interactive in all
  shipped apps.
- **M3 — Flagship app depth (vertical slices):** QuantChat (msg reliability + in-chat games + AI
  auto-reply), QuantNeon (real feed/reels/stories/maps), QuantSync (verified + anonymous-reels).
  Replace mock pages with wired data. Exit: each flow demoable on real data with tests.
- **M4 — AI control plane:** real long-horizon agent loop + MCP/connectors; the "Uno game →
  QuantCode → PR → CI → deploy" flow works; QuantTube AI-navigated playback works. Exit: both
  flagship flows pass an E2E demo.
- **M5 — Economy & monetization:** credits earn/spend/top-up/**withdraw**, overage toggle, QuantAd
  injection, creator payouts. Exit: a test user earns, spends, tops up, and withdraws on real rails
  (sandbox).
- **M6 — QuantGames:** scaffold the Godot real-world game (project, world, AI-NPC bridge via BYO
  API key, proximity voice, in-game economy) + casual cross-app games with connected ranks. Exit:
  a playable vertical slice with one reasoning NPC + proximity voice.
- **M7 — QuantTrinity + infra hardening:** admin monitoring of all apps/users, sector-scoped team
  roles, AI-employees, model/payment reroute control; CI/CD, staging, observability, E2E enforced.

For **every** milestone define **hard, testable exit criteria** before coding, and do not mark it
done until an automated test or a reproducible demo proves it on real data.

---

## 6. UI/UX & DESIGN-SYSTEM BAR (make it the best — premium, cohesive, AGI-feel)

- **Token architecture in `packages/brand`**: real design tokens (color/type/space/radius/
  elevation/motion), light+dark, per-app theming, **WCAG AA** enforced via `contrast.ts`, single
  source consumed by `shared-ui`.
- **`EcosystemShell` adopted by every app**: consistent global nav, app-switcher, universal search
  (`command-palette` / `universal-timeline`), unified auth/session/data-fetching pattern.
- **Component coverage in `shared-ui`** for what apps actually need: feed, reels player, stories,
  swipe deck, video/music player, chat composer, call UI, editor timeline, data tables, command
  palette — all accessible (focus/ARIA/keyboard), responsive, mobile-first.
- **One motion language** (durations/easings/spring) — separate real animation from `Math.random()`
  data fakery.
- **The alien QuantAI avatar** is a first-class, universal, animated presence (idle/thinking/
  acting/speaking) — not chat-only, not static.
- **Mobile**: assess `quant-mobile` (RN) — QuantChat/QuantAI are phone-first; build real screens,
  not stubs.
- Walk the actual UI of every flagship flow and score completeness + polish; ship until premium.

---

## 7. GUARDRAILS (non-negotiable)
- **Security**: no toy crypto, no `Math.random()` secrets, no hardcoded prod secrets, PKCE-S256
  only, rate-limited auth, signed payment webhooks, IDOR-safe repos/resources.
- **Legal/moderation**: anonymous + UGC paths need real moderation; CSAM handling stays **fail-
  closed** (never silently `{matched:false}`); don't ship UGC media without a real provider.
- **Money**: overage OFF by default; withdrawals need KYC/anti-fraud hooks; ledger must be
  double-entry and auditable.
- **No regressions**: every PR keeps all gates green on a cold clone; coverage threshold must be
  **honest** (don't lower it to pass).
- **Evidence or it didn't happen**: cite paths/lines/command-output for every "done."

---

## 8. DEDUP / KILL-LIST (resolve early)
Adjudicate canonical vs dead and merge/delete with evidence: `quantube` vs `quanttube`,
`status` vs `quantstatus`, `packages/payment` vs `packages/payments`, `recommendation` vs
`recommendations`, `ml` vs `ml-pipeline` vs `ml-runtime`, `security` vs `security-advanced`,
`launch-beta` vs `launch-public`. Build a real import graph; archive orphan packages; quantify
dead LOC.

---

## 9. CADENCE & OUTPUTS
1. **Open with the verified gate table** (claimed vs actual) + real coverage %.
2. Maintain a **living vision-coverage matrix** (§3, feature-by-feature) updated as you ship.
3. Work milestone-by-milestone (§5); per milestone: plan with exit criteria → vertical-slice build
   → tests/demo proof → short status note (what shipped, evidence, what's next).
4. Keep `.agents/state/*` **honest** — reconcile or delete inflated claims; log doc-drift.
5. Prefer **shipping wired vertical slices** over breadth of stubs. Tell the founder the truth,
   terse in prose, exhaustive in matrices, relentless in execution.

> Audit briefly, then **build**. The product is large but unfinished where it matters most:
> the flagship differentiators (Godot game, universal AI avatar + device control, real agent loop,
> end-to-end credit economy) and the wiring/UI that turns 285k lines of code into one premium,
> interconnected, AGI-level ecosystem.
