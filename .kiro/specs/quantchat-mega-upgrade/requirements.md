# Requirements Document

## Introduction

QuantChat Mega Upgrade is a comprehensive platform evolution spanning 10 feature domains that transforms QuantChat from a messaging prototype into a full-featured, engagement-optimized social media super-app. The upgrade covers real camera/media capture, TikTok-style reels, AI avatar generation, WebRTC calls, live map, backend persistence, push notifications, micro-interactions/addiction loops, agentic AI control, and full Snapchat feature parity. Priority tiers: P0 (Camera + Reels/Feed + AI Avatar), P1 (Calls + Map + Persistence), P2 (Push + Micro-interactions + AI Agentic + Snapchat Parity).

## Glossary

- **Camera_Module**: The client-side component that accesses device cameras via getUserMedia, renders live viewfinder, applies AR lenses and filters, and captures photo/video media.
- **Reels_Engine**: The subsystem responsible for rendering, ranking, and serving vertical short-form video content in an infinite-scroll feed.
- **AI_Avatar_Generator**: The server-side pipeline that transforms a user face photo into an alien-aesthetic avatar image using generative ML models.
- **Call_System**: The WebRTC-based subsystem using LiveKit for real-time audio/video calling between users.
- **Map_Service**: The location subsystem rendering interactive Mapbox/Leaflet tile maps with friend positions, ghost mode, and activity heatmaps.
- **Persistence_Layer**: The Prisma/PostgreSQL database tier replacing in-memory stores for all backend services.
- **Push_Service**: The Web Push API and service worker subsystem delivering real-time notifications to users.
- **Micro_Interaction_Engine**: The client-side system orchestrating haptic-like CSS feedback, dopamine-loop animations, streaks, variable-ratio rewards, and gamification.
- **Quant_AI_Agent**: The agentic AI subsystem providing auto-reply, conversation summarization, reply suggestions, message scheduling, content creation, and personal assistant capabilities within chat.
- **Snapchat_Parity_Module**: The collection of features achieving parity with Snapchat including memories, spotlight, chat themes, group video, screen share, and games hooks.
- **Viewfinder**: The live camera preview rendered in the browser from a getUserMedia video stream.
- **AR_Lens**: A real-time augmented reality overlay applied to the live viewfinder feed using face/body tracking.
- **Reel**: A vertical short-form video (5-60 seconds) uploaded by a user and served in the algorithmic feed.
- **Duet**: A split-screen video format where a user records alongside an existing reel.
- **Ghost_Mode**: A privacy setting where the user's location is hidden from all friends on the map.
- **Streak**: A count of consecutive days two users have exchanged messages, resetting if a day is missed.
- **Variable_Ratio_Reward**: A reinforcement schedule where rewards are delivered after an unpredictable number of actions to maximize engagement.
- **FOMO_Ring**: An animated ring around a story circle indicating unseen content designed to trigger fear of missing out.

## Requirements

### Requirement 1: Real Camera Capture

**User Story:** As a user, I want a live camera viewfinder with real device camera access, so that I can capture photos and videos directly within the app.

#### Acceptance Criteria

1. WHEN the user navigates to the Camera page, THE Camera_Module SHALL request access to the device camera via getUserMedia and render the live video stream in the Viewfinder within 2 seconds of permission grant.
2. WHEN the user taps the capture button in photo mode, THE Camera_Module SHALL capture a still frame from the active video stream and store it as a JPEG blob in memory.
3. WHEN the user long-presses the capture button for more than 500ms, THE Camera_Module SHALL begin recording video from the active stream and continue until release or a maximum duration of 60 seconds.
4. WHEN the user taps the flip-camera button, THE Camera_Module SHALL switch between front and rear camera devices within 500ms.
5. WHEN the user taps the flash toggle, THE Camera_Module SHALL activate the device torch (rear camera) or screen flash (front camera) for the next capture.
6. IF getUserMedia permission is denied, THEN THE Camera_Module SHALL display an inline permission-denied message with a link to browser settings and degrade gracefully without crashing.
7. WHILE the Viewfinder is active, THE Camera_Module SHALL maintain a minimum frame rate of 30fps on the preview canvas.

### Requirement 2: AR Lenses on Live Viewfinder

