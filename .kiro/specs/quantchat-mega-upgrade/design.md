# Design Document: QuantChat Mega Upgrade

## Overview

This design describes the architecture for transforming QuantChat from a messaging prototype into a full-featured, engagement-optimized social media super-app spanning 10 feature domains across 20 requirements.

## Tech Stack

| Layer             | Technology                                                                                                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend          | Next.js 15 App Router, React 19, TanStack Query, Framer Motion, Tailwind CSS                                                                                                                                                                   |
| Backend           | Fastify 5, Prisma 6, PostgreSQL, LiveKit Server SDK, ioredis                                                                                                                                                                                   |
| Real-time         | WebSocket via @quant/realtime, LiveKit WebRTC                                                                                                                                                                                                  |
| ML (Client)       | MediaPipe/TensorFlow.js for face tracking                                                                                                                                                                                                      |
| ML (Server)       | @quant/generative-media, @quant/ml-runtime                                                                                                                                                                                                     |
| Maps              | Mapbox GL JS                                                                                                                                                                                                                                   |
| Push              | Web Push API, VAPID, Service Workers                                                                                                                                                                                                           |
| Monorepo Packages | @quant/ar-lenses, @quant/realtime, @quant/encryption, @quant/database, @quant/ai, @quant/notifications, @quant/maps, @quant/media, @quant/webrtc, @quant/generative-media, @quant/ml, @quant/ml-runtime, @quant/recommendation, @quant/ranking |

---

## High-Level Architecture

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Camera   │ │ Reels    │ │ Map      │ │ Chat/AI  │          │
│  │ Module   │ │ Engine   │ │ Service  │ │ Agent    │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │             │            │             │                 │
│  ┌────┴─────────────┴────────────┴─────────────┴─────┐         │
│  │          @quant/realtime (WebSocket Client)        │         │
│  └───────────────────────┬───────────────────────────┘         │
└──────────────────────────┼──────────────────────────────────────┘
                           │ WSS / HTTPS
┌──────────────────────────┼──────────────────────────────────────┐
│                    Fastify Backend                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐            │
│  │Messages │ │Reels    │ │Calls    │ │AI Agent  │            │
│  │Service  │ │Service  │ │Service  │ │Service   │            │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘            │
│       │            │           │            │                    │
│  ┌────┴────────────┴───────────┴────────────┴────┐             │
│  │         Prisma ORM / Connection Pool          │             │
│  └───────────────────────┬───────────────────────┘             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
         │PostgreSQL│ │  Redis  │ │ LiveKit │
         │   DB    │ │ (Cache) │ │ Server  │
         └─────────┘ └─────────┘ └─────────┘
```

### Component Hierarchy

```
app/
├── (camera)/
│   ├── page.tsx                    # Camera viewfinder + AR lens carousel
│   └── components/
│       ├── Viewfinder.tsx          # getUserMedia canvas renderer
│       ├── ARLensCarousel.tsx      # Horizontal lens picker
│       ├── CaptureButton.tsx       # Photo/video capture with long-press
│       └── CameraControls.tsx      # Flip, flash, timer controls
├── (reels)/
│   ├── page.tsx                    # Vertical video feed
│   └── components/
│       ├── ReelPlayer.tsx          # Full-screen video player
│       ├── ReelOverlay.tsx         # Creator info, actions overlay
│       ├── ReelEditor.tsx          # Trim, text, cover frame editor
│       └── ReelUploader.tsx        # Background upload with retry
├── (map)/
│   ├── page.tsx                    # Mapbox GL interactive map
│   └── components/
│       ├── MapCanvas.tsx           # Tile renderer with gestures
│       ├── FriendPin.tsx           # Avatar-based map marker
│       ├── HeatmapOverlay.tsx      # Activity density layer
│       └── GhostModeToggle.tsx     # Privacy toggle
├── (calls)/
│   ├── page.tsx                    # Call UI
│   └── components/
│       ├── CallScreen.tsx          # Active call with PiP
│       ├── IncomingCallOverlay.tsx  # Ring screen
│       ├── GroupCallGrid.tsx       # Multi-participant grid
│       └── ScreenShareView.tsx     # Screen share layout
├── (chat)/
│   └── components/
│       ├── AIAgentPanel.tsx        # Auto-reply, suggestions
│       ├── TypingIndicator.tsx     # 3-dot pulsing indicator
│       ├── ChatThemePicker.tsx     # Theme selection UI
│       └── DisappearingMessage.tsx # Timer countdown overlay
├── (profile)/
│   └── components/
│       ├── AvatarGenerator.tsx     # Face capture + style picker
│       ├── LevelProgress.tsx       # XP bar + level display
│       └── BadgeCollection.tsx     # Gamification badges grid
├── (memories)/
│   ├── page.tsx                    # Memories vault grid
│   └── components/
│       ├── MemoryGrid.tsx          # Date-sorted media grid
│       └── MemorySearch.tsx        # Date/location/text search
├── (spotlight)/
│   └── page.tsx                    # Curated top reels feed
├── (games)/
│   └── components/
│       ├── GameLauncher.tsx        # Game selection menu
│       └── GameOverlay.tsx         # iframe-embedded game container
└── providers/
    ├── RealtimeProvider.tsx         # WebSocket connection manager
    ├── NotificationProvider.tsx     # Push + in-app notification
    ├── MicroInteractionProvider.tsx # Global animation/gamification context
    └── QueryProvider.tsx            # TanStack Query client
```

### Data Flow Architecture

```
┌─────────────────── Client Data Flow ───────────────────┐
│                                                         │
│  getUserMedia ──► Canvas Pipeline ──► AR Overlay        │
│       │                                    │            │
│       ▼                                    ▼            │
│  Video Stream ◄────── Face Mesh ──── MediaPipe/TFJS    │
│       │                                                 │
│       ▼                                                 │
│  Capture (JPEG/MP4) ──► Upload Queue ──► Backend API   │
│                                                         │
│  TanStack Query ◄──── REST API ────► Fastify Routes    │
│       │                                                 │
│       ▼                                                 │
│  React State ◄──── WebSocket ────► @quant/realtime     │
│       │                                                 │
│       ▼                                                 │
│  Framer Motion ──► DOM Render (60fps target)           │
└─────────────────────────────────────────────────────────┘
```

---

## Low-Level Design

### Component 1: Camera Module

**Package:** Client-side, `app/(camera)/`  
**Dependencies:** `@quant/ar-lenses`, MediaPipe/TensorFlow.js

#### Interfaces

```typescript
// Camera state machine
interface CameraState {
  stream: MediaStream | null;
  facingMode: 'user' | 'environment';
  flashMode: 'off' | 'torch' | 'screen';
  isRecording: boolean;
  recordingStartTime: number | null;
  activeLens: ARLensConfig | null;
  permissionStatus: 'prompt' | 'granted' | 'denied';
}

