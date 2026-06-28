# Huddle Window — Slack-style call surface

**Date:** 2026-06-28
**Status:** Design approved (pending user spec review)
**Area:** chat-v2 / huddle

## Problem

Today, accepting/starting a huddle on `/chat` shows a small floating FAB
(`HuddleFab`) plus a separate resizable screen-share window (`HuddleScreenView`).
The user wants a single large Slack-style huddle window that opens when a call is
received: participant tile(s) + screen share on the left, a Thread panel with a
message composer on the right, and a control bar at the bottom. Messages typed
during the huddle must persist to the conversation thread and be readable after
the call ends. A "huddle happened" summary event must post to the thread on leave.

## Goal / "Done" looks like

- Receiving or starting a huddle opens one large **draggable + resizable**
  `HuddleWindow`.
- Window contains: header, screen-share + participant stage (left), Thread panel
  with composer (right, toggleable), control bar (Mute · Screen share · Chat
  toggle · Leave).
- Minimize collapses the window back to the existing small `HuddleFab`.
- Messages sent from the in-window composer post into the conversation's
  `chat_messages` (same thread shown in `/chat`) and appear in the right panel.
- Right panel starts empty (Slack-style intro), then shows only messages sent
  **during** the current huddle session.
- On leave, a `huddle_summary` event message posts to the conversation thread,
  rendering as "🎧 A huddle happened — in the huddle for Nm".

## Non-scope (explicitly NOT building)

- Camera/webcam video (audio + screen share only — matches current capability).
- Multi-party (>2) calls. WebRTC `HuddleConnection` stays 2-person.
- **Add people** button (deferred — needs multi-party first).
- Raise-hand, emoji reactions, "Also send as DM" checkbox.
- Any new capability not already present — reuse existing handlers only.

## Existing building blocks (reused as-is, NOT rebuilt)

| Piece | File | Reuse |
|---|---|---|
| WebRTC / TURN / signaling | `HuddleConnection.ts`, `signaling.ts`, `iceConfig.ts` | unchanged |
| Store + actions | `huddleStore.ts` (`toggleMute`, `startScreen`, `stopScreen`, `leave`, `enter`) | extended (see below) |
| Incoming popup | `components/layout/HuddleIncoming.tsx` | unchanged; accept still calls enter → now opens window |
| Floating widget (minimized state) | `components/layout/HuddleFab.tsx` | kept as minimized form; waveform AnalyserNode reused |
| Screen view logic | `HuddleScreenView.tsx` | annotation canvas + data-channel logic lifted into window stage |
| Composer | `features/chat-v2/components/Composer/Composer.tsx` (`onSend(markdown)`) | reused in Thread panel |
| Messages hook | `useMessages(conversationId)` → `{ messages, sendMessage }` | reused; filtered to session |
| Hooks | `useHuddleData` (`useIncomingHuddle`, `useActiveHuddle`, `useHuddleActions`) | unchanged |

## Components & changes

### 1. `HuddleWindow.tsx` (new)

- Mounted in `CatalystShell` (app-shell scope; survives route change, same as FAB).
- Renders only when `useHuddleStore.active` is set **and** `windowState !== 'minimized'`.
- Draggable + resizable; position/size persisted in localStorage (reuse FAB's
  snap/persist pattern).
- **Header:** 🎧 `Huddle with {conversationName}` · minimize button (sets
  `windowState='minimized'` → FAB shows) · maximize toggle.
- **Stage (left, flex):**
  - Screen-share tile: renders `remoteScreenStream` (priority) or own
    `localScreenStream`; annotation canvas + RTCDataChannel marker logic lifted
    from `HuddleScreenView`.
  - Participant tile(s): avatar + live audio waveform (existing AnalyserNode).
  - No camera video.
- **Thread panel (right, ~360px, toggle via `chatPanelOpen`):**
  - Empty-state intro ("Every huddle has a thread…") when no session messages.
  - Message list filtered to messages with `created_at >= huddle join time`
    (session messages) from `useMessages(active.conversationId)`.
  - `Composer` with `onSend={md => sendMessage(md)}` → inserts into `chat_messages`.
- **Control bar (bottom):** Mute (`toggleMute`) · Screen share
  (`startScreen`/`stopScreen`) · Chat toggle (`chatPanelOpen`) · Leave (`leave`).

### 2. `huddleStore.ts` (extended)

- Add `windowState: 'open' | 'minimized' | 'maximized'` (supersedes the standalone
  `screenWindow` field; migrate its usages).
- Add `chatPanelOpen: boolean` (default false — Slack opens with chat hidden;
  confirm default during planning).
- `enter()` sets `windowState: 'open'`.
- `leave()` inserts the `huddle_summary` event message (idempotent — see schema).
- FAB visibility condition becomes `active && windowState === 'minimized'`.

### 3. Schema — `chat_messages` event message (new migration)

`chat_messages` currently has no message-type column. Add:

```sql
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS event_type text,        -- NULL = normal message
  ADD COLUMN IF NOT EXISTS event_meta jsonb;       -- e.g. { duration_seconds, participant_ids }
```

- Normal messages leave both NULL — no behavior change.
- On `leave()`, insert one row with `event_type = 'huddle_summary'`,
  `body_text = 'A huddle happened'`, `event_meta = { duration_seconds, participant_ids }`.
- **Idempotency:** only one summary per huddle. Approach (decide in plan): the
  last leaver inserts, OR insert keyed on `huddle_id` in `event_meta` with a guard
  query / unique partial index to prevent duplicates from both clients.
- Message renderer (`MessageList` / message row component): when
  `event_type === 'huddle_summary'`, render the centered "🎧 A huddle happened —
  in the huddle for Nm" row instead of a normal bubble. Find the render site
  during planning (likely the message item component in chat-v2).

## Open items to resolve during planning

- Exact FAB drag/persist util to reuse for the window.
- Render site of the message row to add the `huddle_summary` event branch.
- Duplicate-prevention mechanism for the summary insert (guard query vs partial
  unique index on `(conversation_id, event_type, (event_meta->>'huddle_id'))`).
- Whether `screenWindow`'s existing maximized/normal consumers fully migrate to
  `windowState` or coexist during transition.
- RLS: confirm inserting an `event_type` row passes existing `chat_messages`
  insert policy (author_id = auth.uid()).

## Validation

- Start huddle → large window opens; minimize → FAB; restore → window.
- Screen share start/stop renders inside the window; annotations work.
- Mute toggles mic; audio waveform animates.
- Type in window composer → message appears in window panel AND in `/chat` thread;
  persists after leave.
- Leave → exactly one "A huddle happened" row in the thread with correct duration.
- ADS tokens only; no hand-rolled banned UI (reuse Composer, ADS primitives for
  window chrome / buttons).