**User Story:** As a user, I want to apply AR lenses and filters on my live camera feed, so that I can create fun and creative content with real-time effects.

#### Acceptance Criteria

1. WHILE the Viewfinder is active, THE Camera_Module SHALL render a horizontally scrollable carousel of available AR_Lens options at the bottom of the screen.
2. WHEN the user selects an AR_Lens from the carousel, THE Camera_Module SHALL apply the lens effect to the live Viewfinder stream within 200ms.
3. WHILE an AR_Lens is applied, THE Camera_Module SHALL maintain face/body tracking at a minimum of 24fps for overlay positioning accuracy.
4. WHEN the user captures a photo or video with an AR_Lens active, THE Camera_Module SHALL bake the lens overlay into the captured media output.
5. THE Camera_Module SHALL support a minimum of 7 distinct AR_Lens effects including face distortion, color overlay, particle effects, and alien-theme lenses.
6. WHEN the user selects the beauty mode filter, THE Camera_Module SHALL apply real-time skin smoothing and exposure adjustment to the Viewfinder stream.
7. IF face detection fails while an AR_Lens requires face tracking, THEN THE Camera_Module SHALL display the lens in a static fallback position without crashing.

### Requirement 3: Reels and Vertical Video Feed

**User Story:** As a user, I want a TikTok-style vertical video feed with algorithmically ranked content, so that I can discover and engage with short-form video content.

#### Acceptance Criteria

1. WHEN the user navigates to the Reels tab, THE Reels_Engine SHALL render a full-screen vertical video player that auto-plays the top-ranked Reel.
2. WHEN the user swipes up on the Reels feed, THE Reels_Engine SHALL transition to the next Reel with a vertical slide animation completing within 300ms.
3. WHEN the user swipes down on the Reels feed, THE Reels_Engine SHALL transition to the previous Reel with a vertical slide animation completing within 300ms.
4. THE Reels_Engine SHALL pre-buffer the next 2 Reels in the feed while the current Reel is playing to eliminate loading gaps during swipe transitions.
5. WHEN a Reel is visible in the viewport, THE Reels_Engine SHALL auto-play the video; WHEN the Reel leaves the viewport, THE Reels_Engine SHALL pause playback.
6. THE Reels_Engine SHALL display an overlay on each Reel containing the creator username, caption text, like count, comment count, and share count.
7. WHEN the user taps the like button on a Reel, THE Reels_Engine SHALL increment the like count optimistically and persist the like via the backend API within 2 seconds.
8. WHEN the user taps the comment icon on a Reel, THE Reels_Engine SHALL open a bottom sheet displaying existing comments with an input field for new comments.
9. WHEN the user taps the share button on a Reel, THE Reels_Engine SHALL open a share sheet with options to send to friends, copy link, or share to stories.
10. WHEN the user taps the duet button on a Reel, THE Reels_Engine SHALL open the Camera_Module in split-screen Duet recording mode with the original Reel playing on one side.
11. THE Reels_Engine SHALL use the @quant/ranking package to rank Reels based on user engagement history, watch time, and social graph proximity.
12. WHILE the Reels feed is active, THE Reels_Engine SHALL implement infinite scroll by fetching the next page of Reels when the user is within 3 items of the end of the loaded set.

### Requirement 4: Reel Upload and Creation

**User Story:** As a content creator, I want to upload and edit short videos as Reels, so that I can share creative content with the QuantChat community.

#### Acceptance Criteria

1. WHEN the user captures a video via the Camera_Module, THE Reels_Engine SHALL present an option to publish the video as a Reel.
2. WHEN the user selects "Post as Reel", THE Reels_Engine SHALL display an editing screen with options to trim (5-60 seconds), add text overlays, and select a cover frame.
3. WHEN the user taps "Publish" on the Reel editor, THE Reels_Engine SHALL upload the video to the media service and create a Reel entry in the Persistence_Layer.
4. WHILE a Reel is uploading, THE Reels_Engine SHALL display a progress indicator and allow the user to navigate away without canceling the upload.
5. IF the Reel upload fails due to network error, THEN THE Reels_Engine SHALL retry the upload up to 3 times with exponential backoff and notify the user on final failure.
6. THE Reels_Engine SHALL enforce a maximum Reel file size of 100MB and a maximum duration of 60 seconds.
7. WHEN a Reel is successfully published, THE Reels_Engine SHALL make the Reel discoverable in the feed within 30 seconds of upload completion.

