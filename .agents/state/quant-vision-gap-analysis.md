# Quant Ecosystem — Vision Gap Analysis & Build Roadmap

> Generated 2026-06-24 from a deep code-vs-vision audit (6 parallel agents) against
> `.agents/state/quant-product-vision.md`, on `main @ dded0918` (after #271–#366).
> Legend: ✅ real / 🟡 partial / ❌ missing-or-broken. "Real" = DB-backed, no in-memory/stub.

## Executive summary

The ecosystem is far more real than the older audits suggest. Core auth (OAuth2/OIDC, PKCE S256,
jose HS256/RS256, JWKS, refresh rotation) is genuinely production-grade. QuantDrive (S3+Prisma),
QuantMeet (real LiveKit), QuantDocs (real Yjs CRDT), QuantSync engagement, QuantMax short-video/dating,
QuantTube video/channels, QuantEdits collaboration, QuantAds second-price auction, and the AI engine
(Vercel AI SDK multi-provider) are real. The gaps are concentrated in: (a) cross-app wiring + a few
bypassable authz checks, (b) in-memory persistence islands that lose data on restart, (c) the
"super-app glue" (QuantAI device control, QuantCode agent loop, segment-skip playback), (d) a unified
credits ledger, and (e) entirely-greenfield items (Godot real-world game, OpenRouter, channels/bots).

## Highest-priority defects (fix first — security/correctness)

1. **QuantSync Verified is bypassable** — posting rule enforced only client-side; backend `posts.ts`
   has no verified/space check. A direct API call posts to Verified as a non-verified user. (security)
2. **QuantSync poll voting is a dead path** — frontend → proxy → backend `/posts/:id/poll/vote` which
   doesn't exist; no Poll model. (broken feature)
3. **QuantMail embedded Drive/Calendar mis-wired** — Next proxies forward to QuantMail backend (:3010)
   which has no `/drive` or `/events` routes (those live in quantdrive/quantcalendar). 404s. (broken)
4. **quantmax randomChat** writes to a Prisma model that doesn't exist (`@ts-expect-error`). (broken)
5. **QuantSync bookmarks** have two implementations — real Prisma + a stale in-memory `Map` still used
   by `feed.service`/`post.service.likePost`. (data-loss + duplication)
6. **apps/quanttube** is a dead duplicate of apps/quantube (hardcoded dev JWT, strands the QuantTube
   voice subscriber). Migrate voice-registration → quantube, delete quanttube. (tech debt)
7. **JWT/OIDC dev fallbacks** — several `app.ts` use `'dev-secret-change-in-production'` and OIDC uses
   an ephemeral keypair when env unset (prod-gated but multi-instance-unsafe). (ops)

## In-memory persistence islands (replace with Prisma/Redis)

quantube playlist/history/watch-later · quantedits project/export · quantai conversation-history/prompt-library ·
quantsync feed bookmarks Map · cross-app-gaming all state · all 4+ credits/wallet services · QuantTrinity store.

## Per-app gap tables

### QuantMail (super-hub) — auth ✅, super-app glue 🟡

| Feature                                                           | Status                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| OAuth2/OIDC SSO root (authorize/token/jwks/PKCE/refresh-rotation) | ✅                                                                 |
| QuantDrive (S3+Prisma upload/share/version/folder)                | ✅                                                                 |
| QuantMeet (real LiveKit rooms/egress/tokens)                      | ✅                                                                 |
| QuantDocs (real Yjs CRDT + S3 snapshots + awareness)              | ✅                                                                 |
| GitHub-like: repos/PR/issues/reviews/branch-protection (Prisma)   | 🟡 metadata real; git transport + CI exec are seams (noop runners) |
| QuantCode coding agent (plan→edit→PR→CI loop, human-gated)        | 🟡 runtime exists; not wired to a UI; never deploys                |
| Drive/Calendar embedded in QuantMail                              | 🟡 UI shells exist, proxy mis-wired; Docs/Meet not embedded        |
| Calendar routine planner + call-style ringing alarms              | ❌                                                                 |
| QuantAI alien avatar that opens QuantCode + device control        | 🟡 email-only sidebar; not the avatar/agent                        |
| QuantChat phone-number requirement via QuantMail identity         | ❌ not enforced                                                    |

### QuantChat — Snapchat+WhatsApp+Telegram

✅ streaks, reels, feeds, groups, in-chat games (3 playable), AI auto-reply, phone OTP, calls (LiveKit), push.
🟡 avatars (procedural SVG not Bitmoji), lenses/AR (in-memory), stories (no dedicated TTL service), E2EE (custom HMAC — vision/steering mandates Signal Protocol).
❌ Google-Maps integration, channels, Telegram-style bots, AI voice notes.

### QuantNeon — Instagram

✅ reels, feed, stories (24h TTL), bookmarks, notifications, in-feed Tic-Tac-Toe.
🟡 close friends (backend real, frontend in-memory), map (logic real, no render/Maps).
❌ functional DMs (UI exists, no backend), cross-app shared game ranks, cross-app game publishing.

### QuantMax — TikTok+Omegle+Tinder+party

✅ short videos, dating/swipes, feed, live streaming (go/list/join/end), safety.
🟡 Omegle random chat (in-memory queue; orphaned LiveKit matchmaking service not wired; **randomChat model missing**), rooms (frontend, no backend route).
❌ squad groups, party games, posts, real proximity/spatial voice.

### Quant Games + Real-World (Godot)

🟡 cross-app-gaming package real but in-memory and imported by no app; Tic-Tac-Toe only.
❌ Uno/Ludo/Monopoly, shared cross-app ranks wired, in-game marketplace tied to credits, user-published games.
❌ Godot GTA-V-like real-world game with AI NPCs + BYO-API-key + proximity voice (entirely greenfield).

### QuantSync — X/Threads

✅ posts CRUD, votes/shares/comments, bookmarks (Prisma path), communities, anonymous section (HMAC alias + fail-closed moderation), SSO via QuantMail.
🟡 threads (replyTo only), feed (no ranking), trending (count sort), verified (UI/logic only — **backend not enforced**), anonymous moderation (3-regex denylist not @quant/moderation).
❌ follows/following-graph, polls end-to-end, reels-in-feed, anonymous reels.

### QuantAI — hub

✅ multi-provider inference (OpenAI/Anthropic/Google via Vercel AI SDK + circuit breaker/cache/cost), long-horizon agent loop + tool registry, alien avatar mounted in 15 apps.
🟡 MCP (in quant-tools, no external device bridge), phone device control (Twilio real; breadth varies), conversation persistence (in-memory).
❌ OpenRouter routing, laptop/OS control (simulated), "open QuantCode build task-by-task + deploy", segment-skip video control.

### QuantTube — YouTube+music

✅ upload/feed/likes/comments, channels/subscriptions, search.
🟡 playlists/library/watch-later/history (in-memory), music (catalog only, no real streaming/transcode), live streaming (frontend only, no backend).
❌ AI segment-skipping playback ("teach me X").

### QuantEdits — CapCut/AE killer

✅ timeline UI, effects catalog, templates, collaboration (Prisma).
🟡 brand kits, exports (in-memory, never renders).
❌ AI daily auto-edit→post automation, credits-based runs.

### QuantAds + Credits + QuantTrinity

✅ second-price auction + serving, ad-copy AI, analytics (aggregate), real Stripe/Razorpay/UPI SDKs.
🟡 targeting (basic), serve-path targeting missing, privacy-ads (mock candidate pool).
❌ in-game banner ads + OpenAD connector, click-fraud backend (UI calls missing routes), unified Quant Credits ledger (4+ fragmented in-memory wallets), daily payout scheduler, AI-overage opt-in default-OFF gate, OpenRouter + per-user model swap, in-game goods marketplace wired to credits.
QuantTrinity: 🟡 owner UI + team CRUD + AI-employee data model (all in-memory `globalThis` store; only user-count reads Prisma); ❌ real control-plane propagation to apps/AI/payments. Overlaps with `admin` (which is DB-backed).

## Build roadmap (waves, sequenced so each is verifiable)

- **Wave 1 (this session): security + broken-path fixes.** QuantSync Verified backend enforcement + spaces;
  QuantSync poll model + vote endpoint; QuantSync follows + following feed; remove stale bookmark Map;
  fix QuantMail Drive/Calendar embedded proxy; add quantmax `randomChat` model; delete `apps/quanttube` dup
  (migrate voice). Each with tests + green typecheck/test for touched packages.
- **Wave 2: persistence islands → Prisma/Redis** (quantube playlist/history, quantedits export render, quantai conversations).
- **Wave 3: unified Quant Credits ledger** (one Prisma-backed wallet; migrate the 4 services; overage opt-in default-OFF; daily payout job).
- **Wave 4: cross-app glue** (cross-app-gaming wired + shared ranks; QuantNeon DMs; QuantAI segment-skip + QuantCode loop UI; OpenRouter provider).
- **Wave 5: greenfield** (channels/bots, Snap-Map/Google-Maps, Signal-Protocol E2EE, Godot real-world game).
- **Wave 6: infra** (per-deployable Dockerfiles/Helm, port unification, coverage→50%, staging, CI coverage gate).

---

## 2026-06-29 RE-VERIFICATION (deep code check) — several gaps already closed

A fresh file-by-file pass found the 2026-06-24 table is materially **stale**; multiple
items marked ❌/🟡 are now real and DB-backed. Verified against `main` + this session's PRs.

**Corrections to the tables above:**

- **QuantTube duplicate (`apps/quanttube`)** — RESOLVED in PR #404. Root cause was a
  split-brain app-id: `@quant/quant-tools` + ecosystem registry use `quantube`, but
  `@quant/agentic`'s voice-intent-parser routed "tube" → `quanttube` (the dead 41-file dup).
  Canonicalized on `quantube`; ported the dup's two unique pieces — **AI segment-skip**
  (segment.service + `/videos/:id/segments`, `/videos/:id/skip-plan`) and the **QuantAI voice
  subscriber** (appId `quantube`, crypto.randomUUID ids) — into the canonical app; deleted
  `apps/quanttube`. So "AI segment-skipping playback" (was ❌) now has a real backend.

- **QuantTube channel subscriptions** — already real in canonical `apps/quantube`
  (`ChannelService.subscribe/unsubscribe` recompute subscriberCount from real rows, plus
  `isSubscribed`, `getSubscribers`, `getSubscriptions`, and a **subscription feed**).

- **QuantSync poll voting (was ❌ "dead path / no Poll model")** — RESOLVED. `posts.ts` wires
  a real `PollService`: `POST /posts/:id/poll` (author-only attach), `GET /posts/:id/poll`
  (results, caller selections annotated), `POST /posts/:id/poll/vote` (cast/toggle).

- **QuantSync follows / following-graph (was ❌)** — ADDED in PR #405. Durable Prisma-backed
  `FollowService` on `UserRelationship` (FOLLOW): idempotent follow/unfollow, followers/
  following lists with viewer follow-state, and a **Following feed**. Routes under `/follow`.

- **QuantSync comment counts** — PR #402: `CommentService` now maintains `Post.commentCount` /
  `Comment.replyCount`, idempotent owner-only soft-delete, parent validation, reads hide deleted.

- **QuantNeon followers/following listing (was implied gap)** — ADDED in PR #403
  (`ProfileService.listFollowers/listFollowing` + routes).

- **QuantNeon DMs (was ❌ "UI exists, no backend")** — now has `dm.service.ts` + `routes/dm.ts`
  - `dm.service.test.ts`. Needs a deeper verification pass but the backend is no longer absent.

- **QuantAI conversation history / usage (was 🟡 "in-memory")** — NOT in-memory. `chat.service.ts`
  persists `aISession` + `aIMessage` via Prisma; `usage.service.ts` derives usage/billing/stats
  from persisted sessions. The only `new Map` in usage is a local per-method chart-bucket builder.

**Still genuinely open (re-confirmed):** quantube playlist/history/watch-later in-memory (a
_deliberate, spec'd_ first-slice — `quantube-real-data-wiring` — guarded by property tests, so
migrating is a scoped project, not a quick fix); quantedits export render; cross-app-gaming
wiring + shared ranks; QuantMail embedded Drive/Calendar proxy + ringing-alarm planner;
OpenRouter + per-user model swap; Signal-Protocol E2EE; channels/bots; Maps; Godot real-world game.

**Lesson:** trust code over the audit doc. Re-verify a claimed gap before "fixing" it — several
were already done, and one (#401) duplicated existing functionality into a dead app before this
was caught.
