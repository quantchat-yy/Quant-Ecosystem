# Tasks

## Task 1: Camera Module — Core Viewfinder & Capture

- [ ] 1.1 Create `app/(camera)/page.tsx` with getUserMedia initialization, permission handling, and viewfinder canvas rendering at 30fps minimum
- [ ] 1.2 Implement `Viewfinder.tsx` component with canvas-based video stream rendering pipeline
- [ ] 1.3 Implement `CaptureButton.tsx` with photo capture (tap → JPEG blob) and video recording (long-press > 500ms, max 60s)
- [ ] 1.4 Implement `CameraControls.tsx` with flip-camera (front/rear switch within 500ms) and flash toggle (torch/screen flash)
- [ ] 1.5 Implement permission-denied graceful degradation with inline error message and browser settings link
- [ ] 1.6 Write unit tests for camera state machine transitions (photo capture, recording start/stop, flip, flash)

## Task 2: AR Lenses on Live Viewfinder

- [ ] 2.1 Implement `ARLensCarousel.tsx` horizontally scrollable lens picker with minimum 7 lens options
- [ ] 2.2 Integrate MediaPipe/TensorFlow.js face mesh detection into the canvas rendering loop at 24fps minimum
- [ ] 2.3 Implement lens application pipeline: face mesh → overlay positioning → canvas composite within 200ms of selection
- [ ] 2.4 Implement lens baking into captured media (photo/video output includes lens overlay)
- [ ] 2.5 Implement beauty mode filter with real-time skin smoothing and exposure adjustment
- [ ] 2.6 Implement face detection failure fallback (static lens position without crash)
- [ ] 2.7 Write property test: AR lens compositing modifies output frame (Property 2)

## Task 3: Reels Feed — Vertical Video Player

- [ ] 3.1 Create `app/(reels)/page.tsx` with full-screen vertical video player and swipe gesture handling (up/down, 300ms transitions)
- [ ] 3.2 Implement `ReelPlayer.tsx` with HLS/MP4 playback, auto-play on viewport entry, pause on exit
- [ ] 3.3 Implement pre-buffering logic: buffer next 2 reels while current plays
- [ ] 3.4 Implement `ReelOverlay.tsx` displaying creator username, caption, like/comment/share counts
- [ ] 3.5 Implement infinite scroll: fetch next page when within 3 items of loaded set end
- [ ] 3.6 Implement optimistic like (increment immediately, persist via API within 2s)
- [ ] 3.7 Implement comment bottom sheet and share sheet UI
- [ ] 3.8 Implement duet mode: split-screen recording alongside existing reel
- [ ] 3.9 Integrate @quant/ranking for algorithmic feed ordering by engagement, watch time, social graph
- [ ] 3.10 Write property tests: visibility controls playback (Property 4), overlay fields (Property 5), ranking order (Property 7), infinite scroll trigger (Property 8)

## Task 4: Reel Upload & Creation

- [ ] 4.1 Implement `ReelEditor.tsx` with video trim (5-60s), text overlays, and cover frame selection
- [ ] 4.2 Implement `ReelUploader.tsx` with background upload, progress indicator, and navigation-safe upload
- [ ] 4.3 Implement upload retry with exponential backoff (1s, 2s, 4s) on network failure, max 3 retries
- [ ] 4.4 Implement client-side validation: reject files > 100MB or duration > 60s before upload
- [ ] 4.5 Create backend `routes/reels.ts` with POST /reels endpoint for reel creation in Persistence_Layer
- [ ] 4.6 Ensure published reels are discoverable in feed within 30 seconds of upload completion
- [ ] 4.7 Write property tests: retry backoff (Property 9), size/duration validation (Property 10)

## Task 5: AI Avatar Generation

