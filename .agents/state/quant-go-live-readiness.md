# Quant Ecosystem — Go-Live Readiness

> Authoritative checklist of everything required to take the ecosystem live, assessed against
> `main` after Phase 83 landed (Prisma plugin + auth enforcement + port fixes are DONE).
> Companion to `quant-integration-audit.md` and `quant-completion-roadmap.md`.
> "Live-ready" = **product-complete + real + deployable + secure + observable + load-proven.**

## Readiness scorecard

| Area | Status | Gap |
|---|---|---|
| Runtime foundation (Prisma/auth/ports) | ✅ done | — |
| Security (CodeQL XSS/ReDoS/randomness) | 🟡 ongoing | drive alerts to 0 |
| Buildable frontends | 🟡 2/6 | quantube, quantneon, quantmax, quantedits still no `next` |
| Feature engines wired into apps | ❌ | 68 engines orphaned (payments, notifications, ar-lenses, federation…) |
| Mock screens replaced | ❌ | 27 screens (mock-debt.csv) still fixtures |
| Real integrations (no `@simulated`) | ❌ | 39 files (LLM, ML, SFU, CSAM, search) simulated |
| Deployability (containers/Helm/CI) | ❌ | 3 Dockerfiles; Helm ships only ws-gateway/triton |
| Coverage ≥ 50% | ❌ | ~30% |
| E2E / staging / infra validated | ❌ | E2E advisory; no staging; Helm/Terraform unvalidated |

## What's needed to go live

### A. Product completeness
- **Finish the 4 dead frontends** (quantube/neon/max/edits → Next App Router) — Phase 85.
- **Flagship flows** — quantmail compose, quantdrive upload/share, **quantmeet real WebRTC**, quantai/quantchat backend — Phase 86.
- **Kill the 27 mock screens** → live API — Phase 87.
- **Wire the 68 orphaned engines** into apps: cross-cutting first (notifications, observability, performance, error-monitoring, identity-permissions, onboarding, command-palette, api-client), then per-app (payments, ar-lenses, recommendations, federation, encryption, quant-live, agent-runtime…) — Phases 88–89. **Largest remaining gap.**

### B. Real integrations (replace 39 `@simulated`) — Phase 90
- 12 agent pilots → real LLM via `@quant/ai`.
- ML pipeline + recommendations (17) → Triton/ONNX + real embeddings + vector DB.
- quantmeet SFU → **LiveKit/mediasoup**; recording → real pipeline.
- moderation CSAM → **PhotoDNA / Thorn Safer** (legal blocker for UGC) + real perceptual hash.
- search → Meilisearch/Typesense; federation Matrix → matrix-js-sdk.
- payments → live Stripe keys + webhook verification (engine already real; needs wiring + keys).

### C. Infrastructure & deployment — Phase 84 + ops
- **Containerize all 13 app backends + 7 services** (only 3 Dockerfiles today).
- **Helm workloads + ingress for every app**; CI build+deploy matrix (today only `ws-gateway`).
- **Committed Prisma migrations** (no `migrations/` today; `db push --force-reset` is unsafe) + backups/PITR.
- Provision managed Postgres, Redis, S3, Kafka, vector DB, LiveKit per environment.
- **Secrets management** (JWT_SECRET/AUDIENCE, Stripe, LiveKit, Kafka, OAuth) via a vault — not `.env`.
- CDN + TLS + DNS + autoscaling + edge rate-limiting.

### D. Security & compliance
- CodeQL alerts → 0; clean dependency audit; secrets scanning; WAF + CSP.
- External pen-test before public launch.
- **Privacy/compliance:** GDPR + India DPDP data-subject flows, consent, retention, residency; **CSAM reporting (NCMEC)** for UGC apps; Stripe PCI scope via Connect.
- Confirm `requireAuth` on every protected route; token refresh/rotation; session revocation.

### E. Quality & reliability
- Coverage **30% → 50%** (auth/payments/security → 80%); make `test-and-coverage` green.
- **Real E2E** (Playwright) against a live stack in CI (today advisory-only).
- **Load/soak testing** (k6/) to validate autoscaling + SLOs.
- Production observability (OTel/Prometheus/Grafana scaffolded) + alerting + on-call + runbooks.

