# Requirements Document

## Introduction

QuantMail SuperHub evolves the existing QuantMail application — already the OAuth2/identity provider for the Quant Ecosystem and a real Prisma-backed Fastify + Next.js 15 app — into a single unified hub organized around four product pillars (Gmail-grade email, a GitHub-grade developer platform, a Claude Code/Codex autonomous coding agent, and a Perplexity-style cited answer engine), plus two integrative layers: an Agent Workforce / Company OS orchestration layer and an ecosystem-wide Credits, Plans & Billing economy.

These requirements are **derived from the approved design document** (`design.md`) and capture, as testable EARS acceptance criteria, the behavior every layer of that design must exhibit. The overriding principle is **build incrementally on the existing codebase — no greenfield rewrite**: each requirement hardens, replaces a simulation, or wires together existing assets rather than introducing a new engine. Delivery is **phased and gated**: the Phase 1 security/trust foundation is a hard gate that must be satisfied before any later pillar ships.

**Non-goal (out of scope):** QuantChat is owned by another agent and is explicitly **not** in scope for this spec. The only cross-app touchpoints permitted are the shared packages (identity/auth, AI engine, search, encryption) at their existing package boundaries; no QuantChat code or behavior is specified or changed here.

## Glossary

- **SuperHub**: The single unified QuantMail deployable (Next.js 15 App Router frontend + Fastify backend) hosting all four pillars and the orchestration/billing layers.
- **Pillar**: One of the four product capabilities — Gmail (email), GitHub/QuantCode (developer platform), Claude Code/Codex (coding agent), Perplexity (answer engine).
- **Identity_Pillar / Pillar 0**: The OAuth2/SSO + authorization foundation shared by every app and pillar.
- **PKCE**: Proof Key for Code Exchange — an OAuth2 mechanism binding an authorization code to a `code_challenge` so the token exchange must present the matching `code_verifier`.
- **KMS**: Key Management Service — the managed secret/key source (via `@quant/encryption`) that holds signing/encryption keys; private material is referenced, never stored in plaintext.
- **JWT_Secret**: The signing secret used by `TokenService` for access/refresh tokens; must be KMS-backed and rotatable.
- **Redirect_Allowlist**: The per-client set of registered, exact-match `redirect_uri` values an OAuth2 authorization may use.
- **AI_Engine**: The `@quant/ai` real LLM engine (OpenAI/Anthropic/Google adapters, circuit breakers, retry, semantic cache, safety pipeline, cost tracker).
- **DKIM**: DomainKeys Identified Mail — cryptographic signing of outbound email with a domain keypair.
- **SPF**: Sender Policy Framework — verifies the sending server is authorized for the envelope domain.
- **DMARC**: Domain-based Message Authentication — alignment policy combining SPF + DKIM results for inbound mail.
- **AuthVerdict**: The combined SPF/DKIM/DMARC outcome recorded on an inbound email.
- **Outbound_Delivery_Pipeline**: The queued (BullMQ) sender that DKIM-signs, resolves MX, transmits, and records per-recipient delivery state.
- **Inbound_Ingest_Adapter**: The component that verifies, threads, routes, and indexes inbound mail from `smtp-inbound`.
- **Delivery_State**: The lifecycle status of an email/recipient: draft, queued, sent, deferred, bounced, delivered.
- **QuantCode**: The SRP-extracted developer-platform domain module exposed under `/api/code/*` (repos, PRs, issues, review, CI, branch protection).
- **Branch_Protection**: Rules that must be satisfied before refs on a protected branch may advance or a PR may merge.
- **Agent_Runtime / Pillar 3**: The bounded plan → edit → open PR → run CI → iterate tool-execution loop.
- **AgentSession**: One execution of the Agent Runtime against a repo, with an isolated branch, iteration bound, cost budget, and transcript.
- **Answer_Engine / Pillar 4**: The RAG retrieve → ground → cite engine returning cited answers over the user's own data.
- **Citation**: A link from a span of an answer to a specific source chunk (emailId / repo+path / url).
- **Grounded_Answer**: An answer in which every claim maps to at least one citation.
- **CEO**: The human user who states a high-level goal in natural language and approves high-stakes actions.
- **Company_OS / Orchestrator / QuantAI**: The orchestration layer (the "company brain") that turns one CEO goal into a running, supervised agent org.
- **AgentOrg**: The "company" spun up for one CEO goal — tenant-scoped, with a budget cap and iteration cap.
- **AgentWorker**: A long-lived, role-specialized "employee" with its own model and its own QuantMail mailbox identity.
- **AgentRole**: A job definition (planner, coder, reviewer, tester, debugger, upgrader, devops) with a default toolset and default model.
- **Mailbox_Identity**: A dedicated, tenant-scoped QuantMail identity (address + OAuth scope) provisioned for an AgentWorker.
- **agent-bus**: The email-as-message-bus protocol — a reserved label plus structured `X-Quant-Agent-*` headers used for agent-to-agent coordination over real email.
- **AgentWorkItem**: A unit of company work, mapped 1:1 to an agent-bus email thread.
- **Gmail_Handler**: The autonomous handler that operates the CEO's real inbox under policy guardrails.
- **InboxAutomationPolicy**: Per-user, opt-in guardrails that classify each proposed inbox action as auto-executable or requiring human approval.
- **Credit**: The unit of metered usage; balances are owner-scoped and govern AI/agent/mail/RAG/CI/storage usage ecosystem-wide.
- **Daily_Allowance**: A recurring free credit grant that resets each UTC day and does not roll over.
- **CreditWallet**: An owner-scoped (user or org) wallet whose authoritative balance equals the sum of its ledger entries.
- **CreditLedgerEntry**: An append-only, immutable ledger row; the source of truth for a wallet's balance.
- **CreditMeter / UsageGate**: The single choke point that checks entitlements + reserves credits before a metered action and settles afterward; fails closed.
- **Reservation**: A pre-execution hold/debit keyed by an `actionKey`, later reconciled by `settle`.
- **actionKey**: The idempotency key for a debit/reservation/settlement.
- **PricingEngine**: Maps a cost driver (tokens, message, query, CI minute, storage) to a credit cost, deriving AI rates from the `@quant/ai` cost tracker.
- **PlanService / Entitlements**: Resolves an owner's plan tier and the entitlements it grants (daily allowance, included credits, rate limits, unlocked models/features).
- **Plan / Plan_Tier**: A subscription tier — Free, Pro, Team, or Enterprise.
- **BillingService**: Wraps the vendor-neutral PaymentProvider port for checkout, subscriptions, and signed webhooks.
- **PaymentProvider**: A vendor-neutral port (Stripe-style adapter) for hosted checkout, webhook verification, and subscription updates.
- **providerEventId**: The idempotency key for applying a payment-provider webhook at most once.
- **Tenant**: The ownership/isolation boundary derived from a user; all of an AgentOrg's workers share the CEO's tenant.
- **Ownership_Authz**: The existing ownership-based authorization filter (e.g. `email.userId !== userId -> 403`) applied across all pillars.
- **OTel**: OpenTelemetry observability (spans/metrics) via `@quant/observability`.
- **De-simulation**: Replacing `@simulated` stubs (crypto, AI fallback, delivery) with real production implementations.

