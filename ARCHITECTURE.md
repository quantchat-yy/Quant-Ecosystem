# Architecture Decision Record

## Decision: Monolith-per-App

**Status:** Accepted (Phase 18)
**Date:** 2025-05-27
**Context:** The repository contains 13 frontend apps, 46 shared packages, and 17 backend services. Of the 17 services, 10 are health-endpoint-only stubs with no domain logic. All real backend logic lives in `apps/*/backend/`.

## Summary

Each app owns its own backend co-located at `apps/<app-name>/backend/`. Shared infrastructure workers live in `services/`. There are no per-app microservices.

## Architecture Layers

```
apps/<app>/src/          - Frontend (React, Next.js)
apps/<app>/backend/      - App-specific backend (routes, services, tests)
packages/                - Shared libraries (auth, database, AI, realtime, etc.)
services/                - Infrastructure workers only (not per-app APIs)
```

## Rationale

1. **Simplicity:** Co-located frontend + backend reduces deployment complexity and cross-repo coordination.
2. **Developer experience:** A developer working on quantmail touches `apps/quantmail/` for both frontend and backend changes.
3. **Shared packages:** Cross-cutting concerns (auth, database, AI, realtime, storage, queue) are in `packages/` and imported by any app.
4. **Scaling path:** When an app needs independent scaling, extract its backend into a service. This has not been needed yet.

## What services/ contains

Infrastructure workers that serve multiple apps:

| Service             | Role                                                        |
| ------------------- | ----------------------------------------------------------- |
| `ws-gateway`        | WebSocket connection multiplexer for all apps               |
| `smtp-inbound`      | SMTP server for receiving external email                    |
| `cdc-relay`         | Change-data-capture relay (DB -> event bus)                 |
| `git-server`        | Git hosting backend for QuantMail-Git                       |
| `search-indexer`    | Kafka consumer that indexes content into Meilisearch/Qdrant |
| `moderation-worker` | BullMQ consumer for async content moderation                |
| `ci-runner`         | BullMQ consumer for CI job execution                        |

## Stub services (pending removal)

The following 10 services contain only a health endpoint and no domain logic. They exist from an earlier architecture exploration and will be removed:

- ads-api, ai-api, chat-api, edits-api, identity, mail-api, max-api, neon-api, sync-api, tube-api

Their logic either already lives in `apps/*/backend/` or will be built there per the monolith-per-app pattern.

## Cross-app Communication

- **Synchronous:** Apps import shared packages directly (`@quant/auth`, `@quant/database`, etc.)
- **Asynchronous:** Events flow through the CDC relay and BullMQ queues
- **Real-time:** WebSocket connections go through `ws-gateway`
- **Search:** Content indexed via `search-indexer`, queried via `@quant/search` package

## Future Considerations

- **Federation (Phase 31):** ActivityPub/Matrix bridges will be services, not app backends
- **ML Serving (Phase 22):** Triton/BentoML will be a service for model inference
- **i18n (Phase 26):** Will be a shared package, not a service
