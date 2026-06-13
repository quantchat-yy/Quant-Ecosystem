# Quant Ecosystem — 90-Day Strategic Roadmap

**Date:** 2026-06-12
**Scope:** 17 apps, 90+ shared packages, 8 services, ~444K LOC TypeScript
**Architecture:** Monolith-per-app (Next.js frontend + Fastify backend co-located per app)

---

## 1. Product Vision

Quant Ecosystem is an **all-in-one digital operating system** — a unified platform spanning communication (mail, chat, meet), social media (sync, neon, max, tube), productivity (docs, drive, calendar, edits), AI (quantai, agents, notebooks), and commerce (ads, economy, studio).

**North Star:** A single user identity that seamlessly moves across every digital need — from email and messaging to video, social posting, AI assistance, file storage, and creative tools — with zero context switching.

**Current reality:** The infrastructure layer (auth, observability, deployment) is production-grade. The differentiating features (ML, real-time video, agentic AI, federation) are labeled `@simulated` — honest but not shippable.

**Day 90 target:** QuantMail + QuantChat + QuantAI in public beta with SSO, real ML recommendations, and automated CI/CD gating every commit.

---

## 2. Top 5 Strategic Initiatives

Ranked by **impact / effort** ratio:

| Rank  | Initiative                         | Impact   | Effort | Why Now                                                                                           |
| ----- | ---------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------- |
| **1** | Ship CI/CD pipeline                | Critical | Medium | **Blocking everything.** No automated tests, lint, build, or deploy. Every commit is blind.       |
| **2** | Replace simulated with production  | High     | High   | 75 `@simulated` files + 27 mock-data pages = product cannot launch. ML, RTC, agents must be real. |
| **3** | Database and service decoupling    | High     | High   | 55 models in one Prisma schema coupling all 16 apps. Single point of failure.                     |
| **4** | Security hardening + API contracts | High     | Medium | 6+ hardcoded dev secrets in prod paths. Zero API documentation. No OpenAPI specs.                 |
| **5** | Developer experience & tech debt   | Medium   | Medium | 13 disabled ESLint rules, 30% coverage, 3 duplicated motion-variants, 8 orphan stub packages.     |

### Quick Wins (first 2 weeks)

- CI/CD pipeline (`.github/workflows/ci.yml`)
- Replace dev secret fallbacks with startup-time validation
- Remove 10 stub services (ARCHITECTURE.md line 47)
- Delete `@quant/server` (unused legacy package)
- Generate OpenAPI specs from existing Zod schemas

---

## 3. Risks and Dependencies

### Critical Risks

| Risk                               | Likelihood | Impact               | Mitigation                                                                   |
| ---------------------------------- | ---------- | -------------------- | ---------------------------------------------------------------------------- |
| No CI/CD pipeline                  | Certain    | Fire                 | Sprint 1 — must be day 1 priority                                            |
| Single database per all apps       | High       | Fire                 | Read-replica + connection pooling in Sprint 2; domain separation in Sprint 3 |
| 75 simulated modules not shippable | Certain    | Blocking             | Inventory in Sprint 1; replace top 15 in Sprint 2-3                          |
| Dev secrets in production code     | High       | Security incident    | Fix in Sprint 1 — replace with env validation                                |
| No API contracts                   | High       | Integration failures | Zod→OpenAPI generation in Sprint 1-2                                         |
| 27 frontend pages on mock data     | Medium     | Blocking per app     | Migrate per-app timeline in Sprint 2-3                                       |
| No staging environment             | Medium     | Production incident  | Standing up staging env by Sprint 2                                          |

### Key Dependencies

```
CI/CD pipeline → unlocks everything else
OpenAPI specs → enables client SDK generation → enables mobile
Database decoupling → enables independent app scaling
Production ML → replaces simulated recommendations → enables QuantSync/QuantTube personalization
```

### Dependency Chain for Beta Launch

```
Sprint 1                          Sprint 2                          Sprint 3
┌──────────────┐                  ┌──────────────┐                  ┌──────────────┐
│ CI/CD        │ ──────────────►  │ Staging env  │ ──────────────►  │ Load testing │
│ Secret fixes │                  │ API contracts│                  │ Perf tuning  │
│ Stub cleanup │                  │ ML real impl │                  │ Beta launch  │
└──────────────┘                  └──────────────┘                  └──────────────┘
```

---

## 4. Recommended Team Composition

**Total: 3 squads (~12-15 engineers)**