## Requirements

### Requirement 1: OAuth2 / PKCE token-exchange hardening (Pillar 0)

**User Story:** As a security engineer, I want the OAuth2 authorization-code flow to enforce PKCE and exact-match redirect binding, so that authorization codes cannot be intercepted or replayed across clients.

#### Acceptance Criteria

1. WHEN an authorization request is received, THE Identity_Pillar SHALL bind the supplied `code_challenge` and challenge method to the issued authorization code before returning it.
2. WHEN a token-exchange request presents a `code_verifier`, THE Identity_Pillar SHALL compute the SHA-256 transform of the `code_verifier` and grant tokens only if the result equals the stored `code_challenge`.
3. IF the SHA-256 transform of the presented `code_verifier` does not equal the stored `code_challenge`, THEN THE Identity_Pillar SHALL reject the token-exchange request and issue no tokens.
4. WHEN a token-exchange request is received, THE Identity_Pillar SHALL require that the request `redirect_uri` equals the `redirect_uri` bound at authorization time, and SHALL reject the exchange on mismatch.
5. WHEN an authorization request supplies a `redirect_uri`, THE Identity_Pillar SHALL accept it only if it is an exact match of a value in the client's Redirect_Allowlist, and SHALL reject any non-allowlisted `redirect_uri`.
6. WHEN an authorization code is successfully exchanged, THE Identity_Pillar SHALL mark that code consumed so that a second exchange of the same code is rejected.

