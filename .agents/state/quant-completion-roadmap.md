# Quant Ecosystem — Completion Roadmap (Phases 83+)

Authored from the deep integration & realness audit (`.agents/state/quant-integration-audit.md`).
These phases take the ecosystem from "compiles + unit-tests pass" to a Meta/Google-grade,
end-to-end product. They are sequenced so each unblocks the next. Kiro executes them
autonomously, one phase per PR.

> **Meta-pattern being fixed:** real backends/engines/UIs that were never *connected*.
> The work is overwhelmingly **wiring + de-stubbing**, not rewrites.

## Sequenced phases

| Phase | Title | Class | Why it's here |
|---|---|---|---|
| **83** | Runtime Foundation Wiring | 🔴 P0 | Prisma never injected, auth never enforced, proxy ports misaligned → no app runs end-to-end. Unblocks ALL feature work. |
| **84** | Deployability | 🔴 P0 | Only `ws-gateway` ships; 12 app backends + 7 services have no container/Helm/CI. |
| **85** | Buildable Frontends | 🔴 P1 | 6 apps (quantube/neon/max/sync/ads/edits) have orphaned React UIs with no bundler — they cannot build/run. |
| **86** | Flagship Flow Completion | 🔴 P1 | Headline actions are stubs: quantmail compose, quantdrive upload/share, quantmeet video, quantai/quantchat backend links. |
| **87** | Kill Mock-Data Screens | 🟠 P1 | 27 screens render hardcoded fixtures (`mock-debt.csv`) instead of live APIs. |
| **88** | Wire Cross-Cutting Engines | 🟠 P1 | notifications, observability, performance, error-monitoring, identity-permissions, onboarding, command-palette, api-client → server-core + every app. |
| **89** | Wire Per-App Feature Engines | 🟠 P1 | 60+ orphaned engines → their target apps (payments, ar-lenses, recommendations, federation, encryption, quant-live, agent-runtime, …). |
| **90** | Replace FAKE/NAIVE Cores | 🟠 P2 | 39 simulated files (`simulated-inventory.md`): agent pilots→LLM, ML→Triton/ONNX, SFU→LiveKit, CSAM→PhotoDNA, search→Meilisearch. |
| **91** | Transactional Outbox + Search Pipeline | 🟠 P2 | App backends write `OutboxEvent`; activate cdc-relay → Kafka → search-indexer path. |
| **92** | Quality & Infra | 🟠 P2 | Coverage 30%→50% (auth/payments/security 80%), live E2E, staging cluster, validate Helm/Terraform, refresh stale status file. |

## Delivery cadence
- One phase (or tight cluster) per **new** PR (draft), authored deep enough that Kiro can execute file-by-file.
- Each phase task lives in `.agents/tasks/task-phase-<n>-<slug>/` with `task.json`, `context.json`, and granular `features/FEAT-*.json`.
- `quant-autonomous-status.json` is updated as phases complete.

## Status
- 83–86 authored in this PR (foundation batch).
- 87–92 authored in subsequent PRs as deep specs.