### Requirement 5: AI Avatar Generation (Alien Aesthetic)

**User Story:** As a user, I want to generate an alien-themed AI avatar from my face, so that I have a unique visual identity across all QuantChat surfaces.

#### Acceptance Criteria

1. WHEN the user navigates to the Avatar setup screen, THE AI_Avatar_Generator SHALL prompt the user to capture or upload a face photo.
2. WHEN the user submits a face photo, THE AI_Avatar_Generator SHALL process the image through the @quant/generative-media pipeline and produce an alien-aesthetic avatar within 10 seconds.
3. THE AI_Avatar_Generator SHALL produce avatar variants in at least 3 alien styles (crystalline, bioluminescent, cybernetic) for the user to choose from.
4. WHEN the user selects an avatar variant, THE AI_Avatar_Generator SHALL save the selection as the user's primary avatar in the Persistence_Layer.
5. THE AI_Avatar_Generator SHALL render the selected avatar in chat message bubbles, profile headers, story rings, reaction animations, and friend list entries across the application.
6. WHEN the user sends a reaction in chat, THE AI_Avatar_Generator SHALL animate the alien avatar performing the reaction emotion (happy, sad, surprised, angry, love).
7. IF face detection fails on the submitted photo, THEN THE AI_Avatar_Generator SHALL display an error message requesting a clearer face photo with proper lighting.
8. WHEN a user updates their avatar, THE AI_Avatar_Generator SHALL propagate the new avatar to all surfaces within 5 seconds.

### Requirement 6: Real WebRTC Video and Audio Calls

**User Story:** As a user, I want real-time video and audio calls using WebRTC, so that I can have face-to-face conversations with friends directly in QuantChat.

#### Acceptance Criteria

1. WHEN the user initiates a call from a chat conversation, THE Call_System SHALL create a LiveKit room, generate participant tokens, and establish a WebRTC connection within 3 seconds.
2. WHEN an incoming call arrives, THE Call_System SHALL display a full-screen incoming call overlay with accept and decline buttons and the caller's avatar.
3. WHEN the user accepts an incoming call, THE Call_System SHALL connect to the LiveKit room and begin streaming audio and video within 2 seconds.
4. WHILE a call is active, THE Call_System SHALL display the remote participant's video in full-screen and the local participant's video in a draggable picture-in-picture window.
5. WHILE a call is active, THE Call_System SHALL provide on-screen controls to toggle mute, toggle camera, toggle speaker, and end the call.
6. WHEN the user toggles mute during a call, THE Call_System SHALL mute the local audio track within 100ms and update the mute indicator for all participants.
7. WHEN the user toggles camera during a call, THE Call_System SHALL disable the local video track and display a placeholder avatar in the self-view.
8. WHEN either participant ends the call, THE Call_System SHALL disconnect both participants, destroy the LiveKit room, and display the call-ended screen with duration.
9. IF the WebRTC connection drops during an active call, THEN THE Call_System SHALL attempt automatic reconnection for up to 15 seconds before displaying a connection-lost message.
10. WHILE a call is active, THE Call_System SHALL display an elapsed call timer updated every second.
11. WHEN the user initiates a group call, THE Call_System SHALL support up to 8 simultaneous video participants in a grid layout.

### Requirement 7: Real Snap Map with Mapbox/Leaflet Tiles

**User Story:** As a user, I want a real interactive map showing friend locations on actual map tiles, so that I can see where my friends are and discover activity hotspots.

#### Acceptance Criteria