### Requirement 2: KMS-backed JWT secrets, rotation, and real cryptography (Pillar 0)

**User Story:** As a security engineer, I want all signing and encryption to use KMS-backed real cryptographic keys with rotation, so that no hardcoded secret or simulated crypto path exists in production.

#### Acceptance Criteria

1. WHEN the system signs or verifies a JWT, THE Identity_Pillar SHALL resolve the JWT_Secret from the KMS at runtime rather than from any hardcoded or static literal value.
2. WHEN a signing key is rotated, THE Identity_Pillar SHALL continue to verify tokens issued under the previous key until those tokens expire while signing new tokens with the rotated key.
3. THE SuperHub SHALL route all signing and encryption operations through `@quant/encryption` real cryptographic primitives, and SHALL leave no reachable `@simulated` cryptography code path in production.
4. WHEN a domain private key or other secret is persisted, THE SuperHub SHALL store only a KMS-resolvable reference and SHALL NOT store the private key material in plaintext.
5. WHEN PGP email encryption or an E2EE route performs a cryptographic operation, THE SuperHub SHALL use real key material resolved via the KMS.

### Requirement 3: Fail-closed AI engine (Pillar 0 / cross-cutting)

**User Story:** As a platform operator, I want the AI engine to fail closed in production, so that no feature silently returns fabricated mock responses.

#### Acceptance Criteria

1. WHEN an AI inference request is made in production and the configured provider call cannot be completed, THE AI_Engine SHALL return an explicit error and SHALL NOT return a mock or simulated response.
2. THE SuperHub SHALL source AI provider credentials from configuration at runtime so that AI features execute against a real provider.
3. WHERE the runtime environment is production, THE AI_Engine SHALL have all silent mock-response fallback paths disabled.

### Requirement 4: Outbound email delivery pipeline (Pillar 1)

**User Story:** As an email user, I want my composed messages to be really delivered and tracked, so that recipients receive authenticated mail and I can see its delivery state.

#### Acceptance Criteria

1. WHEN a user enqueues a valid draft they own for sending, THE Outbound_Delivery_Pipeline SHALL create a durable queued job and set the email Delivery_State to `queued`.
2. IF a user attempts to enqueue an email whose owner is not that user, THEN THE Outbound_Delivery_Pipeline SHALL reject the request and create no delivery job.
3. WHEN the delivery worker processes a queued send, THE Outbound_Delivery_Pipeline SHALL DKIM-sign the message, resolve recipient MX records, and attempt SMTP transmission.
4. WHEN the delivery worker completes processing a send, THE Outbound_Delivery_Pipeline SHALL record a terminal or deferred Delivery_State for each recipient.
5. WHILE an email is being delivered, THE Outbound_Delivery_Pipeline SHALL only advance each recipient's Delivery_State toward a terminal state (queued → sent/deferred → bounced/delivered) and SHALL NOT regress a recipient to an earlier state.

### Requirement 5: Inbound email ingest and authentication (Pillar 1)

**User Story:** As an email user, I want incoming mail authenticated, threaded, and routed, so that my inbox is trustworthy and organized.

#### Acceptance Criteria

1. WHEN a raw inbound message arrives from `smtp-inbound`, THE Inbound_Ingest_Adapter SHALL evaluate SPF, DKIM, and DMARC and record the combined AuthVerdict on the resulting email.
2. WHEN an inbound message passes authentication, THE Inbound_Ingest_Adapter SHALL persist the email, stitch it into the correct thread, route it to a folder, and index it.
3. IF an inbound message fails DMARC alignment, THEN THE Inbound_Ingest_Adapter SHALL quarantine the message rather than route it to the normal inbox folder.
4. THE SuperHub SHALL preserve all existing AI email intelligence capabilities (compose, reply, summarize, triage, tone-shift, follow-up, meeting-extract, attachment-summary, unsubscribe, style-learner) operating against the real AI_Engine.

### Requirement 6: QuantCode developer platform extraction and SRP boundary (Pillar 2)

**User Story:** As a system architect, I want the Git/PR/Issue/Review/CI concern extracted into its own QuantCode module, so that the mail and code domains are decoupled and independently testable.

#### Acceptance Criteria

