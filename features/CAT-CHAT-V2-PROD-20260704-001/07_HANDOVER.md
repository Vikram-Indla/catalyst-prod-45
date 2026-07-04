# Handover — CAT-CHAT-V2-PROD-20260704-001 (2026-07-04)

## State: COMPLETE (session 001). Verdict: AMBER→GREEN-leaning (see final report in session log).

## What was verified true (baseline reconciliation)
- CHAT_V2_CONTEXT.md (dated 2026-06-18) is accurate for file map, features, hooks, RLS.
- Repo is AHEAD of the doc: huddles are REAL WebRTC audio (native RTCPeerConnection mesh ≤4,
  `src/lib/chat/huddle/`, `turn-credentials` edge fn deployed), presence, drafts, later/reminders
  all shipped after the doc was written. Doc §8 "pending deployments" is stale — all applied on cyij.
- RLS: SECURITY DEFINER `chat_is_member` everywhere, recursion-safe, no isolation gaps found.
- chat-v1 is unrouted; ChatDock hides on /chat. No duplicate-route confusion.

## Staging (cyij) drift REPAIRED this session (marked-applied-but-not-executed DDL)
- Created missing `ph_user_status` table + RLS + grants (app was querying a missing table).
- Added `chat_message_reactions`, `ph_user_status` to supabase_realtime publication; REPLICA IDENTITY FULL.
- Created missing cron jobs: `chat-deliver-scheduled-messages` (per-minute) and `chat-archive-weekly`.
  Scheduled send was silently never delivering before this.

## Code shipped (commit on main)
- Reactions realtime: `ChatRealtimeManager.subscribeReactions` (app-wide ref-counted channel) +
  cache-aware invalidation in `useMessages`. Verified live (SQL insert → UI chip, no refresh).
- Typing indicator: new `chat-v2/hooks/useTypingPresence.ts` over existing broadcast infra;
  wired into MessagePanel/Composer; "X is typing…" line above composer.
- Unread divider: watermark captured in ChatV2Shell.handleSelect BEFORE mark-read; red
  "New messages" line in MessageList. Verified live in DM + channel.
- Self-send unread bug: sending now bumps own last_read_at to the inserted row's created_at.
- No-op menu items removed: Connect to apps / Add to list / Turn off notifications-for-replies;
  Pins+Activity "Edit" disabled honestly. Menu got aria-haspopup/aria-expanded + arrow-key nav + autofocus.
- RTL slice: dir="auto" on message bodies (unicode-bidi plaintext), composer, activity rows,
  DM previews, attachment filenames. Verified live with Arabic message.
- Huddle-full toast copy fixed (2 → 4 people).

## Known remaining (deferred, documented)
- Mobile <1024px layout; read receipts (no schema); slash commands; fenced code blocks;
  notification-preferences modal; SFU for >4 huddle participants; i18n of chat-v2 strings
  (login page has ar/en infra, chat-v2 is hardcoded English); full shell RTL mirroring.
- Voice-flow double-space hotkey (global feature) can hijack Space while composing — product decision, not chat-v2.
- Some activity rows show "Someone" — staging seed users missing profile rows (data, not code).
- Silent error-swallowing pattern across chat hooks (intentional degradation, zero logging).

## Validation evidence
- tsc 0 errors; vitest chat suites 58/58 pass (incl. new MessageList.unread + useTypingPresence tests);
  vite build exit 0; light-mode screenshots captured for /chat, DM, channel, activity, thread,
  later, drafts, search, Arabic RTL.
