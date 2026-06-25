# Chat Huddle (Audio) — Design Spec

**Date:** 2026-06-25
**Branch:** `call`
**Surface:** `/chat` (Catalyst chat-v2)
**Status:** Approved design, pre-implementation

---

## 1. Summary

Add a **huddle** feature to Catalyst chat: a real-time, **audio-only**, **two-person** voice call started from a DM or a project channel. When a huddle is active, the conversation shows a **green active-line** indicator. The call controls dock into a **persistent header strip** that survives navigating away from `/chat` and stays until the user leaves the call.

**Explicitly audio-only. No video.**

---

## 2. Scope (locked decisions)

| Decision | Answer |
|---|---|
| Media | Real live audio via WebRTC. No video. |
| Participants | Strictly 2 (peer-to-peer). Data model expandable to N later. |
| Topology | Browser-to-browser P2P. No media server / SFU. |
| NAT traversal | STUN-only (Google public). ICE config reads optional TURN creds from env — empty now, zero-code-change to add later. |
| Contexts | DM (the 2 DM members) + project channel (starter + first joiner, cap 2). |
| Green line | Active-huddle indicator on the conversation in the sidebar + in-conversation panel. |
| Persistence | Call strip stays docked in global header on any route until user leaves. |
| Environment | Staging-first (`cyijbdeuehohvhnsywig`), promote to prod only after staging passes. |

**Out of scope (this spec):** video, 3+ participants, screen share, recording, managed TURN account, ringing / missed-call notifications. All addable on this model later.

---

## 3. Architecture

### 3.1 Topology
Two browsers connect directly via a single `RTCPeerConnection` carrying one **audio** track each direction. Each client:
1. `getUserMedia({ audio: true })` → local mic stream.
2. Adds the local audio track to the peer connection.
3. Receives the remote audio track, attaches it to a hidden `<audio autoplay>` element.

No server relays media (STUN-only). Cap-2 means no SFU is required.

### 3.2 Signaling
Reuse the existing Supabase Realtime broadcast substrate (`src/lib/chat/ChatRealtimeManager.ts`). New **ephemeral** channel:

```
huddle-signal:${conversationId}
```

Message events (broadcast payloads, no DB writes):
- `join` — peer announces presence, triggers offer creation by the existing peer
- `offer` — SDP offer `{ from, sdp }`
- `answer` — SDP answer `{ from, sdp }`
- `ice-candidate` — `{ from, candidate }`
- `leave` — peer leaving

Signaling is transient; durable state lives in the tables below.

### 3.3 ICE configuration
```ts
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  // TURN slot — populated from env, empty today:
  ...(import.meta.env.VITE_TURN_URL
    ? [{ urls: import.meta.env.VITE_TURN_URL,
         username: import.meta.env.VITE_TURN_USER,
         credential: import.meta.env.VITE_TURN_CRED }]
    : []),
];
```

---

## 4. Data Model

Two new tables. Staging-first migrations, then prod promotion.

### 4.1 `chat_huddles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `conversation_id` | uuid FK → `chat_conversations.id` | not null |
| `started_by` | uuid (user) | not null |
| `status` | text | `'active' | 'ended'`, default `'active'` |
| `created_at` | timestamptz | default now() |
| `ended_at` | timestamptz | null until ended |

**Partial unique index:** `UNIQUE (conversation_id) WHERE status = 'active'` → at most one live huddle per conversation.

### 4.2 `chat_huddle_participants`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `huddle_id` | uuid FK → `chat_huddles.id` | not null, on delete cascade |
| `user_id` | uuid (user) | not null |
| `joined_at` | timestamptz | default now() |
| `left_at` | timestamptz | null while in call |
| `is_connected` | boolean | default true; heartbeat-maintained |

**Cap-2** enforced app-side now (count active participants before insert). Column model already supports N later.

### 4.3 RLS (critical)
Gate every policy through the existing SECURITY DEFINER helper `chat_is_member(conversation_id, auth.uid())` — **no inline self-referential subqueries** (avoids 42P17 recursion and the param-shadowing always-true leak documented in CLAUDE.md 2026-06-03 / 2026-06-10).

- `chat_huddles` SELECT: `chat_is_member(conversation_id, auth.uid())`
- `chat_huddles` INSERT/UPDATE: `chat_is_member(conversation_id, auth.uid())`
- `chat_huddle_participants` SELECT/INSERT/UPDATE: member of the huddle's conversation (join to `chat_huddles` then `chat_is_member`), plus `user_id = auth.uid()` short-circuit on writes (PostgREST v12 INSERT+RETURNING trap).

**Mandatory:** run the 2-user RLS isolation test (member sees N, stranger sees 0) before declaring RLS done.