// Camera actions
type CameraAction =
  | { type: 'INIT_STREAM'; stream: MediaStream }
  | { type: 'FLIP_CAMERA' }
  | { type: 'TOGGLE_FLASH' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING'; blob: Blob }
  | { type: 'CAPTURE_PHOTO'; blob: Blob }
  | { type: 'APPLY_LENS'; lens: ARLensConfig }
  | { type: 'REMOVE_LENS' }
  | { type: 'PERMISSION_DENIED' };

// Canvas rendering pipeline
interface RenderPipeline {
  inputFrame: VideoFrame;
  faceMesh: FaceMeshResult | null;
  lensOverlay: CanvasImageSource | null;
  outputCanvas: OffscreenCanvas;
}

// AR Lens configuration from @quant/ar-lenses
interface ARLensConfig {
  id: string;
  name: string;
  type: 'face_distortion' | 'color_overlay' | 'particle' | 'alien_theme' | 'beauty';
  requiresFaceTracking: boolean;
  shaderProgram?: WebGLProgram;
  fallbackPosition: { x: number; y: number; scale: number };
}
```

#### Algorithm: Canvas Rendering Loop

```typescript
function renderLoop(state: CameraState, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  const video = state.stream?.getVideoTracks()[0];

  function frame() {
    if (!state.stream) return;

    // 1. Draw raw video frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // 2. If lens active, run face detection
    if (state.activeLens?.requiresFaceTracking) {
      const faceMesh = detectFaceMesh(canvas); // MediaPipe
      if (faceMesh) {
        applyLensToFaceMesh(ctx, state.activeLens, faceMesh);
      } else {
        applyLensFallback(ctx, state.activeLens);
      }
    } else if (state.activeLens) {
      applyFullFrameLens(ctx, state.activeLens);
    }

    requestAnimationFrame(frame); // Target 30fps minimum
  }

  requestAnimationFrame(frame);
}
```

### Component 2: Reels Engine

**Package:** Client `app/(reels)/`, Backend `routes/reels.ts`  
**Dependencies:** `@quant/ranking`, `@quant/recommendation`, `@quant/media`

#### Interfaces

```typescript
// Reel data model
interface Reel {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorAvatar: string;
  videoUrl: string; // HLS/MP4 URL
  thumbnailUrl: string;
  caption: string;
  duration: number; // seconds (5-60)
  likeCount: number;
  commentCount: number;
  shareCount: number;
  watchThroughRate: number;
  createdAt: Date;
  isLikedByUser: boolean;
}

// Feed state
interface ReelsFeedState {
  reels: Reel[];
  currentIndex: number;
  bufferedIndices: Set<number>; // Pre-buffered reel indices
  isLoading: boolean;
  hasMore: boolean;
  cursor: string | null;
}

// Ranking request/response
interface RankingRequest {
  userId: string;
  candidateReelIds: string[];
  engagementHistory: EngagementEvent[];
  socialGraph: string[]; // friend user IDs
}

interface RankedFeed {
  reels: Reel[];
  nextCursor: string;
  totalAvailable: number;
}

// Upload state machine
type UploadStatus = 'idle' | 'processing' | 'uploading' | 'retrying' | 'success' | 'failed';

interface ReelUpload {
  id: string;
  file: Blob;
  trimStart: number;
  trimEnd: number;
  coverFrameTimestamp: number;
  textOverlays: TextOverlay[];
  status: UploadStatus;
  progress: number; // 0-100
  retryCount: number; // max 3
  error: string | null;
}
```

#### Algorithm: Infinite Scroll with Pre-buffering

```typescript
function useReelsFeed() {
  const [state, dispatch] = useReducer(reelsFeedReducer, initialState);

  // Pre-buffer next 2 reels when current changes
  useEffect(() => {
    const toBuffer = [state.currentIndex + 1, state.currentIndex + 2];
    toBuffer.forEach((idx) => {
      if (state.reels[idx] && !state.bufferedIndices.has(idx)) {
        preloadVideo(state.reels[idx].videoUrl);
        dispatch({ type: 'MARK_BUFFERED', index: idx });
      }
    });
  }, [state.currentIndex]);

  // Infinite scroll: fetch when within 3 of end
  useEffect(() => {
    if (state.reels.length - state.currentIndex <= 3 && state.hasMore) {
      fetchNextPage(state.cursor).then((page) => {
        dispatch({ type: 'APPEND_REELS', reels: page.reels, cursor: page.nextCursor });
      });
    }
  }, [state.currentIndex]);
}
```

#### Algorithm: Upload with Exponential Backoff Retry

```typescript
async function uploadReel(upload: ReelUpload): Promise<void> {
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mediaService.upload(upload.file, {
        onProgress: (p) => dispatch({ type: 'PROGRESS', id: upload.id, progress: p }),
      });
      await reelsApi.createReel({ ...upload });
      dispatch({ type: 'SUCCESS', id: upload.id });
      return;
    } catch (error) {
      if (attempt < MAX_RETRIES && isNetworkError(error)) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        dispatch({ type: 'RETRYING', id: upload.id, retryCount: attempt + 1 });
        await sleep(delay);
      } else {
        dispatch({ type: 'FAILED', id: upload.id, error: error.message });
      }
    }
  }
}
```

### Component 3: AI Avatar Generator

**Package:** Backend `routes/avatar.ts`, Client `app/(profile)/components/AvatarGenerator.tsx`  
**Dependencies:** `@quant/generative-media`, `@quant/ml-runtime`

#### Interfaces

```typescript
// Avatar generation pipeline
interface AvatarGenerationRequest {
  userId: string;
  faceImage: Buffer; // JPEG/PNG face photo
  requestedStyles: AlienStyle[];
}

type AlienStyle = 'crystalline' | 'bioluminescent' | 'cybernetic';

interface AvatarVariant {
  style: AlienStyle;
  imageUrl: string;
  thumbnailUrl: string;
  metadata: {
    generatedAt: Date;
    modelVersion: string;
    processingTimeMs: number;
  };
}

interface AvatarGenerationResponse {
  variants: AvatarVariant[]; // Always 3 variants
  faceDetectionConfidence: number;
}

// Avatar surface rendering
type AvatarSurface =
  | 'chat_bubble'
  | 'profile_header'
  | 'story_ring'
  | 'reaction_animation'
  | 'friend_list'
  | 'map_pin';

type ReactionEmotion = 'happy' | 'sad' | 'surprised' | 'angry' | 'love';

interface AvatarReaction {
  emotion: ReactionEmotion;
  animationFrames: string[]; // URLs to animation sprite frames
  duration: number; // ms
}
```

#### Pipeline Flow

```
User Face Photo
      │
      ▼