- [ ] 5.1 Create `AvatarGenerator.tsx` with face photo capture/upload prompt and style picker UI
- [ ] 5.2 Create backend `routes/avatar.ts` with POST /avatar/generate endpoint using @quant/generative-media pipeline
- [ ] 5.3 Implement face detection validation: reject photos without detectable face with clear error message
- [ ] 5.4 Implement 3-variant generation (crystalline, bioluminescent, cybernetic) within 10s processing time
- [ ] 5.5 Implement avatar selection and persistence to Avatar model in database
- [ ] 5.6 Implement avatar rendering across all surfaces: chat bubbles, profile headers, story rings, reaction animations, friend list, map pins
- [ ] 5.7 Implement animated reaction emotions (happy, sad, surprised, angry, love) for avatar
- [ ] 5.8 Implement avatar propagation to all surfaces within 5 seconds of update
- [ ] 5.9 Write property tests: 3 variants produced (Property 11), all surfaces render (Property 12), all emotions have animations (Property 13)

## Task 6: WebRTC Video & Audio Calls

- [ ] 6.1 Implement backend LiveKit room creation and participant token generation in `routes/calls.ts`
- [ ] 6.2 Implement `IncomingCallOverlay.tsx` with accept/decline buttons and caller avatar display
- [ ] 6.3 Implement `CallScreen.tsx` with remote video full-screen + local PiP, call controls (mute, camera, speaker, end)
- [ ] 6.4 Implement mute toggle (audio track mute within 100ms) and camera toggle (video track disable + placeholder)
- [ ] 6.5 Implement call end: disconnect participants, destroy LiveKit room, show call-ended screen with duration
- [ ] 6.6 Implement auto-reconnection on WebRTC drop (up to 15s attempts before connection-lost message)
- [ ] 6.7 Implement elapsed call timer updated every second with correct HH:MM:SS formatting
- [ ] 6.8 Write property test: call timer format correctness (Property 14)

## Task 7: Group Video Calls & Screen Share

- [ ] 7.1 Implement `GroupCallGrid.tsx` with responsive grid layout adapting to 1-8 participants
- [ ] 7.2 Implement focus mode: active speaker large + thumbnail row when > 4 participants
- [ ] 7.3 Implement active speaker detection with border highlight within 200ms of voice activity
- [ ] 7.4 Implement participant leave/join with smooth 300ms grid re-arrangement animation
- [ ] 7.5 Implement `ScreenShareView.tsx` with getDisplayMedia invocation, shared screen as primary feed
- [ ] 7.6 Implement screen share stop (revert to standard layout within 500ms) and persistent sharing indicator
- [ ] 7.7 Implement getDisplayMedia permission-denied handling (info message, maintain call)
- [ ] 7.8 Write property test: grid layout adapts to participant count (Property 15)

## Task 8: Snap Map with Mapbox

- [ ] 8.1 Create `app/(map)/page.tsx` with Mapbox GL JS initialization, user location centering, and pulsing blue dot
- [ ] 8.2 Implement `FriendPin.tsx` with AI avatar as pin icon, updated every 30s via @quant/realtime WebSocket
- [ ] 8.3 Implement friend pin tap popup card (name, avatar, last active, open-chat button)
- [ ] 8.4 Implement animated friend pin movement to new position over 500ms
- [ ] 8.5 Implement `GhostModeToggle.tsx`: stop broadcasting location, hide pin from friends within 5s
- [ ] 8.6 Implement location broadcast every 30s when ghost mode disabled
- [ ] 8.7 Implement `HeatmapOverlay.tsx` for Explore tab with activity density visualization
- [ ] 8.8 Implement pinch-to-zoom, pan gestures, and animated zoom transitions at 60fps
- [ ] 8.9 Implement geolocation-denied fallback (default location + enable-permission banner)
- [ ] 8.10 Write property test: ghost mode prevents broadcast (Property 16)

## Task 9: Backend Persistence (Prisma + PostgreSQL)