1. THE QuantCode module SHALL expose its repo, pull-request, issue, review, branch-protection, and CI operations under the `/api/code/*` route prefix.
2. THE mail domain SHALL NOT import QuantCode services, and THE QuantCode module SHALL NOT import mail-domain services.
3. WHEN a caller pushes refs to a repository, THE QuantCode module SHALL require the caller to hold write scope on that repository and SHALL evaluate Branch_Protection rules before any protected ref advances.
4. WHEN merge eligibility for a pull request is evaluated, THE QuantCode module SHALL return a merge decision that accounts for CI status, branch-protection rules, and review verdicts.
5. WHEN a pipeline is triggered for a ref, THE QuantCode module SHALL create a PipelineRun and expose its run status.

### Requirement 7: Autonomous coding agent — bounded, branch-isolated, human-gated (Pillar 3)

**User Story:** As a developer, I want an autonomous agent that plans, edits, opens PRs, and iterates on CI within strict bounds, so that I get useful automation without unsafe or unbounded changes.

#### Acceptance Criteria

1. WHEN a user starts an agent task on a repository, THE Agent_Runtime SHALL require the user to hold write scope on that repository and SHALL require an available budget before creating an AgentSession with status `planning`.
2. WHILE an AgentSession runs, THE Agent_Runtime SHALL apply every file mutation only on an isolated agent branch and SHALL NEVER write to the repository's default branch.
3. WHILE an AgentSession runs, THE Agent_Runtime SHALL keep the session iteration count less than or equal to the session `maxIterations`, and IF the iteration count reaches `maxIterations`, THEN THE Agent_Runtime SHALL stop the session.
4. WHEN the Agent_Runtime performs a step, THE Agent_Runtime SHALL append an auditable transcript entry recording the action.
5. WHEN an AgentSession produces changes ready to land, THE Agent_Runtime SHALL land them only through a pull request that requires explicit human approval before merge.
6. WHEN the Agent_Runtime executes a tool, THE Agent_Runtime SHALL confine all side effects to the QuantCode module's scoped tool APIs.

### Requirement 8: RAG-grounded, cited, authz-scoped answer engine (Pillar 4)

**User Story:** As a user, I want answers grounded in my own email and repos with citations, so that I can trust the answer and never see another user's data.

#### Acceptance Criteria

1. WHEN a user asks a question, THE Answer_Engine SHALL restrict retrieval to documents the asking user owns and SHALL NOT retrieve documents owned by any other user.
2. WHEN the Answer_Engine returns a Grounded_Answer, THE Answer_Engine SHALL attach at least one Citation for every claim in the answer text.
3. IF retrieval yields no evidence for a question, THEN THE Answer_Engine SHALL return a "no answer found" result rather than a fabricated answer.
4. WHEN the Retriever returns ranked chunks, THE Answer_Engine SHALL include source provenance (emailId, repo + path, or url) on each returned chunk.
5. WHEN answering, THE Answer_Engine SHALL fuse vector (Qdrant/pgvector) and keyword (Meilisearch) retrieval results before grounded generation.

### Requirement 9: Company OS goal intake and autonomous org planning (Company OS)

**User Story:** As a CEO, I want to state a goal in natural language and have an agent org planned for me, so that the right roles and headcount are assembled automatically.

#### Acceptance Criteria

1. WHEN an authenticated tenant owner submits a goal, THE Company_OS SHALL create an AgentOrg with status `planning` bound to that CEO's tenant.
2. IF the goal is submitted by a caller who is not an authenticated tenant owner, THEN THE Company_OS SHALL reject the intake and create no AgentOrg.
3. WHEN the Company_OS plans an org, THE Company_OS SHALL produce a plan listing role, count, default model, tool scope, and budget share per role.
4. WHEN an org plan is produced, THE Company_OS SHALL ensure the sum of the per-role budget shares is less than or equal to the AgentOrg budget cap.

### Requirement 10: Workspace provisioning and agent fleet spawning (Company OS)

**User Story:** As a CEO, I want a workspace provisioned and a fleet of agents spawned, so that the planned org has a repo to work in and workers to do the work.

#### Acceptance Criteria