┌─────────────────┐
│ Face Detection   │ ← MediaPipe (validate face present)
│ & Landmarks     │
└────────┬────────┘
         │ (fail → error: "clearer face photo needed")
         ▼
┌─────────────────┐
│ Face Embedding   │ ← @quant/ml-runtime
│ Extraction      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ @quant/generative-media Pipeline         │
│  ├── Crystalline style transform         │
│  ├── Bioluminescent style transform      │
│  └── Cybernetic style transform          │
└────────┬────────────────────────────────┘
         │ (3 variants, < 10s total)
         ▼
┌─────────────────┐
│ Store in DB      │ ← Prisma Avatar model
│ + CDN Upload    │
└─────────────────┘
```

### Component 4: Call System (WebRTC via LiveKit)

**Package:** Backend `routes/calls.ts`, Client `app/(calls)/`  
**Dependencies:** `livekit-server-sdk`, `@quant/webrtc`, `@quant/realtime`

#### Interfaces

```typescript
// Call state machine
type CallState =
  | { status: 'idle' }
  | { status: 'outgoing'; roomId: string; participantToken: string }
  | { status: 'incoming'; callerId: string; roomId: string }
  | { status: 'connecting'; roomId: string }
  | { status: 'active'; roomId: string; startTime: number; participants: CallParticipant[] }
  | { status: 'reconnecting'; roomId: string; attemptCount: number }
  | { status: 'ended'; duration: number };

interface CallParticipant {
  userId: string;
  username: string;
  avatarUrl: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

// LiveKit room management (backend)
interface CreateRoomRequest {
  conversationId: string;
  initiatorId: string;
  participantIds: string[];
  maxParticipants: number; // 2 for 1:1, up to 8 for group
}

interface CreateRoomResponse {
  roomId: string;
  tokens: Record<string, string>; // userId → participant token
}

// Call timer formatter
function formatCallDuration(elapsedSeconds: number): string {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

// Grid layout calculator
function calculateGridLayout(participantCount: number): GridLayout {
  if (participantCount <= 1) return { columns: 1, rows: 1, mode: 'single' };
  if (participantCount === 2) return { columns: 1, rows: 2, mode: 'split' };
  if (participantCount <= 4) return { columns: 2, rows: 2, mode: 'grid' };
  // > 4: focus mode - active speaker large, rest in thumbnail row
  return { columns: participantCount - 1, rows: 1, mode: 'focus' };
}
```

#### Call State Machine

```
     ┌──────┐
     │ idle │
     └──┬───┘
        │ initiate / receive
        ▼
┌───────────────┐        ┌──────────────┐
│   outgoing    │        │   incoming   │
└───────┬───────┘        └──────┬───────┘
        │ peer accepts          │ user accepts
        ▼                       ▼
     ┌──────────────────────────┐
     │       connecting         │
     └────────────┬─────────────┘
                  │ WebRTC established
                  ▼
     ┌──────────────────────────┐
     │         active           │◄─── reconnecting (up to 15s)
     └────────────┬─────────────┘
                  │ end / disconnect
                  ▼
     ┌──────────────────────────┐
     │          ended           │
     └──────────────────────────┘
```

### Component 5: Map Service

**Package:** Client `app/(map)/`  
**Dependencies:** Mapbox GL JS, `@quant/realtime`, `@quant/maps`

#### Interfaces

```typescript
// Map state
interface MapState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  userLocation: GeoPosition | null;
  friendLocations: FriendLocation[];
  ghostMode: boolean;
  activeView: 'friends' | 'explore';
  heatmapData: HeatmapPoint[];
}

interface FriendLocation {
  userId: string;
  username: string;
  avatarUrl: string;
  position: [number, number];
  lastUpdated: Date;
  isOnline: boolean;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Location broadcast (when ghost mode off)
interface LocationBroadcast {
  userId: string;
  position: [number, number];
  timestamp: number;
}

// Ghost mode invariant: when enabled, NO broadcasts emitted
function shouldBroadcastLocation(ghostMode: boolean): boolean {
  return !ghostMode;
}
```

#### Real-time Friend Location Updates

```typescript
// WebSocket subscription for friend locations
function useFriendLocations(userId: string, ghostMode: boolean) {
  const { subscribe, publish } = useRealtime();

  // Receive friend updates every 30s
  useEffect(() => {
    const unsub = subscribe('friend-locations', (event: LocationBroadcast) => {
      dispatch({ type: 'UPDATE_FRIEND', payload: event });
    });
    return unsub;
  }, []);

  // Broadcast own location every 30s (only if not ghost)
  useEffect(() => {
    if (ghostMode) return; // INVARIANT: ghost mode = no broadcast

    const interval = setInterval(async () => {
      const pos = await getCurrentPosition();
      publish('location-update', { userId, position: [pos.lng, pos.lat], timestamp: Date.now() });
    }, 30_000);

    return () => clearInterval(interval);
  }, [ghostMode]);
}
```

### Component 6: Persistence Layer (Prisma + PostgreSQL)

**Package:** `@quant/database`, Backend services  
**Dependencies:** Prisma 6, PostgreSQL

#### Prisma Schema (Key Models)

```prisma
model User {
  id              String          @id @default(cuid())
  username        String          @unique
  avatarId        String?
  avatar          Avatar?         @relation(fields: [avatarId], references: [id])
  xpPoints        Int             @default(0)
  level           Int             @default(1)
  ghostMode       Boolean         @default(false)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  messages        Message[]
  conversations   ConversationParticipant[]
  reels           Reel[]
  stories         Story[]
  streaksA        Streak[]        @relation("streakUserA")
  streaksB        Streak[]        @relation("streakUserB")
  badges          GameBadge[]
  memories        Memory[]
  notifications   Notification[]
  pushSubscriptions PushSubscription[]
  scheduledMessages ScheduledMessage[]

  @@index([username])
}

model Conversation {
  id              String          @id @default(cuid())
  type            ConversationType
  themeId         String?
  disappearTimer  Int?            // seconds, null = no timer
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  participants    ConversationParticipant[]
  messages        Message[]

  @@index([updatedAt])
}

model ConversationParticipant {
  id              String          @id @default(cuid())
  conversationId  String
  userId          String
  joinedAt        DateTime        @default(now())

  conversation    Conversation    @relation(fields: [conversationId], references: [id])
  user            User            @relation(fields: [userId], references: [id])

  @@unique([conversationId, userId])
  @@index([userId])
  @@index([conversationId])
}

model Message {
  id              String          @id @default(cuid())
  conversationId  String
  senderId        String
  content         String
  mediaUrl        String?
  isAIGenerated   Boolean         @default(false)
  expiresAt       DateTime?       // null = permanent
  viewedAt        DateTime?
  createdAt       DateTime        @default(now())

  conversation    Conversation    @relation(fields: [conversationId], references: [id])
  sender          User            @relation(fields: [senderId], references: [id])

  @@index([conversationId, createdAt])
  @@index([senderId])
  @@index([expiresAt])
}

model Reel {
  id              String          @id @default(cuid())
  creatorId       String
  videoUrl        String
  thumbnailUrl    String
  caption         String
  duration        Int             // seconds
  likeCount       Int             @default(0)
  commentCount    Int             @default(0)
  shareCount      Int             @default(0)
  watchThroughRate Float          @default(0)
  isFeatured      Boolean         @default(false)
  createdAt       DateTime        @default(now())

  creator         User            @relation(fields: [creatorId], references: [id])
  likes           ReelLike[]
  comments        ReelComment[]

  @@index([creatorId])
  @@index([createdAt])
  @@index([likeCount, shareCount, watchThroughRate]) // Ranking index
}

model Avatar {
  id              String          @id @default(cuid())
  userId          String          @unique
  style           AlienStyle
  imageUrl        String
  thumbnailUrl    String
  reactions       Json            // Map<ReactionEmotion, animationUrl>
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  user            User?

  @@index([userId])
}

model Streak {
  id              String          @id @default(cuid())
  userAId         String
  userBId         String
  count           Int             @default(0)
  lastActivityAt  DateTime
  expiresAt       DateTime        // midnight + 24h from last activity

  userA           User            @relation("streakUserA", fields: [userAId], references: [id])
  userB           User            @relation("streakUserB", fields: [userBId], references: [id])

  @@unique([userAId, userBId])
  @@index([expiresAt])
}

model FriendLocation {
  id              String          @id @default(cuid())
  userId          String          @unique
  latitude        Float
  longitude       Float
  updatedAt       DateTime        @updatedAt

  @@index([userId])
}

model Notification {
  id              String          @id @default(cuid())
  userId          String
  category        NotificationCategory
  title           String
  body            String
  deepLink        String
  isRead          Boolean         @default(false)
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id])