- [ ] 9.1 Define complete Prisma schema with all models (User, Conversation, Message, Media, Call, Reel, Story, FriendLocation, Notification, Streak, Avatar, GameBadge, Memory, ScheduledMessage, ChatTheme, PushSubscription)
- [ ] 9.2 Add indexes on all foreign keys and frequently queried fields (userId, conversationId, createdAt)
- [ ] 9.3 Create initial Prisma migration and verify migration runs without data loss
- [ ] 9.4 Replace all in-memory stores in messages, conversations, media, calls, encryption, federation, and ar-lenses routes with Prisma ORM queries
- [ ] 9.5 Implement atomic conversation creation using Prisma $transaction (conversation + participants in single transaction)
- [ ] 9.6 Implement connection pooling configuration (min 5, max 20 connections per instance)
- [ ] 9.7 Implement withRetry utility for transient DB errors (3 retries, exponential backoff, then 503)
- [ ] 9.8 Verify message write latency < 100ms and single-record lookup < 50ms under load
- [ ] 9.9 Write property tests: persistence round-trip (Property 17), atomic creation (Property 18), retry backoff (Property 19)

## Task 10: Push Notifications

- [ ] 10.1 Implement service worker registration with VAPID authentication and Web Push API subscription
- [ ] 10.2 Implement push notification dispatch for new messages (within 3s), calls (high-priority), stories, streaks
- [ ] 10.3 Implement streak-expiry warning notification (trigger when < 4 hours remaining)
- [ ] 10.4 Implement notification category settings with independent enable/disable toggles per category
- [ ] 10.5 Implement deep-link resolution: notification tap navigates to correct content (chat, call, story, reel)
- [ ] 10.6 Implement subscription expiry detection and re-registration on next app visit
- [ ] 10.7 Implement non-urgent notification batching (>5 in 2-minute window → single summary)
- [ ] 10.8 Implement foreground suppression: suppress browser push, show in-app toast instead
- [ ] 10.9 Write property tests: streak expiry notification (Property 20), category independence (Property 21), deep-link resolution (Property 22), batching (Property 23), foreground suppression (Property 24)

## Task 11: Micro-Interactions & Addiction Loops

- [ ] 11.1 Create `MicroInteractionProvider.tsx` with global gamification state (XP, level, badges, streaks, rewards)
- [ ] 11.2 Implement pull-to-refresh spring animation with haptic-like CSS vibration (400ms, Framer Motion spring tokens)
- [ ] 11.3 Implement like particle burst animation at 60fps
- [ ] 11.4 Implement streak counter logic: increment on mutual daily messages, reset on missed day
- [ ] 11.5 Implement streak milestone celebrations (7, 30, 100, 365) with full-screen animation and badge award
- [ ] 11.6 Implement variable-ratio reward engine (1-in-5 to 1-in-15 random reward on routine actions)
- [ ] 11.7 Implement notification red dot badges on nav items within 500ms of WebSocket unread event
- [ ] 11.8 Implement typing indicator with 3 pulsing dots animation
- [ ] 11.9 Implement FOMO ring gradient animation on unviewed story circles at 60fps
- [ ] 11.10 Implement streak urgency (fire emoji pulsing + urgency coloring when < 4h remaining)
- [ ] 11.11 Implement XP system: award points per action (message:10, story:25, reel:50, streak:15/day), display level bar
- [ ] 11.12 Implement badge unlock full-screen animation (2 seconds) with sound-ready event emission
- [ ] 11.13 Implement CSS haptic feedback (50ms scale transform) on all interactive elements
- [ ] 11.14 Write property tests: streak calculation (Property 25), milestone triggers (Property 26), reward rate bounds (Property 27), FOMO ring (Property 28), streak urgency (Property 29), XP mapping (Property 30)

## Task 12: Quant AI Agent

- [ ] 12.1 Implement AI auto-reply mode: generate contextual responses using user's communication style via @quant/ai, send within 5s
- [ ] 12.2 Implement conversation summary: analyze last 50 messages, produce concise summary within 3s
- [ ] 12.3 Implement reply suggestions: display up to 3 suggestions above keyboard, update as user types
- [ ] 12.4 Implement scheduled message storage and delivery worker (check every 30s, deliver within 60s of scheduled time)
- [ ] 12.5 Implement AI notification management: categorize, prioritize, batch low-priority into daily digest
- [ ] 12.6 Implement message translation via @quant/ai (auto-detect source, translate to preferred language within 2s)
- [ ] 12.7 Implement content creation assistance: generate captions, story text, reel descriptions from context/media
- [ ] 12.8 Implement AI-generated label on all AI content (isAIGenerated flag + visible "AI-generated" badge)
- [ ] 12.9 Implement auto-reply disable: immediately stop generation, cancel queued unsent AI responses
- [ ] 12.10 Write property tests: suggestions max 3 (Property 31), scheduled delivery tolerance (Property 32), AI label invariant (Property 33)

