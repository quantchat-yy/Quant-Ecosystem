# Quant AI Voice Control - Cross-App Agent Architecture

**Status:** IN DEVELOPMENT  
**Author:** Qwen (CTO)  
**Date:** 2026-06-13  
**Priority:** P0 - Meta/Google Killer Feature

---

## Vision

> User sirf bolega, Quant AI saare apps control karega.

"Quant Neon me reels scroll karo" → Quant AI scrolls reels in Quant Neon.  
"Quant Sync me DMs check karo" → Quant AI opens DMs in Quant Sync.  
"Quant Tube pe gaming videos dikhavo" → Quant AI searches and plays gaming videos.  
"Next email summarize karo" → Quant AI summarizes next email in Quant Mail.

**This is the moat.** Google/Meta/Apple have separate apps with separate assistants. Quant has ONE agent that controls every app with shared memory and context.

---

## Architecture

```
[User Voice]
    ↓
[Voice Input / STT] (packages/voice-input or browser API)
    ↓
[Quant AI Agent]
    ↓
[VoiceIntentParser] → parsed intent: { app, action, params }
    ↓
[SafetyGuardrail] → permission check, harm filter
    ↓
[CrossAppCommandBus]
    ↓
[AppController] → routes to target app
    ↓
[App Subscriber] (quantneon/quantsync/quanttube/etc)
    ↓
[UI Action] (scroll, navigate, play, click, type)
```

---

## Components

### 1. CrossAppCommandBus (`packages/agentic/src/cross-app/command-bus.ts`)

- Central pub/sub bus for app-to-app and agent-to-app commands
- Uses BroadcastChannel API for cross-tab communication
- Falls back to window.postMessage for older browsers
- Type-safe command schema with Zod validation

### 2. VoiceIntentParser (`packages/agentic/src/voice/voice-intent-parser.ts`)

- Parses natural language commands into structured intents
- Uses pattern matching + LLM fallback
- Examples:
  - "scroll reels in quant neon" → `{ app: 'quantneon', action: 'scroll', params: { type: 'reels', direction: 'down' } }`
  - "open DMs in quant sync" → `{ app: 'quantsync', action: 'navigate', params: { screen: 'messages' } }`
  - "play next video" → `{ app: '*', action: 'media.next', params: {} }`

### 3. AppController (`packages/agentic/src/cross-app/app-controller.ts`)

- Maintains registry of installed/enabled apps
- Routes commands to correct app
- Handles app state queries ("which app is active?")
- Enforces permission matrix per app/action

### 4. SafetyGuardrail (`packages/agentic/src/safety/voice-safety.ts`)

- Blocks destructive actions without confirmation
- Rate limiting for rapid commands
- Prevents cross-app data exfiltration
- Logs all voice commands for audit

### 5. Shared UI Voice Command Bar (`packages/shared-ui/src/components/VoiceCommandBar/`)

- Floating microphone button
- Live transcript display
- Visual feedback when command is executing
- Confirmation dialogs for sensitive actions

### 6. App Subscribers

- Each app registers a handler for incoming commands
- Uses React hook: `useVoiceCommand()`
- Actions implemented per app:
  - **quantneon**: scroll reels, like, share, open profile
  - **quantsync**: scroll feed, open DMs, post, like
  - **quanttube**: play/pause, next video, search, subscribe
  - **quantchat**: send message, open chat, scroll
  - **quantmail**: summarize, reply, archive, next email
  - **quantdocs**: create doc, summarize, edit
  - **quantcalendar**: add event, show schedule

---

## Command Schema

```typescript
interface VoiceCommand {
  id: string;
  source: 'voice' | 'text' | 'agent';
  targetApp: string; // 'quantneon' | 'quantsync' | '*' etc.
  action: string;
  params: Record<string, unknown>;
  userId: string;
  timestamp: Date;
  requireConfirmation?: boolean;
}

interface CommandResult {
  success: boolean;
  commandId: string;
  app: string;
  message: string;
  data?: unknown;
}
```

---

## Safety & Permissions

| Action Category       | Default Permission           | Example                         |
| --------------------- | ---------------------------- | ------------------------------- |
| Read/Navigate         | Allow                        | "open DMs", "show schedule"     |
| Scroll/Play           | Allow                        | "scroll reels", "play video"    |
| Create/Post           | Ask                          | "post tweet", "send email"      |
| Delete/Archive        | Ask                          | "delete email", "uninstall app" |
| Purchase/Payment      | Deny (require explicit auth) | "buy subscription"              |
| Cross-app data access | Ask                          | "send email from calendar"      |

---

## Implementation Phases

### Phase 1: Core Infrastructure (Now)

- Command bus
- Intent parser
- App controller
- QuantAI agent integration
- Voice command bar UI

### Phase 2: App Integrations

- quantneon (reels scroll, like, share)
- quantsync (feed scroll, DMs, post)
- quanttube (video controls, search)
- quantmail (email actions)

### Phase 3: Intelligence

- Context-aware commands ("play the video I was watching")
- Multi-step workflows ("summarize my emails, then reply to urgent ones")
- Proactive suggestions ("You have a meeting in 10 min, want me to open it?")

---

## Success Metrics

- [ ] User can control 5+ apps via voice
- [ ] Intent parser accuracy > 90% for common commands
- [ ] Command execution latency < 500ms
- [ ] Zero unauthorized destructive actions
- [ ] Demoable: "scroll reels in quant neon" works end-to-end

---

## Why This Kills Meta/Google

1. **Unified agent across apps** — They have separate assistants (Siri, Google Assistant, Alexa) that can't control third-party apps deeply.
2. **Shared context** — Quant AI remembers what you did in Mail, Chat, Docs, Tube and uses that context everywhere.
3. **Open ecosystem** — Third-party apps can register as command subscribers.
4. **Voice-first OS layer** — Not just voice search; full app control.