1. WHEN the user navigates to the Map tab, THE Map_Service SHALL render interactive vector tile maps using Mapbox GL JS or Leaflet with the user's current location centered.
2. WHEN the user grants geolocation permission, THE Map_Service SHALL display the user's position with a pulsing blue dot marker updated in real-time.
3. WHILE the Map is active, THE Map_Service SHALL display friend location pins using their AI alien avatar as the pin icon, updated every 30 seconds via the @quant/realtime WebSocket connection.
4. WHEN the user taps a friend pin on the map, THE Map_Service SHALL display a popup card showing the friend's name, avatar, last active time, and a button to open chat.
5. WHEN the user enables Ghost_Mode in map settings, THE Map_Service SHALL stop broadcasting the user's location to all friends and hide the user's pin from friend maps within 5 seconds.
6. WHILE Ghost_Mode is disabled, THE Map_Service SHALL broadcast the user's location to the backend every 30 seconds.
7. WHEN the user switches to the Explore tab on the map, THE Map_Service SHALL render an activity heatmap overlay showing areas with high user activity density.
8. THE Map_Service SHALL support pinch-to-zoom, pan gestures, and animated transitions between zoom levels at 60fps.
9. IF geolocation permission is denied, THEN THE Map_Service SHALL display the map centered on a default location with a banner prompting the user to enable location access.
10. WHEN a friend's location updates, THE Map_Service SHALL animate the friend pin movement to the new position over 500ms.

### Requirement 8: Backend Persistence with Prisma and PostgreSQL

**User Story:** As a platform operator, I want all backend services to persist data in PostgreSQL via Prisma, so that data survives server restarts and scales reliably.

#### Acceptance Criteria

1. THE Persistence_Layer SHALL replace all in-memory data stores in the messages, conversations, media, calls, encryption, federation, and AR-lenses backend services with Prisma ORM backed by PostgreSQL.
2. THE Persistence_Layer SHALL define a Prisma schema including models for User, Conversation, Message, Media, Call, Reel, Story, FriendLocation, Notification, Streak, Avatar, and GameBadge.
3. WHEN a message is sent via the messages route, THE Persistence_Layer SHALL write the message record to PostgreSQL within 100ms of receipt.
4. WHEN the backend restarts, THE Persistence_Layer SHALL restore all previously stored data without loss.
5. THE Persistence_Layer SHALL support database migrations via Prisma Migrate for schema evolution without data loss.
6. WHEN a conversation is created, THE Persistence_Layer SHALL atomically create the conversation record and all participant association records in a single database transaction.
7. THE Persistence_Layer SHALL implement connection pooling with a minimum of 5 and maximum of 20 concurrent database connections per service instance.
8. IF a database write fails due to a transient error, THEN THE Persistence_Layer SHALL retry the operation up to 3 times with exponential backoff before returning a 503 error.
9. THE Persistence_Layer SHALL index all foreign key columns and frequently queried fields (userId, conversationId, createdAt) for query performance under 50ms for single-record lookups.

### Requirement 9: Push Notifications via Web Push API

**User Story:** As a user, I want to receive push notifications when I have new messages, calls, or social activity, so that I stay engaged even when the app is not in the foreground.

#### Acceptance Criteria

1. WHEN the user grants notification permission, THE Push_Service SHALL register a service worker and subscribe the browser to the Web Push API with VAPID authentication.
2. WHEN a new message arrives for a user who is not currently active in the app, THE Push_Service SHALL deliver a push notification to the user's subscribed devices within 3 seconds.
3. WHEN an incoming call is initiated, THE Push_Service SHALL deliver a high-priority push notification with a ringtone-capable notification tag.
4. WHEN a user's Streak is about to expire (within 4 hours of midnight), THE Push_Service SHALL send a streak-expiry warning notification.
5. WHEN a friend posts a new story, THE Push_Service SHALL deliver a notification to users who have enabled story notifications for that friend.
6. THE Push_Service SHALL support notification categories: messages, calls, stories, streaks, reels, and system alerts, each with independent enable/disable toggles in user settings.
7. WHEN the user taps a push notification, THE Push_Service SHALL deep-link the user to the relevant content (specific chat, call screen, story, or reel).
8. IF the push subscription expires or becomes invalid, THEN THE Push_Service SHALL re-register the subscription on the user's next app visit.
9. THE Push_Service SHALL batch non-urgent notifications (likes, comments) into a single summary notification if more than 5 arrive within a 2-minute window.
10. WHILE the app is in the foreground, THE Push_Service SHALL suppress browser-level push notifications and display in-app notification toasts instead.

### Requirement 10: Micro-Interactions and Addiction Loops

**User Story:** As a user, I want satisfying micro-interactions and engagement mechanics throughout the app, so that every interaction feels premium and rewarding.