  @@index([userId, isRead, createdAt])
}

model PushSubscription {
  id              String          @id @default(cuid())
  userId          String
  endpoint        String
  p256dh          String
  auth            String
  expiresAt       DateTime?
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id])

  @@index([userId])
}

model GameBadge {
  id              String          @id @default(cuid())
  userId          String
  badgeType       String
  awardedAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id])

  @@index([userId])
}

model Memory {
  id              String          @id @default(cuid())
  userId          String
  mediaUrl        String
  mediaType       MediaType
  caption         String?
  location        String?
  createdAt       DateTime        @default(now())
  deletedAt       DateTime?       // soft delete for undo window

  user            User            @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([userId, deletedAt])
}

model ScheduledMessage {
  id              String          @id @default(cuid())
  userId          String
  conversationId  String
  content         String
  scheduledFor    DateTime
  status          ScheduleStatus  @default(PENDING)
  createdAt       DateTime        @default(now())

  user            User            @relation(fields: [userId], references: [id])

  @@index([scheduledFor, status])
}

model ChatTheme {
  id              String          @id @default(cuid())
  name            String
  backgroundGradient String
  bubbleColor     String
  fontStyle       String
  isAlienTheme    Boolean         @default(false)
}

enum ConversationType { DIRECT, GROUP }
enum AlienStyle { CRYSTALLINE, BIOLUMINESCENT, CYBERNETIC }
enum MediaType { PHOTO, VIDEO }
enum NotificationCategory { MESSAGES, CALLS, STORIES, STREAKS, REELS, SYSTEM }
enum ScheduleStatus { PENDING, SENT, CANCELLED }
```

#### Transaction Pattern: Atomic Conversation Creation

```typescript
async function createConversation(
  type: ConversationType,
  participantIds: string[],
): Promise<Conversation> {
  return prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: { type },
    });

    await tx.conversationParticipant.createMany({
      data: participantIds.map((userId) => ({
        conversationId: conversation.id,
        userId,
      })),
    });

    return conversation;
  });
}
```

#### Retry with Exponential Backoff Pattern

```typescript
async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !isTransientError(error)) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

function isTransientError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1017'].includes(error.code);
  }
  return false;
}
```

### Component 7: Push Notification Service

**Package:** Backend `routes/notifications.ts`, Client service worker  
**Dependencies:** `@quant/notifications`, Web Push API, VAPID

#### Interfaces

```typescript
// Push subscription management
interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime: number | null;
}

// Notification dispatch
interface NotificationPayload {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  deepLink: string; // e.g., '/chat/conv123', '/reels/reel456'
  priority: 'high' | 'normal';
  tag?: string; // For notification grouping
  silent?: boolean;
}

// Notification batching logic
interface NotificationBatch {
  userId: string;
  notifications: NotificationPayload[];
  windowStartTime: number;
  windowDurationMs: number; // 120_000 (2 minutes)
}

// Notification settings per user
interface NotificationSettings {
  userId: string;
  categories: Record<NotificationCategory, boolean>;
  storyNotificationsFor: string[]; // friend userIds
}

// Deep-link resolution
function resolveDeepLink(notification: NotificationPayload): string {
  switch (notification.category) {
    case 'MESSAGES':
      return `/chat/${notification.deepLink}`;
    case 'CALLS':
      return `/calls/incoming`;
    case 'STORIES':
      return `/stories/${notification.deepLink}`;
    case 'REELS':
      return `/reels/${notification.deepLink}`;
    case 'STREAKS':
      return `/chat/${notification.deepLink}`;
    case 'SYSTEM':
      return `/notifications`;
  }
}
```

#### Batching Algorithm

```typescript
class NotificationBatcher {
  private windows: Map<string, NotificationBatch> = new Map();
  private readonly WINDOW_MS = 120_000; // 2 minutes
  private readonly BATCH_THRESHOLD = 5;

  async enqueue(notification: NotificationPayload): Promise<void> {
    // High-priority always sends immediately
    if (notification.priority === 'high') {
      await this.sendImmediate(notification);
      return;
    }

    const key = `${notification.userId}:${notification.category}`;
    const batch = this.windows.get(key);

    if (!batch) {
      // Start new window
      this.windows.set(key, {
        userId: notification.userId,
        notifications: [notification],
        windowStartTime: Date.now(),
        windowDurationMs: this.WINDOW_MS,
      });
      // Set timer to flush
      setTimeout(() => this.flush(key), this.WINDOW_MS);
      return;
    }

    batch.notifications.push(notification);

    // If threshold reached, send summary immediately
    if (batch.notifications.length > this.BATCH_THRESHOLD) {
      await this.sendBatchSummary(batch);
      this.windows.delete(key);
    }
  }

