# AUTONOMOUS KIRO — START HERE

## YOUR MISSION
You are building the Quant Ecosystem — a 19-app super-app that permanently replaces Gmail, GitHub, WhatsApp, Instagram, TikTok, YouTube, Zoom, Slack, Google Drive, ChatGPT, and Spotify for users.

## STEP 1: Read the master plan
Read this file FIRST: `.agents/AUTONOMOUS_KIRO_MASTER_PROMPT.md`
It contains the full Phase 9-21 execution plan with deliverables, acceptance criteria, and architecture.

## STEP 2: Understand current state
- 1433 TypeScript files, 299K LOC, 9 apps, 28 packages
- Phases 0-8 are DONE (monorepo, Prisma, auth crypto, Fastify, infra, frontend scaffolds)
- Phases 9-21 are NOT IMPLEMENTED — zero work done
- Legacy `apps/*/api/` folders still use in-memory `Map<>` storage — DELETE THEM ALL in Phase 9
- `packages/moderation` uses placeholder regex — REPLACE with real ML
- `packages/social-graph` is in-memory — REPLACE with Prisma + Redis
- `packages/payments` never imports Stripe SDK — ADD real Stripe
- No federation, no data-plane, no queue system, no agent swarm exists yet

## STEP 3: Execute phases in STRICT order
Start at Phase 9, do not skip. Each phase = one branch + one PR + merge.

## STEP 4: Additional requirements BEYOND the master plan

After Phase 21, continue with these additional phases:

### Phase 22-25: New Apps
- **QuantMeet**: Video conferencing with mediasoup SFU + AI live transcription + meeting summary
- **QuantDocs**: Real-time collaborative documents via Yjs CRDT + AI writing assistant
- **QuantDrive**: E2E encrypted cloud storage + AI auto-organize
- **QuantCalendar**: Standalone AI scheduling (not just a controller) + CalDAV server

### Phase 26-28: QuantMail as Gmail+GitHub Killer
- **Real SMTP server** (smtp-server package) + real IMAP + custom domain support
- **Real Git hosting** (git-http-backend) + PRs + Issues + CI/CD runner
- **AI email features**: auto-triage, auto-reply, smart compose, thread summary, follow-up reminders, meeting extraction, tone shifting, tracking pixel stripping, PGP encryption built-in

### Phase 29-32: AI Agent Swarm + Device Control
- **Multi-agent orchestrator**: Supervisor decomposes user intent into parallel sub-agents
- **3-tier device control**: Tier 1 (Quant API direct), Tier 2 (OS native), Tier 3 (vision-based for external apps)
- **12 pre-built pilot agents**: Email, Code, Schedule, Shopping, Finance, Social, Content, Travel, Research, Health, Meeting, Learning
- **Agent Dock UI**: bottom sheet (mobile) / side panel (desktop) showing all running agents with live progress
- **Safety**: 5-level permissions, spending limits, kill switch, audit trail, trust scoring

### Phase 33-36: AI Strategy (NO OWN MODELS — use cloud APIs)
- **15+ providers** via Vercel AI SDK: OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, Fireworks, Together, DeepInfra, Cohere
- **Smart routing**: cheapest for autocomplete (Groq), best for reasoning (Claude), fastest for voice (Groq Whisper)
- **Cost target**: $0.02/user/day via intelligent routing
- **On-device AI** for privacy-critical tasks: ONNX Runtime Web for ranking, moderation, autocomplete

### Phase 37-42: Internet-History-Changing Micro-Features
- **AI Digital Twin**: AI responds on your behalf when you're busy (with permission)
- **AI Life Search**: natural language search across your entire digital life ("when did I last talk to Mom?")
- **Universal Clipboard**: copy anything in any app → paste in any other, cross-device, AI-enhanced
- **AI Context Cards**: hover over any person → see everything across all apps
- **Predictive Preload**: AI predicts what you need next and pre-loads it
- **One-Tap Context Switch**: work mode ↔ personal mode across all apps instantly
- **Cross-app workflows**: drag email → create doc, drag video → create post
- **Algorithmic choice**: users pick their ranking algorithm (chrono/AI/community/custom)
- **Anti-rage ranking**: outrage content ranks LOWER even if high engagement
- **$4.99/mo ad-free**: one subscription removes ads from ALL apps

## KEY CONSTRAINTS
- No own AI models — use cloud APIs via Vercel AI SDK multi-provider routing
- No Math.random for security — use crypto.randomBytes
- No PII plaintext — use field-level encryption
- No `any` type — TypeScript strict
- All validation: Zod. All errors: typed. All imports cross-package: @quant/<pkg>
- 80% test coverage on critical paths
- Every commit: Conventional Commits format
- Delete legacy aggressively — zero tolerance for Map<> stores or placeholder strings
