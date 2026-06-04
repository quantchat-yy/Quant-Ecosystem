# 🚀 QUANT ECOSYSTEM — AUTONOMOUS KIRO NEXT-PHASES MEGA PROMPT (PHASE 43+)

> **PASTE THIS ENTIRE FILE'S CONTENT INTO AUTONOMOUS KIRO**
>
> This is the roadmap to take the Quant Ecosystem from a 444K-LOC (Phases 1-42 complete) system to a full-fledged, device-controlling, voice-first super-platform that outcompetes Google, Meta, and Apple.

---

## 0. NORTHSTAR VISION

"The user picks up their phone, says one sentence, and Quant handles everything across all apps, local devices, and cloud services in under 400ms. No apps to tap, no screens to scroll. Fully E2E encrypted, private, and local-first by default."

---

## 1. STRATEGIC PHASES: 43 TO 70

### 🟢 PHASE 43 — Project Astra Multimodal Live Loop (`@quant/quant-live`)

- **Goal:** Real-time visual + voice loop running at <400ms latency.
- **Files to Modify/Create:**
  - `packages/quant-live/src/core/multimodal-pipeline.ts`: Combines camera frame capturing (`CaptureFrame` glTF metadata) with incoming audio chunks.
  - `packages/quant-live/src/llm/multimodal-live-provider.ts`: Implements Gemini 2.0 Live API / OpenAI Realtime API via WebSockets.
  - `packages/quant-live/src/asr/stream-buffer.ts`: VAD (Voice Activity Detection) running on client (WebAssembly Silero VAD) to minimize network traffic.
- **Micro-features:**
  - "Privacy Lamp" state: UI indicator that illuminates green when local voice processing is active, and blue when data is transmitted.
  - Sub-100ms TTS pre-fetching: split output sentences on punctuation, feed to ElevenLabs/Kokoro voice model, stream chunks dynamically.

### 🟢 PHASE 44 — Device Control & Phone Replacement (`@quant/device-control`)

- **Goal:** Allow the AI agent to interact with physical device layers, removing the need for manual screen interactions.
- **Files to Modify/Create:**
  - `packages/device-control/src/android/accessibility-bridge.ts`: Generates custom Android accessibility node action payloads (click, swipe, type).
  - `packages/device-control/src/ios/shortcuts-bridge.ts`: Interface to Apple Shortcuts CLI and URL schemes.
  - `packages/device-control/src/agent/action-dispatcher.ts`: Resolves LLM intents to device actions with a strict validation layer.
  - `packages/device-control/src/security/permission-ledger.ts`: Implements 5 permission tiers. Tier 5 (destructive actions, payments, sending SMS) forces biometrics validation.
- **Micro-features:**
  - "Phone-Free Mode" launcher: overrides standard launcher on Android to show only a voice-wave view and contextual shortcuts.
  - Automated SMS/SIP Gateway: wires Twilio SIP trunking to make/receive phone calls via voice control.

### 🟢 PHASE 45 — QuantMaps Core (`@quant/maps`)

- **Goal:** Privacy-first navigation and location maps utilizing OpenStreetMap (OSM) vector tiles.
- **Files to Modify/Create:**
  - `packages/maps/src/routing/engine.ts`: Multi-modal offline routing engine (driving, walking, two-wheelers).
  - `packages/maps/src/geocoding/pelias-client.ts`: Locally cached geocoding lookup client.
  - `packages/maps/src/ai/trip-planner.ts`: Multi-stop itinerary agent.
- **Micro-features:**
  - Plus Codes navigation: support Indian short codes (e.g. `8FVP+V3 Delhi`) for precise routing.
  - Hindi language audio navigation instructions with offline TTS fallback.

### 🟢 PHASE 46 — QuantPhotos & Generative Media (`@quant/photos`)

- **Goal:** On-device magic eraser, background removal, and CLIP-based image organization.
- **Files to Modify/Create:**
  - `packages/photos/src/ml/clip-organizer.ts`: Runs local ONNX CLIP embeddings for natural language photo search (e.g., "photos of my dog in the park").
  - `packages/photos/src/editor/magic-eraser.ts`: Uses local WebGL/Wasm in-painting models for object removal.
  - `packages/generative-media/src/index.ts`: Integrates FLUX.1 and Stable Diffusion 3 via local Triton Server inference.
- **Micro-features:**
  - Indian Art style descriptors (Madhubani, Mughal, Warli) embedded directly in the prompt expansion layer.

### 🟢 PHASE 47 — QuantNotebook & Audio Overviews (`@quant/quant-notebook`)