### Squad A: Platform & Infrastructure (4-5 engineers)

| Role                    | Focus                                      |
| ----------------------- | ------------------------------------------ |
| 1x Infrastructure Lead  | CI/CD, Docker, K8s, ArgoCD                 |
| 1x SRE                  | Observability, Prometheus, Grafana, alerts |
| 1x Backend Platform     | Database, queue, service decoupling        |
| 1x Security Engineer    | Secrets, OpenAPI, compliance hardening     |
| 1x Developer Experience | ESLint, coverage, build speed, docs        |

### Squad B: Core Apps (5-6 engineers)

| Role          | Focus                                         |
| ------------- | --------------------------------------------- |
| 1x Tech Lead  | Architecture, code review                     |
| 2x Full-stack | QuantMail, QuantChat, QuantAI backend         |
| 2x Frontend   | Shared UI, app frontends, mock→real migration |
| 1x Testing    | E2E, integration, coverage improvement        |

### Squad C: AI/ML & Differentiators (4-5 engineers)

| Role                  | Focus                                       |
| --------------------- | ------------------------------------------- |
| 1x ML Engineer        | Replace simulated → production ML pipelines |
| 1x AI Engineer        | QuantAI, agents, real LLM integrations      |
| 1x Media Engineer     | Real-time video (LiveKit/mediasoup), WebRTC |
| 1x Backend/Federation | ActivityPub/Matrix, search indexing         |

---

## 5. First 30-Day Sprint Goals

### Sprint 1 (Days 1-10): Foundation & Safety

**Objective:** No more blind commits. All six quality gates run on every push.

| Task                              | Owner    | Deliverable                                                                         | Effort  |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------- | ------- |
| 1.1 CI/CD pipeline                | Platform | `.github/workflows/ci.yml` (install → typecheck → lint → test → build → Trivy scan) | 2 days  |
| 1.2 Fix dev secret fallbacks      | Platform | 6 files patched; env validation at startup; CI checks for 'dev-secret' patterns     | 1 day   |
| 1.3 Remove stub services          | Platform | Delete 10 stub services from repo and ARCHITECTURE.md                               | 0.5 day |
| 1.4 Delete `@quant/server`        | Platform | Remove unused legacy package                                                        | 0.5 day |
| 1.5 Enforce E2E in CI             | Testing  | Playwright runs as CI step (not advisory)                                           | 1 day   |
| 1.6 OpenAPI generation            | Platform | `zod-to-openapi` integration, CI publishes `openapi.json`                           | 2 days  |
| 1.7 `@simulated` inventory & plan | AI/ML    | Full audit of 75 files; priority ranking for replacement                            | 1 day   |
| 1.8 Coverage baseline             | Testing  | Set per-package coverage floors; add missing `@types`                               | 2 days  |

**Gate:** All PRs blocked unless CI passes.

### Sprint 2 (Days 11-20): Production Hardening

**Objective:** Core apps are deployable to a staging environment.

| Task                              | Owner     | Deliverable                                                               |
| --------------------------------- | --------- | ------------------------------------------------------------------------- |
| 2.1 Staging environment           | Platform  | Terraform/Helm validated against real cluster; ArgoCD deploys staging     |
| 2.2 Database connection pooling   | Platform  | PgBouncer sidecar; Prisma connection management                           |
| 2.3 Replace top 15 `@simulated`   | AI/ML     | ML recommendations, agent runtime, search indexing → real implementations |
| 2.4 Migrate 10 mock-data pages    | Core Apps | Connect real backends for highest-traffic pages                           |
| 2.5 API versioning strategy       | Platform  | URL prefix (`/v1/`) and Zod schema versioning                             |
| 2.6 ESLint rule re-enablement     | DX        | `no-explicit-any`, `no-unused-vars` → warn mode; fix violations           |
| 2.7 Notification system hardening | Core Apps | Real push notification delivery, not stubs                                |

**Gate:** Staging deployment passing all E2E tests.

### Sprint 3 (Days 21-30): Integration & Scale Prep

**Objective:** Beta-ready QuantMail + QuantChat + QuantAI with SSO.