### 4.4 Realtime fan-out
- Per-conversation `postgres_changes` on `chat_huddles` (filter `conversation_id=eq.X`) → in-conversation panel state.
- Sidebar-level subscription on `chat_huddles` (active rows for the user's conversations) → green active-line across the list.

---

## 5. State Management

### 5.1 Global huddle store (zustand) — `useHuddleStore`
Holds the ONE active huddle. Lives at **app-shell scope**, not inside the chat feature tree, so route changes do not unmount it.

```ts
interface HuddleState {
  active: null | {
    conversationId: string;
    huddleId: string;
    conversationName: string;
    participants: HuddleParticipant[];
    micMuted: boolean;
    connectionState: RTCPeerConnectionState;
  };
  // non-serializable refs kept outside React render path:
  // peerConnection, localStream, remoteStream, signaling channel
  startHuddle(conv): Promise<void>;
  joinHuddle(conv, huddleId): Promise<void>;
  leaveHuddle(): Promise<void>;
  toggleMute(): void;
}
```

The `RTCPeerConnection`, local/remote `MediaStream`, and the hidden `<audio>` element are owned here (via module-level refs or a singleton controller) so the call persists across navigation.

### 5.2 `HuddleConnection` controller
A dedicated class wrapping `RTCPeerConnection` + signaling glue. Separate concern from `AudioCaptureService` (dictation ≠ call) — references its `getUserMedia` pattern but does not fork it. Responsibilities: create/answer offers, ICE exchange over the broadcast channel, track attach, teardown.

---

## 6. UI Surfaces

All `@atlaskit/*` primitives + ADS tokens. Zero hardcoded hex (audit gate enforced).

1. **Start button** — headphone icon in `MessagePanelHeader.tsx`, on DM + channel. Click → insert `chat_huddles` row → join → open mic.
2. **Green active-line** — sidebar `ConversationRow` / `DmRichRow` / `ChannelRow` gets a green left rail + headphone badge using `var(--ds-border-success)` / `var(--ds-icon-success)`. Driven by the sidebar `chat_huddles` subscription.
3. **In-conversation huddle panel** — strip above the message list when the open conversation has an active huddle: participant avatars (`@atlaskit/avatar`), `@atlaskit/spinner` while ICE negotiates, **Join** (if not in / not full) or **Leave** + **mute** (if in). "Huddle in progress (full)" disabled state at 2.
4. **Persistent header strip** — mounted in `CatalystShell` as a sibling of `<Outlet/>` below `CatalystHeader`, visible whenever `useHuddleStore.active != null` on ANY route. Green bar: conversation name · participant avatars · mic toggle · **Leave**. Click name → navigate to that `/chat` conversation.

---

## 7. Lifecycle & Edge Cases

| Event | Behavior |
|---|---|
| Leave | mark participant `left_at`, stop tracks, close peer; if last participant → huddle `status='ended'`, `ended_at=now()`. Store cleared → strip disappears. |
| Tab close / refresh | `beforeunload` best-effort `leave`; `is_connected` heartbeat ages out a dead peer. |
| Mic permission denied | `@atlaskit/flag` error toast, abort join, no half-state. |
| 3rd person | Join disabled — "Huddle in progress (full)". |
| Both gone | huddle ends; green line clears everywhere via realtime. |
| Connection failed (no TURN, restrictive NAT) | surface `connectionState='failed'` in panel + strip; offer Leave/Retry. |

---

## 8. Reuse (P0 reuse-first compliance)

- Signaling: **extend** `ChatRealtimeManager`, do not fork.
- UI: `@atlaskit/avatar`, `@atlaskit/button`, `@atlaskit/spinner`, `@atlaskit/flag`, `@atlaskit/tooltip`, `@atlaskit/icon`.
- Mic capture: reference `AudioCaptureService` `getUserMedia` pattern; keep `HuddleConnection` as its own class.
- RLS: reuse existing `chat_is_member` SECURITY DEFINER helper.

---

## 9. Testing

- Unit: `HuddleConnection` offer/answer state machine (mock `RTCPeerConnection`); cap-2 guard; store transitions.
- RLS: 2-user isolation test on staging (member sees huddle, stranger sees 0).
- Manual: two browser profiles, real mic, DM huddle + channel huddle; green line appears for both; persistent strip survives route change; leave clears state both sides.
- ADS audit: `node design-governance/cli/index.js audit src/<touched files>` clean before commit.

---

## 10. Build Order (high level — detailed plan follows)

1. Staging migrations: tables + indexes + RLS + helper-based policies; 2-user isolation test.
2. `HuddleConnection` controller + ICE config + `getUserMedia`.
3. Signaling on `ChatRealtimeManager` (huddle-signal channel).
4. `useHuddleStore` global store at app-shell scope.
5. Data hooks: `useHuddle(conversationId)`, `useActiveHuddles()` (sidebar), mutations (start/join/leave).
6. UI: start button → in-conversation panel → green active-line → persistent header strip.
7. Edge cases: beforeunload, mic-denied flag, full state, failed connection.
8. ADS audit + manual 2-browser verification + prod promotion.