1. WHEN the Company_OS provisions a workspace by attaching an existing repo, THE Company_OS SHALL require the CEO to hold write scope on that repo.
2. WHEN the Company_OS provisions a workspace, THE Company_OS SHALL ensure the repo exists (created or attached) with a default branch and branch protection configured.
3. WHEN the Company_OS spawns the fleet, THE Company_OS SHALL provision each AgentWorker a unique Mailbox_Identity scoped to the org's tenant.
4. WHEN the Company_OS spawns the fleet, THE Company_OS SHALL create a worker count matching the approved plan.
5. WHERE the CEO overrides the model for a role or an individual worker, THE Company_OS SHALL assign that overridden model, otherwise THE Company_OS SHALL assign the role's default model.
6. IF a requested model is one the AI_Engine cannot route to, THEN THE RoleCatalog SHALL reject the model selection and fail closed.

### Requirement 11: Tenant-scoped agent mailbox identities (Company OS)

**User Story:** As a security engineer, I want every agent to be a tenant-scoped mailbox identity, so that an agent can never read human mail or other tenants' data.

#### Acceptance Criteria

1. WHEN an agent mailbox is created, THE Company_OS SHALL assign a unique, agent-namespaced address scoped to the org's single tenant.
2. WHEN an agent mailbox is created, THE Company_OS SHALL grant the identity only agent-bus scope plus the worker's tool scope.
3. THE Company_OS SHALL ensure an agent identity's scope can never read the CEO's human inbox or any other tenant's mail or repositories.
4. WHEN an AgentWorker is retired, THE Company_OS SHALL revoke its tokens and archive its mailbox for audit.

### Requirement 12: Email-as-message-bus agent coordination (Company OS)

**User Story:** As a CEO, I want agents to coordinate over real QuantMail email, so that every handoff is durable, observable, and auditable in the same inbox model.

#### Acceptance Criteria

1. WHEN an agent sends a bus message, THE agent-bus SHALL deliver it through the normal mail pipeline, carry the reserved `agent-bus` label and the `X-Quant-Agent-Org` header set to the org id, and thread it to the work item.
2. WHEN a bus message is constructed, THE agent-bus SHALL include the `X-Quant-Agent-From-Role` and `X-Quant-Agent-Msg-Type` headers identifying the sender role and message type.
3. IF a bus message's sender or any recipient is not an agent identity within the same org and tenant, THEN THE agent-bus SHALL reject the message.
4. WHEN agents exchange artifacts (diffs, plans, logs, reports), THE agent-bus SHALL carry them as email attachments threaded to the work item.
5. WHEN the Company_OS supervises an org, THE Company_OS SHALL observe the `agent-bus` label to route messages to addressed workers and detect stalls, loops, and budget pressure.

### Requirement 13: Org supervision, budget and iteration caps (Company OS)

**User Story:** As a CEO, I want the orchestrator to enforce hard budget and iteration ceilings, so that an autonomous org can never overspend or loop forever.

#### Acceptance Criteria

1. WHILE an AgentOrg runs, THE Company_OS SHALL keep the org `costSpent` less than or equal to the org `budgetCap`.
2. WHILE an AgentOrg runs, THE Company_OS SHALL keep the org `totalIterations` less than or equal to the org `maxIterations`.
3. IF an AgentOrg reaches its budget cap or iteration cap, THEN THE Company_OS SHALL pause or retire the affected workers rather than continue spending.
4. WHEN the Company_OS detects a stalled, looping, or over-budget worker, THE Company_OS SHALL pause or retire that worker.

### Requirement 14: Human approval gates for sensitive actions (Company OS)

**User Story:** As a CEO, I want sensitive actions to require my approval, so that irreversible operations never happen autonomously.

#### Acceptance Criteria

1. WHEN an AgentOrg reaches a mergeable outcome, THE Company_OS SHALL keep the merge pending until the CEO explicitly approves it.
2. WHEN the Company_OS reports completion, THE Company_OS SHALL keep merges and sensitive Gmail actions pending until the CEO approves them.
3. WHEN any sensitive action (a merge, or an external send above the policy threshold) is recorded, THE Company_OS SHALL record it in the audit trail with `approvedByHuman` set to true only when a human approved it.

### Requirement 15: Autonomous Gmail handler with policy guardrails (Company OS)

**User Story:** As a CEO, I want an opt-in autonomous inbox handler bounded by an explicit policy, so that my real inbox is managed without unsafe automated sends.

#### Acceptance Criteria