| Task                         | Owner     | Deliverable                                                         |
| ---------------------------- | --------- | ------------------------------------------------------------------- |
| 3.1 Load testing & tuning    | SRE       | k6 suite passes SLO targets; auto-scaling configured                |
| 3.2 QuantMail beta readiness | Core Apps | Full email pipeline (send/receive/threads); SMTP inbound integrated |
| 3.3 QuantChat beta readiness | Core Apps | Real-time messaging with presence and notifications                 |
| 3.4 QuantAI beta readiness   | AI/ML     | Multi-model routing working; streaming responses                    |
| 3.5 SSO integration          | Platform  | Unified login across QuantMail, QuantChat, QuantAI                  |
| 3.6 Secret rotation setup    | Platform  | External Secrets Operator configured for staging                    |
| 3.7 Disaster recovery drill  | SRE       | Velero restore validated; runbook exercised                         |

**Gate:** Internal beta with 100 users; all six quality gates passing.

---

## 6. Resource Prioritization

### What to Build vs. What to Fix

| Action                                  | Category     | Reasoning                                                                   |
| --------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| **FIX:** CI/CD pipeline                 | Must-do      | Zero automated gating exists. Highest risk item.                            |
| **FIX:** Dev secrets                    | Must-do      | `'dev-secret'` fallbacks in 6+ files could leak in production.              |
| **FIX:** 10 stub services               | Quick win    | Dead code, confusing. Delete.                                               |
| **FIX:** ESLint rules                   | Quick win    | 13 disabled rules weaken type safety.                                       |
| **FIX:** Coverage thresholds            | Incremental  | 30% → 40% → 60% over 90 days.                                               |
| **BUILD:** Staging environment          | Must-do      | No validation environment = blind deployment.                               |
| **BUILD:** OpenAPI specs                | Must-do      | No API documentation = integration chaos.                                   |
| **BUILD:** ML production pipelines      | High value   | Differentiator for sync, tube, ads.                                         |
| **BUILD:** Real-time video              | Medium value | QuantMeet currently emits random ICE candidates. Ship as beta with LiveKit. |
| **DEFER:** Federation                   | Low urgency  | ActivityPub/Matrix is Phase 31 — no users need it yet.                      |
| **DEFER:** Mobile (Capacitor)           | Low urgency  | Needs Xcode/Android Studio; focus on web first.                             |
| **DEFER:** Third-party developer portal | Low urgency  | Not needed until APIs stabilize.                                            |

### App Launch Priority

```
Tier 1 (Beta, Sprint 3)
  QuantMail — central auth, email, identity hub
  QuantChat — real-time messaging, highest engagement
  QuantAI — ecosystem AI brain

Tier 2 (Public Beta, Day 60)
  QuantSync — social posting (Twitter/Threads/Reddit)
  QuantDrive — encrypted cloud storage
  QuantMeet — video conferencing with real LiveKit backend

Tier 3 (Day 90)
  QuantTube — streaming (video/music, creator tools)
  QuantNeon — Instagram-like social
  QuantCalendar — AI scheduling
  QuantAds — advertising platform
  QuantDocs — collaborative docs
  QuantMax — short video + dating
  QuantEdits — video/photo editor
  QuantMobile — cross-platform app
```

---

## Appendix: Key Metrics to Track

| Metric                       | Current      | 30-Day Target      | 90-Day Target   |
| ---------------------------- | ------------ | ------------------ | --------------- |
| CI/CD pass rate              | N/A (no CI)  | 100% on `main`     | 100% on all PRs |
| Test coverage                | ~30%         | 40%                | 60%             |
| `@simulated` files           | 75           | 60                 | 30              |
| Mock-data pages              | 27           | 17                 | 5               |
| OpenAPI endpoints documented | 0            | 50+                | 200+            |
| Hardcoded secrets            | 6+           | 0                  | 0               |
| E2E tests passing in CI      | 0 (advisory) | 48                 | 100+            |
| Build time (cold cache)      | ~8 min       | <5 min             | <3 min          |
| Dependency advisories (high) | 0            | 0                  | 0               |
| Apps in beta                 | 0            | 3 (mail, chat, ai) | 6               |

---

## Decision Log

| Decision                               | Rationale                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| **Prioritize CI/CD over new features** | Without CI, every change is a risk. No gating = no quality.                   |
| **Ship 3 apps in beta, not all 17**    | Focused quality > broad fragility. Get 3 right, then expand.                  |
| **Keep monolith-per-app for now**      | Works at current scale. Only decouple when independent scaling is needed.     |
| **Invest in ML production vs. RTC**    | ML recommendations affect 6+ apps. Real-time video is single-app (quantmeet). |
| **Avoid microservices migration**      | Premature optimization. Current architecture supports 100K users.             |

---

_This roadmap is a living document. Revisit bi-weekly at sprint retrospectives._