#### Acceptance Criteria

1. WHEN the user performs a pull-to-refresh gesture on any feed, THE Micro_Interaction_Engine SHALL play a spring-physics animation with haptic-like CSS vibration feedback completing within 400ms.
2. WHEN the user likes a Reel or message, THE Micro_Interaction_Engine SHALL trigger a particle burst animation originating from the like button with 60fps rendering.
3. THE Micro_Interaction_Engine SHALL maintain and display a Streak counter for each friend pair, incrementing daily when both users exchange at least one message.
4. WHEN a Streak reaches a milestone (7, 30, 100, 365 days), THE Micro_Interaction_Engine SHALL trigger a celebratory full-screen animation and award a gamification badge.
5. THE Micro_Interaction_Engine SHALL implement Variable_Ratio_Reward delivery by occasionally (1 in 5 to 1 in 15 interactions) showing surprise reward animations (bonus XP, rare badge unlock, avatar accessory) upon routine actions.
6. WHILE the user scrolls any content feed, THE Micro_Interaction_Engine SHALL implement infinite scroll with no visible loading boundary, pre-fetching content 3 items ahead of the viewport.
7. THE Micro_Interaction_Engine SHALL render notification red dot badges on navigation items within 500ms of a new unread item arriving via the WebSocket connection.
8. WHILE another user is typing in a conversation, THE Micro_Interaction_Engine SHALL display an animated typing indicator with 3 pulsing dots that creates anticipation.
9. THE Micro_Interaction_Engine SHALL render FOMO_Ring animations around story circles for unviewed stories using a gradient ring animation at 60fps.
10. WHEN a Streak is about to break (less than 4 hours remaining), THE Micro_Interaction_Engine SHALL display a fire emoji animation pulsing on the chat thread with urgency coloring.
11. THE Micro_Interaction_Engine SHALL award XP points for daily actions (sending messages: 10XP, posting stories: 25XP, posting reels: 50XP, maintaining streaks: 15XP/day) and display a level progression bar in the profile.
12. WHEN the user earns a gamification badge, THE Micro_Interaction_Engine SHALL display a full-screen unlock animation with sound-ready event emission lasting 2 seconds.

### Requirement 11: Quant AI Agentic Control

**User Story:** As a user, I want an AI-powered alien avatar assistant that can auto-reply, summarize conversations, suggest replies, schedule messages, and act as my personal assistant inside chat, so that I can communicate more efficiently.

#### Acceptance Criteria

1. WHEN the user enables AI auto-reply mode for a conversation, THE Quant_AI_Agent SHALL generate contextually appropriate responses to incoming messages using the user's communication style and send them on the user's behalf within 5 seconds.
2. WHEN the user requests a conversation summary, THE Quant_AI_Agent SHALL analyze the last 50 messages (or since last summary) and produce a concise summary within 3 seconds.
3. WHILE the user is composing a message, THE Quant_AI_Agent SHALL display up to 3 suggested reply options above the keyboard based on conversation context, updating as the user types.
4. WHEN the user schedules a message, THE Quant_AI_Agent SHALL store the message in the Persistence_Layer and deliver the message at the specified date and time within 60 seconds of the scheduled time.
5. WHEN the user asks the AI assistant to manage notifications, THE Quant_AI_Agent SHALL categorize and prioritize incoming notifications, surfacing only high-priority items and batching low-priority items into a daily digest.
6. WHEN the user requests translation of a message, THE Quant_AI_Agent SHALL detect the source language and translate the message into the user's preferred language within 2 seconds.
7. WHEN the user requests content creation assistance, THE Quant_AI_Agent SHALL generate caption suggestions, story text, or reel descriptions based on the provided context or attached media.
8. THE Quant_AI_Agent SHALL present all AI-generated content with a visible "AI-generated" label to distinguish automated messages from user-authored messages.
9. WHEN the user disables AI auto-reply, THE Quant_AI_Agent SHALL immediately stop generating responses and mark queued unsent AI responses as cancelled.
10. THE Quant_AI_Agent SHALL process all AI operations using the @quant/ai package and the @quant/ml-runtime inference pipeline.

### Requirement 12: Full Snapchat Feature Parity — Memories