1. WHEN the Gmail_Handler proposes inbox actions, THE Gmail_Handler SHALL classify each proposed action's sensitivity using the existing AI email services.
2. WHEN the Gmail_Handler executes an action whose sensitivity is at or below the InboxAutomationPolicy approval threshold, THE Gmail_Handler SHALL execute it and respect the undo-send window.
3. IF a proposed action's sensitivity exceeds the InboxAutomationPolicy approval threshold, THEN THE Gmail_Handler SHALL require explicit human approval before executing it.
4. IF a proposed send or reply targets an external recipient and its sensitivity exceeds the approval threshold, THEN THE Gmail_Handler SHALL require human approval.
5. WHEN the Gmail_Handler executes any action, THE Gmail_Handler SHALL record it in the audit log.
6. WHERE the InboxAutomationPolicy is not enabled for a user, THE Gmail_Handler SHALL take no autonomous action on that user's inbox.

### Requirement 16: Credit wallet, append-only ledger, and balance invariants (Billing)

**User Story:** As a finance/platform operator, I want every wallet balance to equal the sum of an append-only ledger and never go negative, so that credit accounting is auditable and correct.

#### Acceptance Criteria

1. THE CreditWallet SHALL derive its authoritative balance as the sum of all CreditLedgerEntry amounts for that owner.
2. THE CreditWallet SHALL keep the total balance greater than or equal to zero at all times.
3. WHEN any ledger operation occurs, THE CreditWallet SHALL append a new immutable CreditLedgerEntry and SHALL NOT mutate or delete existing entries.
4. WHEN a balance is read, THE CreditMeter SHALL require that the caller owns the wallet or is a tenant admin, enforced by Ownership_Authz.
5. WHEN credits are granted via purchase, monthly inclusion, refund, or adjustment, THE CreditWallet SHALL append one credit entry increasing the balance by exactly the granted amount.

### Requirement 17: Daily free allowance with idempotent UTC reset (Billing)

**User Story:** As a user, I want a recurring daily free credit allowance that resets once per UTC day, so that I get predictable free usage without rollover or double-granting.

#### Acceptance Criteria

1. WHEN the daily grant runs for an owner on a given UTC day, THE CreditWallet SHALL append exactly one `daily_grant` ledger entry sized to the owner's plan daily allowance.
2. IF a `daily_grant` entry already exists for an owner on a given UTC day, THEN THE CreditWallet SHALL not append a second daily grant for that owner and UTC day.
3. WHEN a new UTC day begins, THE CreditWallet SHALL reset the daily allowance without rolling over the previous day's unused daily remainder.

### Requirement 18: Metered usage gate — check, reserve, settle, fail closed (Billing)

**User Story:** As a platform operator, I want every metered action to check entitlements and reserve credits before executing and settle against actual cost afterward, so that usage is always paid for and never double-charged.

#### Acceptance Criteria

1. WHEN a metered action is requested, THE CreditMeter SHALL estimate its credit cost from the active PricingRule for that action kind before the action executes.
2. WHEN a metered action is requested, THE CreditMeter SHALL verify the owner's PlanService entitlements permit the action kind, and IF the entitlements do not permit it, THEN THE CreditMeter SHALL reject the action with an upgrade-required signal.
3. IF the owner's available balance is less than the estimated cost, THEN THE CreditMeter SHALL reject the action with an out-of-credits signal and SHALL NOT allow the action to execute.
4. WHEN the CreditMeter reserves credits, THE CreditMeter SHALL record the reservation keyed by the action's `actionKey` so that replaying the same `actionKey` does not create a second reservation.
5. THE CreditMeter SHALL NOT allow any metered action to proceed without a successful prior reservation.
6. WHEN an action completes, THE CreditMeter SHALL settle the reservation against the measured actual cost, refunding or charging the delta, and SHALL treat a second settlement of the same reservation as a no-op.
7. WHEN credits are debited, THE CreditWallet SHALL consume them in the fixed order daily allowance, then plan-included monthly credits, then purchased top-up balance.

### Requirement 19: Plans, entitlements, and rate limits (Billing)

**User Story:** As a user, I want plan tiers that set my allowances, rate limits, and unlocked features, so that my entitlements are clear and enforced ecosystem-wide.

#### Acceptance Criteria