  private async sendBatchSummary(batch: NotificationBatch): Promise<void> {
    const summary: NotificationPayload = {
      userId: batch.userId,
      category: batch.notifications[0].category,
      title: `${batch.notifications.length} new ${batch.notifications[0].category.toLowerCase()}`,
      body:
        batch.notifications
          .map((n) => n.body)
          .slice(0, 3)
          .join(', ') + '...',
      deepLink: '/notifications',
      priority: 'normal',
    };
    await this.sendImmediate(summary);
  }
}
```

### Component 8: Micro-Interaction & Addiction Loop Engine

**Package:** Client `providers/MicroInteractionProvider.tsx`  
**Dependencies:** Framer Motion, `@quant/brand`, `@quant/realtime`

#### Interfaces

```typescript
// Gamification state
interface GamificationState {
  userId: string;
  xp: number;
  level: number;
  badges: Badge[];
  streaks: Map<string, StreakData>;
  rewardHistory: RewardEvent[];
}

interface StreakData {
  friendId: string;
  count: number;
  lastActivityAt: Date;
  expiresAt: Date; // midnight + 24h
  hoursRemaining: number;
  isUrgent: boolean; // < 4 hours remaining
}

interface Badge {
  id: string;
  type: string;
  name: string;
  iconUrl: string;
  awardedAt: Date;
}

// XP configuration (action → points mapping)
const XP_REWARDS: Record<string, number> = {
  send_message: 10,
  post_story: 25,
  post_reel: 50,
  maintain_streak: 15, // per day
};

// Variable-ratio reward schedule
interface RewardSchedule {
  minInterval: number; // 5 (1 in 5 chance)
  maxInterval: number; // 15 (1 in 15 chance)
  currentThreshold: number; // randomized between min/max
  actionsSinceLastReward: number;
}

// Animation spring tokens from @quant/brand
interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

const BRAND_SPRINGS: Record<string, SpringConfig> = {
  bounce: { stiffness: 300, damping: 20, mass: 1 },
  gentle: { stiffness: 150, damping: 25, mass: 1 },
  snappy: { stiffness: 500, damping: 30, mass: 0.8 },
};
```

#### State Machine: Addiction Loop Engine

```
┌─────────────────────────────────────────────────────────────┐
│                  Addiction Loop State Machine                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐     user action      ┌──────────────┐        │
│  │  IDLE    │ ────────────────────► │ PROCESS_ACTION│        │
│  └──────────┘                       └──────┬───────┘        │
│       ▲                                    │                 │
│       │                         ┌──────────┼──────────┐     │
│       │                         ▼          ▼          ▼     │
│       │                    ┌────────┐ ┌────────┐ ┌────────┐│
│       │                    │AWARD_XP│ │CHECK_  │ │VARIABLE││
│       │                    │        │ │STREAK  │ │_REWARD ││
│       │                    └───┬────┘ └───┬────┘ └───┬────┘│
│       │                        │          │          │      │
│       │                        ▼          ▼          ▼      │
│       │                    ┌────────────────────────────┐   │
│       │                    │     TRIGGER_ANIMATIONS     │   │
│       │                    │  (particle, badge, level)  │   │
│       └────────────────────┤                            │   │
│                            └────────────────────────────┘   │
│                                                              │
│  Parallel: FOMO_RING_MONITOR (checks unviewed stories)      │
│  Parallel: STREAK_URGENCY_MONITOR (checks < 4h remaining)   │
│  Parallel: TYPING_INDICATOR_RELAY (WebSocket → 3-dot anim)  │
└─────────────────────────────────────────────────────────────┘
```

#### Algorithm: Variable-Ratio Reward

```typescript
function processVariableReward(schedule: RewardSchedule): {
  triggered: boolean;
  newSchedule: RewardSchedule;
} {
  const newCount = schedule.actionsSinceLastReward + 1;

  if (newCount >= schedule.currentThreshold) {
    // Reward triggered! Reset with new random threshold
    return {
      triggered: true,
      newSchedule: {
        ...schedule,
        actionsSinceLastReward: 0,
        currentThreshold: randomInt(schedule.minInterval, schedule.maxInterval),
      },
    };
  }

  return {
    triggered: false,
    newSchedule: { ...schedule, actionsSinceLastReward: newCount },
  };
}

// Streak calculation
function calculateStreak(userAId: string, userBId: string, messages: Message[]): number {
  const days = getConsecutiveDaysWithMutualMessages(userAId, userBId, messages);
  return days;
}

function isStreakUrgent(streak: StreakData): boolean {
  return streak.hoursRemaining < 4 && streak.count > 0;
}
```

#### CSS Haptic Feedback Pattern

```typescript
// Applied to all interactive elements via MicroInteractionProvider
const hapticTapVariants = {
  tap: {
    scale: 0.95,
    transition: { duration: 0.05 }, // 50ms
  },
};

// Usage: <motion.button whileTap="tap" variants={hapticTapVariants}>
```

### Component 9: Quant AI Agent

**Package:** Backend `routes/ai.ts`, Client `app/(chat)/components/AIAgentPanel.tsx`  
**Dependencies:** `@quant/ai`, `@quant/ml-runtime`

#### Interfaces

```typescript
// AI Agent state machine
type AIAgentMode = 'disabled' | 'suggestions_only' | 'auto_reply';

interface AIAgentState {
  mode: AIAgentMode;
  conversationId: string;
  contextWindow: Message[]; // Last 50 messages
  pendingReplies: ScheduledAIReply[];
  userStyle: CommunicationStyle;
}

interface CommunicationStyle {
  tone: 'formal' | 'casual' | 'friendly' | 'brief';
  averageLength: number;
  commonPhrases: string[];
  emojiUsage: 'none' | 'light' | 'heavy';
}

// Suggestion generation
interface SuggestionRequest {
  conversationId: string;
  contextMessages: Message[];
  currentDraft: string;
}

interface SuggestionResponse {
  suggestions: string[]; // max 3
  confidence: number[];
}

// Auto-reply pipeline
interface AutoReplyRequest {
  incomingMessage: Message;
  conversationContext: Message[];
  userStyle: CommunicationStyle;
}

interface AutoReplyResponse {
  content: string;
  isAIGenerated: true; // ALWAYS true - invariant
  confidence: number;
}

// Conversation summary
interface SummaryRequest {
  conversationId: string;
  messageRange: { from: string; to: string }; // message IDs
  maxMessages: number; // default 50
}

interface SummaryResponse {
  summary: string;
  messageCount: number;
  timeSpan: { from: Date; to: Date };
  keyTopics: string[];
}