## Task 13: Snapchat Parity — Memories & Spotlight

- [ ] 13.1 Create `app/(memories)/page.tsx` with date-sorted grid of saved photos, videos, stories, reels
- [ ] 13.2 Implement memory save (snap/story → vault in Persistence_Layer) and full-media display with re-share/send/download
- [ ] 13.3 Implement memory search by date range, location, and caption text
- [ ] 13.4 Implement memory delete with 5-second undo window (soft delete → permanent after 5s)
- [ ] 13.5 Create `app/(spotlight)/page.tsx` with curated feed ranked by engagement (likes, shares, watch-through rate)
- [ ] 13.6 Implement Spotlight ranking refresh every 15 minutes
- [ ] 13.7 Implement "Featured" badge on spotlight reels and push notification to creator
- [ ] 13.8 Integrate @quant/recommendation for personalized Spotlight content
- [ ] 13.9 Write property tests: memories date order (Property 34), memory search (Property 35), spotlight ranking (Property 7)

## Task 14: Snapchat Parity — Chat Themes, Games, Disappearing Messages

- [ ] 14.1 Implement `ChatThemePicker.tsx` with 10+ themes including 3 alien-aesthetic themes (nebula, quantum void, bioluminescent cave)
- [ ] 14.2 Implement theme application within 200ms: background gradient, bubble colors, font style
- [ ] 14.3 Implement theme persistence per-conversation and sync to all participants via WebSocket
- [ ] 14.4 Implement `GameLauncher.tsx` with game list and full-screen iframe overlay for mini-games
- [ ] 14.5 Implement game end handler: post scores to chat as system message, award XP to participants
- [ ] 14.6 Implement game load timeout (10s) with error message and retry option
- [ ] 14.7 Expose games SDK hook interface via @quant/cross-app-gaming package
- [ ] 14.8 Implement disappearing message timer configuration (5s, 10s, 30s, 1min, 5min, 24h) per conversation
- [ ] 14.9 Implement disappearing message deletion after timer expires post-view, with countdown animation
- [ ] 14.10 Implement screenshot detection notification (notify sender within 2s of recipient screenshot)
- [ ] 14.11 Write property tests: theme sync (Property 36), game XP/scores (Property 37), disappear timer (Property 38), expired deletion (Property 39)

## Task 15: Performance & Animation Standards

- [ ] 15.1 Configure Framer Motion spring-physics animation curves from @quant/brand spring tokens across all transitions
- [ ] 15.2 Implement page transition animations completing within 300ms
- [ ] 15.3 Implement CSS haptic-like feedback (50ms scale transforms) on all interactive elements via MicroInteractionProvider
- [ ] 15.4 Implement skeleton loading states with shimmer animation for all loading content
- [ ] 15.5 Optimize camera first-frame render to under 1 second from navigation (excluding permission dialogs)
- [ ] 15.6 Write property test: haptic feedback on interactive elements (Property 40)

## Task 16: Real-Time WebSocket Infrastructure

- [ ] 16.1 Implement persistent WebSocket connection per client session via @quant/realtime with JWT authentication on connect
- [ ] 16.2 Implement real-time event delivery for all channels: messages, typing, presence, location, calls, notifications, streaks
- [ ] 16.3 Implement auto-reconnection within 3 seconds on disconnect with exponential backoff
- [ ] 16.4 Implement fallback to HTTP long-polling for critical events (messages, calls) after 5 failed reconnect attempts
- [ ] 16.5 Implement multiplexed event channels (chat, calls, map, notifications) over single WebSocket connection
- [ ] 16.6 Implement degraded-connectivity indicator UI when in long-poll fallback mode
- [ ] 16.7 Write property tests: all event types delivered (Property 41), multiplexed channels (Property 42)