### F. Launch operations
- **Staging environment** + soak; validate Helm/Terraform on a real cluster.
- Canary/blue-green deploy + tested rollback; DB migration runbook.
- Status page (status app), support flow, beta cohort (launch-beta engine), incident process.

## Sequenced path
83 ✅ → 84 deploy → 85 frontends → 86 flows → 87 mocks → 88 cross-cutting engines →
89 per-app engines → 90 replace simulated → 91 outbox/search → 92 quality/infra → 93 launch ops.

## Procurement & external connections (accounts / keys / services to set up)

Grounded in what the code references (`.env.example`, `docker-compose.dev.yml`, package deps).

| Category | Concrete need | Env / SDK |
|---|---|---|
| Cloud + k8s | AWS (uses @aws-sdk) + EKS/GKE + container registry | — |
| Domain/DNS/TLS/CDN | domain + subdomains, DNS, TLS, CloudFront (signed media), email DNS (MX/SPF/DKIM/DMARC) | @aws-sdk/cloudfront-signer |
| Postgres+pgvector | managed (RDS/Aurora/Neon/Supabase) | DATABASE_URL |
| Redis | ElastiCache/Upstash | REDIS_URL |
| Object storage | S3 / Cloudflare R2 (replaces MinIO) | S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY |
| Kafka | MSK/Redpanda Cloud (CDC→search) | KAFKA_BROKERS |
| Vector DB | Qdrant Cloud (or pgvector) | — |
| Search | Meilisearch Cloud | MEILISEARCH_URL/KEY |
| Messaging | NATS | NATS_URL |
| LLM | Anthropic (primary) + OpenAI (embeddings) | ANTHROPIC_API_KEY, OPENAI_API_KEY |
| GPU inference | Triton on GPU / SageMaker / Modal (only if real ML enabled) | — |
| Video/voice | LiveKit Cloud or self-host (+TURN/STUN) | LIVEKIT_API_KEY/SECRET/WS_URL |
| Payments | Stripe + Connect + webhook secret + Tax | stripe |
| Email send | SES/SendGrid/Postmark + verified domain | SMTP_HOST/PORT (nodemailer) |
| Inbound email | MX → smtp-inbound service | — |
| SMS/voice | Twilio + phone number | twilio |
| OAuth | Google, Apple, GitHub apps | — |
| JWT | strong secret in vault | JWT_SECRET, JWT_ISSUER |
| SSO (enterprise) | SAML/OIDC IdP (teams package) | — |
| Trust & safety | PhotoDNA/Thorn Safer + NCMEC (CSAM, legal for UGC) | — |
| Maps/geo | Google Maps / Mapbox | — |
| Error monitoring | Sentry DSN | — |
| Metrics/tracing | Grafana Cloud/Datadog (or self-host Prometheus+Grafana) | — |
| Secrets | AWS Secrets Manager / HashiCorp Vault | — |
| Mobile | Apple Developer + Google Play + APNs/FCM | — |

**Minimum to launch the first app (QuantMail):** cloud + k8s, domain+DNS+TLS, Postgres, Redis, S3,
email provider (+MX/SPF/DKIM), JWT secret, Anthropic key, Sentry, secrets vault. Everything else is
per-feature: LiveKit (meet), Stripe (paid), PhotoDNA (UGC), Twilio (SMS), GPU (ML), Maps.

## Definition of "live-ready" (exit criteria)
- All CI gates green on a clean clone, incl. `test-and-coverage` ≥ 50% and **real E2E**.
- Full stack boots via compose/k8s; `helm template` + `terraform plan` validated on staging.
- **0** `@simulated` in production paths; **0** mock-data default renders; **0** intended-but-orphaned engines.
- A real user signs in (JWT enforced) and completes every flagship flow end-to-end against live infra.
- Compliance sign-off (privacy, payments, CSAM) for the apps being launched.