// Scheduled message
interface ScheduledMessage {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'cancelled';
}

// Translation
interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; // auto-detect if not provided
}
```

#### AI Agent State Machine

```
┌──────────────────────────────────────────────────┐
│              AI Agent State Machine                │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────┐   enable suggestions  ┌─────────┐ │
│  │ DISABLED │ ─────────────────────► │SUGGEST  │ │
│  └──────────┘                        │ ONLY    │ │
│       ▲                              └────┬────┘ │
│       │ disable                           │      │
│       │                      enable auto  │      │
│       │                                   ▼      │
│       │                         ┌──────────────┐ │
│       └─────────────────────────│ AUTO_REPLY   │ │
│              disable            └──────┬───────┘ │
│                                        │         │
│                                        ▼         │
│                               ┌──────────────┐   │
│                               │ PROCESS_MSG  │   │
│                               │ generate AI  │   │
│                               │ response     │   │
│                               │ mark as AI   │   │
│                               │ send within  │   │
│                               │ 5 seconds    │   │
│                               └──────────────┘   │
└──────────────────────────────────────────────────┘

On disable: cancel all pending auto-replies immediately
```

#### Scheduled Message Delivery Worker

```typescript
// Runs as a background job checking every 30 seconds
async function processScheduledMessages(): Promise<void> {
  const now = new Date();
  const dueMessages = await prisma.scheduledMessage.findMany({
    where: {
      scheduledFor: { lte: now },
      status: 'PENDING',
    },
    orderBy: { scheduledFor: 'asc' },
  });

  for (const msg of dueMessages) {
    try {
      await sendMessage(msg.conversationId, msg.userId, msg.content);
      await prisma.scheduledMessage.update({
        where: { id: msg.id },
        data: { status: 'SENT' },
      });
    } catch (error) {
      // Retry on next cycle (within 60s tolerance)
      logger.error('Scheduled message delivery failed', { id: msg.id, error });
    }
  }
}
```

### Component 10: Snapchat Parity Features

**Package:** Various client components + backend routes  
**Dependencies:** `@quant/recommendation`, `@quant/cross-app-gaming`, `@quant/ranking`

#### 10a: Memories Vault

```typescript
// Memory search interface
interface MemorySearchQuery {
  userId: string;
  dateRange?: { from: Date; to: Date };
  location?: string;
  captionText?: string;
  mediaType?: MediaType;
}

// Soft-delete with undo window
interface DeleteMemoryAction {
  memoryId: string;
  deletedAt: Date;
  undoDeadline: Date; // deletedAt + 5 seconds
  isPermanent: boolean;
}

async function deleteMemory(memoryId: string): Promise<DeleteMemoryAction> {
  const now = new Date();
  await prisma.memory.update({
    where: { id: memoryId },
    data: { deletedAt: now },
  });

  // Schedule permanent deletion after 5s
  setTimeout(async () => {
    const memory = await prisma.memory.findUnique({ where: { id: memoryId } });
    if (memory?.deletedAt) {
      await prisma.memory.delete({ where: { id: memoryId } });
      await storageService.deleteMedia(memory.mediaUrl);
    }
  }, 5000);

  return {
    memoryId,
    deletedAt: now,
    undoDeadline: new Date(now.getTime() + 5000),
    isPermanent: false,
  };
}

async function undoDeleteMemory(memoryId: string): Promise<void> {
  await prisma.memory.update({
    where: { id: memoryId },
    data: { deletedAt: null },
  });
}
```

#### 10b: Spotlight

```typescript
// Spotlight ranking algorithm
interface SpotlightRankingConfig {
  refreshIntervalMs: number; // 900_000 (15 minutes)
  weights: {
    likes: number; // 0.3
    shares: number; // 0.3
    watchThroughRate: number; // 0.4
  };
  recencyBoost: number; // bonus for newer content
  maxAge: number; // hours, content older than this excluded
}

function computeSpotlightScore(reel: Reel, config: SpotlightRankingConfig): number {
  const engagement =
    reel.likeCount * config.weights.likes +
    reel.shareCount * config.weights.shares +
    reel.watchThroughRate * config.weights.watchThroughRate;

  const ageHours = (Date.now() - reel.createdAt.getTime()) / 3_600_000;
  const recencyMultiplier = Math.max(0, 1 - ageHours / config.maxAge) * config.recencyBoost;

  return engagement * (1 + recencyMultiplier);
}
```

#### 10c: Chat Themes

```typescript
// Theme data structure
interface ChatThemeConfig {
  id: string;
  name: string;
  backgroundGradient: string; // CSS gradient value
  bubbleColor: string; // hex
  fontStyle: string; // font-family
  isAlienTheme: boolean;
}

// Predefined themes (minimum 10)
const BUILT_IN_THEMES: ChatThemeConfig[] = [
  {
    id: 'nebula',
    name: 'Nebula',
    backgroundGradient: 'linear-gradient(135deg, #1a0533, #4a0e8f)',
    bubbleColor: '#7c3aed',
    fontStyle: 'Inter',
    isAlienTheme: true,
  },
  {
    id: 'quantum-void',
    name: 'Quantum Void',
    backgroundGradient: 'linear-gradient(180deg, #000, #0a192f)',
    bubbleColor: '#06b6d4',
    fontStyle: 'JetBrains Mono',
    isAlienTheme: true,
  },
  {
    id: 'bioluminescent',
    name: 'Bioluminescent Cave',
    backgroundGradient: 'linear-gradient(135deg, #042f2e, #0f766e)',
    bubbleColor: '#2dd4bf',
    fontStyle: 'Inter',
    isAlienTheme: true,
  },
  // ... 7+ more standard themes
];

// Theme sync: applied to all participants
async function applyChatTheme(conversationId: string, themeId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { themeId },
  });
  // Notify all participants via WebSocket
  await realtime.broadcast(`conversation:${conversationId}`, {
    type: 'theme_changed',
    themeId,
  });
}
```

#### 10d: Games Integration

```typescript
// Games SDK hook interface (exposed via @quant/cross-app-gaming)
interface GameSDKHooks {
  onGameStart: (gameId: string, participants: string[]) => void;
  onGameEnd: (result: GameResult) => void;
  onScoreUpdate: (userId: string, score: number) => void;
  sendMessage: (content: string) => void;
}

interface GameResult {
  gameId: string;
  scores: Record<string, number>; // userId → score
  winnerId: string | null;
  duration: number; // seconds
}