- **Goal:** NotebookLM equivalent that creates interactive documents, summaries, and generated podcasts.
- **Files to Modify/Create:**
  - `packages/quant-notebook/src/podcasts/script-generator.ts`: Takes multiple PDF/Doc sources, maps them into a 2-host conversational transcript.
  - `packages/quant-notebook/src/podcasts/audio-synthesizer.ts`: Feeds script to multi-speaker TTS model (Kokoro/OpenAI) to output finished audio.
  - `apps/quantdocs/src/components/AudioOverviewCard.tsx`: Interactive player showing synchronized transcripts.

### 🟢 PHASE 48 — Browser Agent (Project Mariner) (`@quant/browser-agent`)

- **Goal:** Agent that navigates websites to complete forms, book tickets (e.g., IRCTC), or buy products.
- **Files to Modify/Create:**
  - `packages/browser-agent/src/planner/action-planner.ts`: Breaks down web objectives into Puppeteer/Playwright action chains.
  - `packages/browser-agent/src/dom/interactive-map.ts`: Computes coordinate mappings from screenshot vision analysis to actual DOM elements.
  - `packages/browser-agent/src/security/sandbox.ts`: Ensures agent cannot write cookies, view passwords, or execute payments without explicit OTP/Biometrics.

### 🟢 PHASE 49 — Multi-Agent Swarm (Specialist Swarm) (`@quant/agent-swarm`)

- **Goal:** Coordinating 22 specialist agents working asynchronously on multi-step tasks.
- **Specialists Catalog:**
  1. `EmailPilot`: Manages compose, smart reply, folder categorization, unsubscribe loops.
  2. `CalendarScheduler`: Resolves complex schedules, sends meeting invites, prevents double bookings.
  3. `FinancialPlanner`: Analyzes Stripe transactions, creates bills, generates invoices.
  4. `SecurityAuditor`: Monitors session records, revokes hijacked devices, enforces mTLS.
  5. `CreativeDirector`: Suggests templates for QuantEdits, generates assets via generative models.
  6. `SocialCurator`: Ranks posts on quantsync/quantneon, queues creator boost distributions.
  7. `TravelAgent`: Compares flights, books hotels, plans trips on OSM maps.
  8. `DeveloperCoPilot`: Opens PRs, runs test suites, fixes typescript build errors.
  9. `HardwareController`: Interacts with smart-home devices via Home Assistant.
  10. `WellbeingCoach`: Tracks screen time, intervenes in doom-scrolling, schedules offline breaks.
  - _(And 12 others covering documents, drive syncing, payments, translations, database pruning, and federated ActivityPub protocols)._
- **Communication Architecture:**
  - NATS JetStream event bus for agent-to-agent message passing.
  - Shared scratchpads via Yjs documents to coordinate writing.

### 🟢 PHASE 50 — Unified Identity, Sessions, and Subscription System (`@quant/auth` / `quant-economy`)

- **Goal:** Merge billing and subscriptions into a unified identity profile.
- **Files to Modify/Create:**
  - `packages/quant-economy/src/subscriptions/subscription-manager.ts`: Manages single global subscription ($4.99/mo) which removes all ads and allocates compute credits.
  - `packages/auth/src/services/session-store.ts`: Synchronizes sessions across mobile devices, web apps, and native wrappers.

---

## 2. IMMUTABLE OPERATING RULES FOR THE BUILD

1. **No Simulated Code:** All new integrations must use real libraries (`@google/generative-ai`, `playwright`, `stripe`, etc.). Mocks are permitted ONLY inside test fixtures.
2. **Strict Test Coverage:** Every package must maintain a minimum of 80% test coverage. Build pipeline must fail if tests or coverage metrics fall.
3. **Optimistic Updates:** Frontend views must update immediately, rolling back cleanly ONLY if backend API returns an error block.
4. **Conventional Commits:** Keep commit titles short and structured (`feat(maps): add routing engine`).
5. **No plain Math.random:** Use `crypto.randomBytes` or standard platform cryptography primitives.

---

## 3. GETTING STARTED (FIRST 72 HOURS PLAYBOOK)

- **Hour 0-8:** Refactor `@quant/media` video transcoder path tests to work on Windows system directories.
- **Hour 9-24:** Set up the multimodal audio pipeline in `@quant/quant-live` using the Vercel AI SDK.
- **Hour 25-48:** Build the Android Accessibility node parser in `@quant/device-control`.
- **Hour 49-72:** Write integration tests proving voice input routes successfully to device control actions.
