# Quant Ecosystem — Product Vision (North Star)

> Captured 2026-06-24 from founder directive. This is the authoritative product spec.
> Goal: a deeply-interconnected super-ecosystem that beats Google + Meta. Every app is real,
> every micro-feature shipped, all apps interconnected, all controllable by QuantAI, best-in-class UI/UX.
> Audit the live repo against THIS document. Status legend per feature: ✅ done / 🟡 partial / ❌ missing.

## Cross-cutting principles

- **Single identity:** QuantMail is the auth root (OAuth2/SSO) for ALL apps. One login → every app.
  - QuantChat additionally requires a phone number.
- **QuantAI everywhere:** every app embeds QuantAI as a small animated "alien" avatar assistant.
  - Visible animated actions (looks like it's doing the work by hand), AGI-level feel.
  - Controls the app it lives in, the user's other apps, AND the user's device (phone + laptop).
  - On laptop: behaves like Claude Code / Codex. On phone: behaves like Gemini / Google Assistant.
  - MCP + connectors; long-horizon agentic; better than Fable/Firebase-tier results; security checks built in.
- **Deep interconnection:** all apps talk to each other; content/games/identity flow across apps.
- **Credits economy:** one currency "Quant Credits" (1 credit ≈ $1 target). Used for AI overage, purchases,
  creator payouts. Top-up via UPI / PayPal / Stripe / crypto. Withdraw via UPI / crypto / others, daily.
  - Plans like Gemini / ChatGPT tiers. Daily free allowance.
  - Overage billing only when user explicitly enables it (default OFF).
  - Models sourced via OpenRouter (all models available); users can swap models anywhere automations run.
  - Long-term: shift to local models; route all AI/payment config control through QuantTrinity.
- **Monetization:** QuantAds funds the ecosystem (beat Meta Ads / Google Ads). Creator payouts as credits.
  Boost reels/streaks, sell in-game digital goods, marketplace commission, etc.
- **UI/UX bar:** best-in-class, AGI-level polish, animations, accessibility, mobile + desktop.

## Apps

### QuantMail — auth root + super-hub

- Central OAuth2/SSO provider for the whole ecosystem.
- NOT a normal email client: embeds full **GitHub-like** features — code repos, Codex, "Claude Code"-style
  coding, CI/CD, view file contents in a Code tab.
- Hosts QuantAI agents that can open QuantCode, work task-by-task, deploy, run security checks.
- QuantDrive, QuantCalendar, QuantDocs, QuantMeet behave as **features inside** QuantMail (Google-suite style).
- Calendar usable as daily routine planner; alarms ring like a call in QuantMail (call-style sound, answerable).

### QuantChat — Snapchat + WhatsApp + Telegram killer

- ALL Snapchat micro-features: avatars (Bitmoji-style), lenses, AR, streaks, reels, feeds, stories, Snap Map.
- ALL WhatsApp + Telegram features (groups, bots, channels) + Telegram-bot equivalents.
- In-chat games (play with friends, Snapchat-style game tray).
- Map feature (Google Maps integrated; see friends' posts/locations).
- QuantAI as avatar in-chat: can read/auto-reply to messages, automate, send voice notes, act autonomously.
- Phone number required (in addition to QuantMail login).

### QuantNeon — Instagram killer

- Full Instagram feature set + micro-features: reels, feed, stories, close friends, bookmarks,
  notifications, map feature (friends' posts), DMs with newest chat features.
- In-feed games (like QuantChat) — playable reels/games.
- Quant Games are cross-app connected (ranks shared across all Quant apps); users can post a game they made
  to QuantTube / their feed and it shows across apps.

### QuantMax — TikTok + Omegle + Tinder + party

- TikTok-style short videos, Omegle-style random video chat, Tinder-style dating.
- Squad groups, feed, rooms, party games, posts.
- Real proximity voice (you hear only users near you, BGMI-style spatial, or phone-call mode), not global mic.

### Quant Games (cross-app) + Real-World Game (Godot)

- Cross-app connected games with shared ranks. Play-with-friends like Plato: Uno, Ludo, Monopoly, etc.
- A **real-world open-world game** built in **Godot**, GTA-V-like, real Earth-like.
  - NPCs are real AI (think + act). Users connect their OWN API key (API cost on user) to drive characters.
  - Users create characters / army / dog / anything; AI assigns tasks (hunting, fetching).
  - Real proximity interaction: nearby characters can hear/talk to each other; real NPC characters.
- Monetize via in-game digital goods (characters, clothes, coins) — bought/sold in Quant Credits;
  user-creators sell their goods; platform takes commission.

### QuantSync — Twitter / X / Threads killer

- Full X/Threads feature set + micro-features.
- **Anonymous section** (separate, do NOT mix): anonymous feed + anonymous reels-within-feed; nobody knows who posts.
  Strong content moderation. For leaks/political/sensitive topics that get banned elsewhere.
- **Verified section ("QuantSync Verified"):** badge/logo at top of home; click → verified space where only
  verified accounts can post/reply, but all users can view. (e.g., govt/official posts; only verified reply.)

### QuantAI — main AI hub (controls everything)

- Deeply connected to all apps. Controls phone + laptop so user need not touch the device.
- Connectors + MCP + all features. Laptop = Claude Code/Codex; phone = Gemini/Google Assistant.
- Example flows:
  - "Build me an Uno-like game" → QuantAI opens QuantCode (inside QuantMail), agent works task-by-task, deploys.
  - "Watch Carry's videos in QuantTube" / "teach me to ride a bike" → opens QuantTube, plays only the relevant
    clip segments (skips to the useful parts), controls playback itself.
- AGI-level agent framework, long-horizon agentic, multi-model (OpenRouter), security checks.
- Appears as alien avatar across all apps.

### QuantTube — YouTube + music

- YouTube features + music (YouTube Music / Spotify-like). Library, playlists, watch-later, history, search,
  channels/subscriptions, likes, comments, live streaming.
- Controllable by QuantAI (segment-skipping playback for "teach me X").

### QuantEdits — CapCut + InstaEdit + After Effects + Google Flow killer (beat Omni/Google models)

- Full pro editor: timeline, effects catalog, brand kits, templates, collaboration (members + comments), exports.
- Automations via QuantAI: e.g. "every day 5am auto-edit AI news and post to QuantTube/QuantSync/QuantNeon."
- Daily agentic runs, credits-based.

### QuantAds — Meta Ads + Google Ads killer (funds ecosystem)

- Earns money from all apps. Second-price auction + serving (exists partially).
- In-game banner ads (e.g., Temple-Run-style game building has a banner → connect to QuantAds via OpenAD connector).
- QuantAI can wire ads automatically; users can also do it manually.
- Creator payouts (QuantTube/QuantSync/etc.) flow here as **credits** (1 credit ≈ $1), daily withdrawable
  (crypto/UPI/etc.). Users add credits (UPI/PayPal/Stripe/crypto). Overage uses credits only if user opts in.

### Google-suite-style feature apps (inside QuantMail)

- **QuantDrive** (storage), **QuantCalendar** (routine + call-style alarms), **QuantDocs** (collab docs),
  **QuantMeet** (WebRTC video). Used as features by QuantMail and other apps via QuantAI.

### QuantTrinity — owner/admin command center (MAIN, make it the best)

- Admin control of all apps + all users; deep monitoring.
- Founder's personal QuantAI managing the whole platform.
- Create accounts for internal teams by sector (e.g., reporting team sees user reports).
- AI "employees" can be slotted into roles: review daily reports, do the work in place of a human.
- All AI/payment/model config + cost control routed through QuantTrinity.

## Ecosystem-wide monetization recap

- Creator payouts as credits (daily withdraw). Boost reels/streaks (paid). Streak monetization in QuantChat.
- In-game digital goods marketplace (commission). Seller commissions. Plans + daily limits (Gemini/ChatGPT-style).
- Top-up: UPI/PayPal/Stripe/crypto. Designed for profitability; later shift to local models to cut cost.

## Audit instructions (for the CEO agent)

For each app: enumerate the vision's micro-features, then mark ✅/🟡/❌ against actual code (routes, services,
frontend screens, real vs simulated). Identify: what's done, what's partial, what's broken, what's extra/unplanned.
Produce a prioritized roadmap to close gaps and reach the "beat Google/Meta" bar.