// Post game results to chat
async function handleGameEnd(conversationId: string, result: GameResult): Promise<void> {
  // Award XP to all participants
  for (const [userId, score] of Object.entries(result.scores)) {
    await awardXP(userId, Math.floor(score / 10)); // 1 XP per 10 game points
  }

  // Post system message with scores
  const scoreText = Object.entries(result.scores)
    .sort(([, a], [, b]) => b - a)
    .map(([uid, score], i) => `${i + 1}. ${uid}: ${score}`)
    .join('\n');

  await sendSystemMessage(conversationId, `Game Over!\n${scoreText}`);
}
```

#### 10e: Disappearing Messages

```typescript
// Disappearing message lifecycle
interface DisappearingConfig {
  conversationId: string;
  duration: 5 | 10 | 30 | 60 | 300 | 86400; // seconds
}

// Calculate expiry time
function calculateExpiry(viewedAt: Date, duration: number): Date {
  return new Date(viewedAt.getTime() + duration * 1000);
}

// Deletion worker (runs periodically)
async function cleanupExpiredMessages(): Promise<void> {
  const now = new Date();
  const expired = await prisma.message.findMany({
    where: {
      expiresAt: { lte: now },
      viewedAt: { not: null },
    },
  });

  if (expired.length > 0) {
    await prisma.message.deleteMany({
      where: { id: { in: expired.map((m) => m.id) } },
    });

    // Notify clients to remove from UI
    for (const msg of expired) {
      await realtime.broadcast(`conversation:${msg.conversationId}`, {
        type: 'message_expired',
        messageId: msg.id,
      });
    }
  }
}

// Screenshot detection event
async function handleScreenshotDetected(messageId: string, screenshotterId: string): Promise<void> {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return;

  await sendSystemMessage(message.conversationId, `${screenshotterId} took a screenshot`);
}
```

### Component 11: Real-Time WebSocket Infrastructure

**Package:** `@quant/realtime`, Backend `routes/websocket.ts`  
**Dependencies:** `@fastify/websocket`, ioredis

#### Interfaces

```typescript
// WebSocket connection state
type WSConnectionState = 'connecting' | 'authenticated' | 'active' | 'reconnecting' | 'degraded';

interface RealtimeConnection {
  state: WSConnectionState;
  userId: string;
  sessionId: string;
  subscribedChannels: Set<string>;
  reconnectAttempts: number;
  maxReconnectAttempts: number; // 5
  lastHeartbeat: number;
}

// Multiplexed event channels
type EventChannel = 'chat' | 'calls' | 'map' | 'notifications' | 'streaks' | 'typing' | 'presence';

interface WSEvent {
  channel: EventChannel;
  type: string;
  payload: unknown;
  timestamp: number;
}

// Fallback to long-polling after 5 failed reconnects
interface LongPollFallback {
  enabled: boolean;
  pollIntervalMs: number; // 3000
  criticalChannels: EventChannel[]; // ['chat', 'calls']
}