**User Story:** As a user, I want a Memories vault that stores my past snaps, stories, and saved content, so that I can revisit and re-share my favorite moments.

#### Acceptance Criteria

1. WHEN the user navigates to the Memories screen, THE Snapchat_Parity_Module SHALL display a grid of all previously captured photos, videos, saved stories, and saved reels ordered by date.
2. WHEN the user saves a snap or story, THE Snapchat_Parity_Module SHALL store the media in the user's Memories vault in the Persistence_Layer.
3. WHEN the user selects a memory item, THE Snapchat_Parity_Module SHALL display the full media with options to re-share to stories, send to friends, or download.
4. THE Snapchat_Parity_Module SHALL support search within Memories by date, location (if location was attached), and text content from captions.
5. WHEN the user deletes a memory, THE Snapchat_Parity_Module SHALL remove the media from the vault and underlying storage within 5 seconds, with a 5-second undo window.

### Requirement 13: Full Snapchat Feature Parity — Spotlight

**User Story:** As a user, I want a Spotlight section for community-curated top content, so that I can discover the best reels and stories from the QuantChat community.

#### Acceptance Criteria

1. WHEN the user navigates to the Spotlight tab, THE Snapchat_Parity_Module SHALL display a curated feed of top-performing Reels ranked by engagement metrics (likes, shares, watch-through rate).
2. THE Snapchat_Parity_Module SHALL refresh the Spotlight ranking algorithm every 15 minutes to surface trending content.
3. WHEN a user's Reel is featured in Spotlight, THE Snapchat_Parity_Module SHALL notify the creator via push notification and display a "Featured" badge on the Reel.
4. THE Snapchat_Parity_Module SHALL use the @quant/recommendation package to personalize Spotlight content based on user viewing history and preferences.

### Requirement 14: Full Snapchat Feature Parity — Chat Themes

**User Story:** As a user, I want to customize chat conversations with visual themes, so that each conversation has a unique and personalized feel.

#### Acceptance Criteria

1. WHEN the user opens chat settings for a conversation, THE Snapchat_Parity_Module SHALL display a theme picker with at least 10 predefined chat theme options.
2. WHEN the user selects a chat theme, THE Snapchat_Parity_Module SHALL apply the theme (background gradient, bubble colors, font style) to the conversation view within 200ms.
3. WHEN a chat theme is applied, THE Snapchat_Parity_Module SHALL persist the theme selection per-conversation in the Persistence_Layer and sync to all participants.
4. THE Snapchat_Parity_Module SHALL include alien-aesthetic themed options (nebula, quantum void, bioluminescent cave) that align with the QuantChat brand identity.

### Requirement 15: Full Snapchat Feature Parity — Group Video Calls

**User Story:** As a user, I want to start group video calls with multiple friends simultaneously, so that I can have face-to-face group conversations.

#### Acceptance Criteria

1. WHEN the user initiates a group video call from a group conversation, THE Call_System SHALL create a LiveKit room with capacity for up to 8 video participants.
2. WHEN a participant joins a group call, THE Call_System SHALL arrange all active video feeds in a responsive grid layout that adapts to the number of participants.
3. WHEN a participant speaks during a group call, THE Call_System SHALL highlight the active speaker's video tile with a border indicator within 200ms of voice activity detection.
4. WHEN the number of participants exceeds 4, THE Call_System SHALL switch to a focus mode showing the active speaker large with other participants in a thumbnail row.
5. WHEN a participant leaves a group call, THE Call_System SHALL remove their video tile and re-arrange the grid layout with a smooth 300ms animation.

### Requirement 16: Full Snapchat Feature Parity — Screen Share

**User Story:** As a user, I want to share my screen during video calls, so that I can show content, collaborate, or present to friends in real-time.

#### Acceptance Criteria

1. WHEN the user taps the screen share button during an active call, THE Call_System SHALL invoke getDisplayMedia and begin streaming the selected screen or window to all call participants within 2 seconds.
2. WHILE screen sharing is active, THE Call_System SHALL display the shared screen as the primary video feed for all participants and move camera feeds to thumbnail positions.
3. WHEN the user stops screen sharing, THE Call_System SHALL revert to the standard video call layout within 500ms.
4. THE Call_System SHALL display a persistent indicator to the sharing user confirming that screen sharing is active.
5. IF getDisplayMedia permission is denied, THEN THE Call_System SHALL display an informational message and maintain the standard call layout without interruption.