1. WHEN entitlements are resolved for an owner, THE PlanService SHALL return the daily allowance, monthly included credits, rate limits, unlocked models, and unlocked features of the owner's currently active Plan_Tier (Free, Pro, Team, or Enterprise).
2. WHEN a metered action would exceed a plan rate limit, THE CreditMeter SHALL reject the action with an upgrade-required signal.
3. WHEN an owner changes plan, THE PlanService SHALL record the upgrade or downgrade and apply the new daily allowance from the next daily reset, or immediately on an upgrade.
4. THE PlanService SHALL enforce at most one active or trialing subscription per owner at a time.

### Requirement 20: Payments, signed webhooks, and idempotent grants (Billing)

**User Story:** As a finance operator, I want payments handled through a vendor-neutral provider with signed, at-most-once webhooks, so that credit grants and subscription changes are correct and no card data touches our system.

#### Acceptance Criteria

1. WHEN an owner initiates a credit top-up or subscription purchase, THE BillingService SHALL return a provider-hosted checkout handle so that no card data is processed by the SuperHub.
2. WHEN a payment-provider webhook is received, THE BillingService SHALL verify the provider signature, and IF the signature is invalid, THEN THE BillingService SHALL reject the event and grant no credits.
3. WHEN a verified `payment_success` webhook is processed, THE BillingService SHALL grant the purchased credits or activate/renew the subscription, applying the event at most once per `providerEventId`.
4. WHEN a verified `payment_failure` webhook is processed, THE BillingService SHALL mark the PaymentRecord failed and grant no credits.
5. WHEN a subscription change (upgrade, downgrade, cancel, resume) is requested, THE BillingService SHALL apply it so that PlanService entitlements reflect the change at the effective boundary.

### Requirement 21: Company OS budgets denominated in and backed by credits (Billing / Company OS)

**User Story:** As a CEO, I want my agent org's budget denominated in real credits backed by my wallet, so that an org can never spend beyond my available balance.

#### Acceptance Criteria

1. WHEN an AgentOrg is provisioned, THE Company_OS SHALL reserve the org `budgetCap` in credits from the CEO's CreditWallet, and IF the CEO's reservable balance is less than the requested cap, THEN THE Company_OS SHALL reject provisioning.
2. WHILE an AgentOrg runs, THE Company_OS SHALL keep the org's total credit spend less than or equal to the CEO-funded `budgetCap`.
3. WHEN worker budgets are assigned, THE Company_OS SHALL ensure the sum of worker budget shares does not exceed the org `budgetCap`.

### Requirement 22: Tenant and ownership authorization isolation (cross-cutting NFR)

**User Story:** As a security engineer, I want ownership/tenant authorization enforced on every query and action across all layers, so that no user or agent can ever access another owner's data.

#### Acceptance Criteria

1. WHEN any pillar performs a data query or tool action, THE SuperHub SHALL filter it by the requesting principal's ownership so that data owned by another user or tenant is never returned or acted upon.
2. IF a principal requests a resource it does not own and is not authorized to administer, THEN THE SuperHub SHALL deny the request.
3. THE Answer_Engine and Agent_Runtime SHALL inherit the same ownership authorization filter used by the mail domain.

### Requirement 23: Auditability and observability (cross-cutting NFR)

**User Story:** As an operator, I want every agent action audited and every pillar instrumented, so that the system is traceable and observable.

#### Acceptance Criteria

1. WHEN an agent bus email or an agent/Gmail-handler action occurs, THE SuperHub SHALL record it in the agent action audit trail.
2. WHEN a delivery, agent step, or retrieval operation runs, THE SuperHub SHALL emit OTel spans for that operation.
3. WHEN a sensitive action is recorded in the audit trail, THE SuperHub SHALL record whether a human approved it.

### Requirement 24: Phased rollout gating and incremental build (cross-cutting NFR)

**User Story:** As a delivery lead, I want phases gated so that security comes first and each phase builds on the last, so that no capability ships on an untrustworthy foundation.

#### Acceptance Criteria

1. THE SuperHub SHALL treat Phase 1 (security/trust foundation: KMS-backed rotating JWT secrets, real cryptography, PKCE verification, exact-match redirect handling, fail-closed AI) as a hard gate that must be satisfied before any later pillar ships.
2. WHEN any later pillar is delivered, THE SuperHub SHALL build incrementally on the existing codebase and shared packages and SHALL NOT introduce a greenfield rewrite or a parallel engine.
3. WHEN a phase is delivered, THE SuperHub SHALL satisfy that phase's exit criteria before a dependent phase is enabled.