// Authentication on connect
interface WSAuthPayload {
  token: string; // JWT
}
```

#### Reconnection Strategy

```typescript
function createReconnectionStrategy(connection: RealtimeConnection) {
  const MAX_ATTEMPTS = 5;
  const BASE_DELAY = 1000;

  async function attemptReconnect(): Promise<boolean> {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      connection.reconnectAttempts = i + 1;
      connection.state = 'reconnecting';

      const delay = Math.min(BASE_DELAY * Math.pow(2, i), 3000);
      await sleep(delay);

      try {
        await connect(connection);
        connection.state = 'active';
        connection.reconnectAttempts = 0;
        return true;
      } catch (e) {
        continue;
      }
    }

    // All attempts failed → degrade to long-polling
    connection.state = 'degraded';
    return false;
  }

  return { attemptReconnect };
}
```

---

## Error Handling Strategy

| Component    | Error Type           | Handling                             |
| ------------ | -------------------- | ------------------------------------ |
| Camera       | Permission denied    | Show inline message + settings link  |
| Camera       | Face detection fail  | Fallback lens position               |
| Reels        | Upload network error | 3x retry with exponential backoff    |
| Reels        | File too large/long  | Client-side validation before upload |
| Avatar       | Face detection fail  | Request clearer photo                |
| Calls        | WebRTC drop          | Auto-reconnect 15s then error screen |
| Map          | Geolocation denied   | Default location + enable prompt     |
| Persistence  | Transient DB error   | 3x retry with backoff then 503       |
| Push         | Subscription expired | Re-register on next visit            |
| WebSocket    | Connection lost      | 5 reconnect attempts then long-poll  |
| Games        | Load timeout (10s)   | Error message + retry option         |
| Screen Share | Permission denied    | Info message, maintain call          |

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Photo capture produces valid JPEG

_For any_ valid canvas frame data from an active video stream, the capture function SHALL produce a non-empty Blob of MIME type `image/jpeg`.

**Validates: Requirements 1.2**

### Property 2: AR lens compositing modifies output

_For any_ active AR lens configuration and any input video frame, the composited output frame SHALL differ from the raw input frame (lens effect is visibly applied).

**Validates: Requirements 2.4**

### Property 3: Reel pre-buffering invariant

_For any_ current reel index `i` in the feed where `i+1` and `i+2` exist, the reels at indices `i+1` and `i+2` SHALL be in a buffered/preloaded state.

**Validates: Requirements 3.4**

### Property 4: Reel visibility controls playback

_For any_ reel component, if the reel is visible in the viewport then it SHALL be in a playing state, and if it is not visible then it SHALL be in a paused state.

**Validates: Requirements 3.5**

### Property 5: Reel overlay displays all required fields

_For any_ reel data object with non-null creator info, the rendered overlay SHALL contain the creator username, caption text, like count, comment count, and share count.

**Validates: Requirements 3.6**

### Property 6: Optimistic like increments count

_For any_ reel with current like count N, after a like action the displayed count SHALL equal N+1 immediately (before server confirmation).

**Validates: Requirements 3.7**

### Property 7: Feed ranking produces non-increasing score order

_For any_ set of candidate reels with engagement metrics, the @quant/ranking output SHALL be sorted in non-increasing order of computed relevance score.

**Validates: Requirements 3.11, 13.1**

### Property 8: Infinite scroll triggers fetch near end

_For any_ feed state where the user's current position is within 3 items of the loaded set's end and more items exist, a fetch for the next page SHALL be triggered.

**Validates: Requirements 3.12, 10.6**

### Property 9: Upload retry respects exponential backoff

_For any_ reel upload that fails due to a network error, the system SHALL retry up to 3 times with delays of 1s, 2s, and 4s (exponential backoff with base 2).

**Validates: Requirements 4.5**

### Property 10: Reel validation rejects oversized content

_For any_ file with size > 100MB or duration > 60 seconds, the upload validation SHALL reject the file before upload begins.

**Validates: Requirements 4.6**

### Property 11: Avatar generation produces exactly 3 style variants

_For any_ valid face photo input that passes face detection, the AI Avatar Generator SHALL produce exactly 3 variants (crystalline, bioluminescent, cybernetic).

**Validates: Requirements 5.3**

### Property 12: Avatar renders on all defined surfaces

_For any_ avatar surface type (chat_bubble, profile_header, story_ring, reaction_animation, friend_list, map_pin), the component SHALL render the user's selected avatar image.

**Validates: Requirements 5.5**

### Property 13: Avatar reaction animations cover all emotions

_For any_ reaction emotion in {happy, sad, surprised, angry, love}, the avatar animation system SHALL produce a non-null animation sequence.

**Validates: Requirements 5.6**

### Property 14: Call timer formats duration correctly

_For any_ elapsed seconds value, the call timer formatter SHALL produce a correctly formatted time string (MM:SS or H:MM:SS).

**Validates: Requirements 6.10**

### Property 15: Group call grid layout adapts to participant count

_For any_ participant count N (1 through 8), the grid layout calculator SHALL produce a valid layout configuration, switching to focus mode when N > 4.

**Validates: Requirements 6.11, 15.2, 15.4**

### Property 16: Ghost mode prevents location broadcast

_For any_ user with ghost_mode enabled, the system SHALL never emit a location broadcast event for that user.

**Validates: Requirements 7.5**

### Property 17: Persistence survives restart (round-trip)

_For any_ message entity written to the database, querying the same entity after a simulated service restart SHALL return identical data.

**Validates: Requirements 8.4**

### Property 18: Atomic conversation creation (all-or-nothing)

_For any_ conversation creation with N participants, either all N participant association records AND the conversation record exist in the database, or none of them exist (transaction atomicity).

**Validates: Requirements 8.6**

### Property 19: Database retry respects backoff before 503

_For any_ transient database error, the persistence layer SHALL retry up to 3 times with exponential backoff before returning a 503 error response.

**Validates: Requirements 8.8**

### Property 20: Streak expiry triggers warning notification

_For any_ streak with fewer than 4 hours remaining before expiry, the Push Service SHALL queue a streak-expiry warning notification for both users.

**Validates: Requirements 9.4**

### Property 21: Notification category toggles are independent

_For any_ notification category toggled off by a user, notifications of that category SHALL be suppressed while all other categories continue to deliver normally.

**Validates: Requirements 9.6**

### Property 22: Notification deep-link resolves correctly

_For any_ notification with category T and content identifier C, the deep-link resolver SHALL produce the correct application route for that content.

**Validates: Requirements 9.7**

### Property 23: Non-urgent notification batching

_For any_ sequence of more than 5 non-urgent notifications arriving within a 2-minute window for the same user, the system SHALL deliver a single summary notification instead of individual ones.

**Validates: Requirements 9.9**

### Property 24: Foreground suppresses browser push

_For any_ notification event arriving while the application is in the foreground, the system SHALL suppress the browser-level push notification and display an in-app toast instead.

**Validates: Requirements 9.10**

### Property 25: Streak calculation invariant

_For any_ friend pair, the streak count SHALL equal the number of consecutive days both users exchanged at least one message, resetting to 0 on any missed day.

**Validates: Requirements 10.3**

### Property 26: Streak milestone triggers celebration

_For any_ streak value reaching exactly 7, 30, 100, or 365, the system SHALL trigger a celebratory animation and award a gamification badge.

**Validates: Requirements 10.4**

### Property 27: Variable-ratio reward rate bounds

_For any_ sufficiently large sequence of N user interactions, the number of surprise rewards delivered SHALL fall between N/15 and N/5 (reward rate between 1-in-15 and 1-in-5).

**Validates: Requirements 10.5**

### Property 28: FOMO ring on unviewed stories

_For any_ story with viewed=false for the current user, the story circle SHALL render with an active FOMO ring gradient animation.

**Validates: Requirements 10.9**

### Property 29: Streak urgency indicator when < 4 hours

_For any_ streak with fewer than 4 hours remaining, the chat thread SHALL display the fire emoji pulsing animation with urgency coloring.

**Validates: Requirements 10.10**

### Property 30: XP awards match action-point mapping

_For any_ user action in {send_message: 10, post_story: 25, post_reel: 50, maintain_streak: 15}, the XP awarded SHALL equal exactly the defined point value for that action.

**Validates: Requirements 10.11**

### Property 31: AI suggestions limited to 3

_For any_ conversation context input, the AI suggestion generator SHALL produce at most 3 reply suggestions.

**Validates: Requirements 11.3**

### Property 32: Scheduled message delivery within tolerance

_For any_ scheduled message with target time T, delivery SHALL occur within the window [T, T + 60 seconds].

**Validates: Requirements 11.4**

### Property 33: AI-generated content always labeled

_For any_ message where the source is the AI agent (auto-reply or content creation), the message record SHALL have isAIGenerated=true and the rendered output SHALL include an "AI-generated" label.

**Validates: Requirements 11.8**

### Property 34: Memories ordered by date descending

_For any_ set of memory items returned for a user, the list SHALL be sorted in non-increasing order of creation date.

**Validates: Requirements 12.1**

### Property 35: Memory search returns matching items

_For any_ memory whose attributes (date, location, caption) match a given search filter, that memory SHALL appear in the search results.

**Validates: Requirements 12.4**

### Property 36: Chat theme syncs to all participants

_For any_ conversation with a theme applied, all participants in that conversation SHALL see the same theme configuration after sync completes.

**Validates: Requirements 14.3**

### Property 37: Game end awards XP and posts scores

_For any_ game session ending with participant scores, the system SHALL post a chat message containing all scores AND award XP to each participant proportional to their score.

**Validates: Requirements 17.3**

### Property 38: Disappearing timer applies to new messages

_For any_ conversation with disappear timer set to duration D and any new message sent in that conversation, message.expiresAt SHALL equal message.viewedAt + D seconds.

**Validates: Requirements 18.1**

### Property 39: Expired disappearing messages are deleted

_For any_ disappearing message whose timer has expired after being viewed, the message SHALL not be retrievable from any participant's view or from the database.

**Validates: Requirements 18.2**

### Property 40: CSS haptic feedback on all interactive elements

_For any_ interactive element receiving a tap event, the system SHALL apply a 50ms scale transform animation as haptic-like feedback.

**Validates: Requirements 19.4**

### Property 41: WebSocket delivers all event types

_For any_ valid event type in {messages, typing, presence, location, calls, notifications, streaks}, publishing an event on that channel SHALL result in delivery to all connected and subscribed clients.

**Validates: Requirements 20.3**

### Property 42: Multiplexed channels over single connection

_For any_ set of subscribed event channels for a client, all events from all subscribed channels SHALL be delivered over the client's single WebSocket connection.

**Validates: Requirements 20.5**