### Requirement 17: Full Snapchat Feature Parity — Games Hooks

**User Story:** As a user, I want to play mini-games with friends within chat conversations, so that I can have fun interactive experiences without leaving the app.

#### Acceptance Criteria

1. WHEN the user opens the games menu in a chat conversation, THE Snapchat_Parity_Module SHALL display a list of available mini-games loadable as iframe-embedded web apps.
2. WHEN the user selects a game, THE Snapchat_Parity_Module SHALL launch the game in a full-screen overlay and invite the other conversation participant to join.
3. WHEN a game session ends, THE Snapchat_Parity_Module SHALL display the final scores in the chat as a system message and award XP to participants.
4. THE Snapchat_Parity_Module SHALL expose a games SDK hook interface via the @quant/cross-app-gaming package for third-party game integration.
5. IF a game fails to load within 10 seconds, THEN THE Snapchat_Parity_Module SHALL display a timeout error and offer a retry option.

### Requirement 18: Disappearing Messages Enhancement

**User Story:** As a user, I want enhanced disappearing message controls with configurable timers, so that I have granular control over message ephemerality.

#### Acceptance Criteria

1. WHEN the user sets a disappear timer on a conversation, THE Snapchat_Parity_Module SHALL apply the selected duration (5s, 10s, 30s, 1min, 5min, 24h) to all new messages sent in that conversation.
2. WHEN a disappearing message timer expires after being viewed, THE Snapchat_Parity_Module SHALL delete the message from both sender and recipient views and from the Persistence_Layer.
3. WHEN the recipient screenshots a disappearing message, THE Snapchat_Parity_Module SHALL notify the sender with a screenshot-detected system message within 2 seconds.
4. THE Snapchat_Parity_Module SHALL display a countdown animation on disappearing messages showing remaining view time.

### Requirement 19: Performance and Animation Standards

**User Story:** As a user, I want all animations and transitions to feel smooth and premium, so that the app feels high-quality and responsive at all times.

#### Acceptance Criteria

1. THE Micro_Interaction_Engine SHALL render all UI animations at a consistent 60fps with no frame drops during standard interaction patterns (scrolling, swiping, tapping).
2. THE Micro_Interaction_Engine SHALL use spring-physics based animation curves (via Framer Motion) for all transition animations with configurable stiffness, damping, and mass values from the @quant/brand spring tokens.
3. WHEN the user navigates between app sections, THE Micro_Interaction_Engine SHALL complete the page transition animation within 300ms.
4. THE Micro_Interaction_Engine SHALL implement CSS-based haptic-like feedback using short-duration scale transforms (50ms) on all interactive elements upon tap.
5. WHILE content is loading, THE Micro_Interaction_Engine SHALL display skeleton loading states with a shimmer animation to maintain perceived performance.
6. THE Camera_Module SHALL achieve a first-frame render time of under 1 second from the moment the user navigates to the camera page (excluding permission dialogs).

### Requirement 20: Real-Time Connectivity and WebSocket Infrastructure

**User Story:** As a platform operator, I want a robust real-time connectivity layer, so that all live features (typing indicators, presence, location updates, call signaling, notifications) operate reliably.

#### Acceptance Criteria

1. THE Persistence_Layer SHALL maintain a persistent WebSocket connection per active client session using the @quant/realtime package, with automatic reconnection on disconnect within 3 seconds.
2. WHEN a WebSocket connection is established, THE Persistence_Layer SHALL authenticate the connection using the existing JWT token and associate it with the user session.
3. WHILE a WebSocket connection is active, THE Persistence_Layer SHALL deliver real-time events for: new messages, typing indicators, presence changes, location updates, call signaling, notification delivery, and streak updates.
4. IF the WebSocket connection fails to reconnect after 5 attempts, THEN THE Persistence_Layer SHALL fall back to HTTP long-polling for critical events (messages, call signaling) and display a degraded-connectivity indicator to the user.
5. THE Persistence_Layer SHALL support multiplexing multiple event channels (chat, calls, map, notifications) over a single WebSocket connection to minimize resource usage.
