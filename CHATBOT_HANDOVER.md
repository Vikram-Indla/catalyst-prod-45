# Catalyst Chat — Build Handover

> Self-contained handover to resume building **Catalyst Chat** (an in-app, ticket-bound, Slack-style messaging feature) on a different machine. Paste this as the first message of the next session.

**Last updated:** 2026-06-04
**Active branch:** `Products-chat-dock-mount-01` → **PR #226** (open, not merged)
**Doc branch:** `chatbot` (this file)
**Prod Supabase project:** `lmqwtldpfacrrlvdnmld` (`https://lmqwtldpfacrrlvdnmld.supabase.co`)

---

## 0. TL;DR — where things stand

- **Phase 0 (ticket threads + project channels) is MERGED to `main`** via PR #225.
- **Everything else** (DMs, reactions, edit, delete, @mentions, rich composer, emoji, AI, typing, mark-read, search, un-archive, the global dock) lives on branch **`Products-chat-dock-mount-01` / PR #226 — open, not merged.**
- The build follows a hard rule: **REUSE Catalyst's canonical comment components, do not rebuild.** The chat conversation pane mounts `catalyst-ds/comments/CommentThread` wholesale via an adapter.
- **All 5 chat migrations are already applied to prod.** No seed data remains (chat tables are empty by design).
- **Verified** at code + DB level (incl. 2-user RLS isolation for channels/tickets AND DMs). **One end-to-end gap:** browser-automation could not reliably drive the Tiptap rich editor, so message **send/react/edit/mention were not confirmed by a UI click-through** (they are code-correct + DB-sim-verified). Confirm with a manual type-test or an integration test.

---

## 1. New-laptop setup

```bash
git clone git@github.com:Vikram-Indla/catalyst-prod-45.git
cd catalyst-prod-45
git fetch origin
git switch chatbot            # this handover  (or: Products-chat-dock-mount-01 for the code)
# IMPORTANT: use bun, not npm — npm install breaks the @atlaskit editor graph
#   (ensure bun is on PATH: https://bun.sh)
bun install
bun run dev                    # serves on http://localhost:8080  (NEVER 8081)
```

- **Dev server is always `localhost:8080`.** The chat surface is `http://localhost:8080/chat`.
- **Supabase:** project ref `lmqwtldpfacrrlvdnmld`. Anon key is in `CLAUDE.md` (§ "PRODUCTION INFRASTRUCTURE SNAPSHOT"). Schema changes go through `supabase/migrations/` applied via the Supabase MCP `apply_migration` (the CLI needs the DB password, which you likely don't have locally).
- **Read `CLAUDE.md` first** — it is law (ADS tokens only, no `git add -A`, ask-before-merge, reuse-don't-reimplement, etc.).

---

## 2. The architecture decision (the most important thing to understand)

The chat **conversation pane does not have bespoke message UI.** It mounts the **canonical, generic** Catalyst comment thread and feeds it chat data through an adapter:

```
ChatMainView (active pane)
  └─ <CommentThread>            // src/components/catalyst-ds/comments/CommentThread.tsx
        ├─ <Comment> rows       // reactions, emoji picker, reply, quote, copy, EDIT/DELETE menu
        └─ <CommentEditor>      // RichTextEditor + @mentions + emoji + quick replies + Caty "Improve writing" AI
     fed by: chatMessageToCds() / chatPersonToCds()   // src/lib/chat/chatToCds.ts
     handlers: sendMessage / editMessage / deleteMessage / toggleReaction
```

**This single mount delivers reactions, edit, delete, @mentions, rich composer, emoji, quick replies, and AI** — all reused, zero new UI. If you need to change message-row behaviour, change the **handlers** or the **adapter**, not a parallel component.

### What was reused (confirmed)
| Capability | Reused from |
|---|---|
| Message rows + reactions + edit/delete menu + emoji | `catalyst-ds/comments/{CommentThread,Comment}.tsx` |
| Composer (rich text, @mention, emoji, quick replies, AI improve) | `catalyst-ds/comments/CommentEditor.tsx` → `Description/RichTextEditor.tsx` |
| Mention stack (picker, Tiptap node, ADF round-trip) | `Description/_components/MentionPicker`, `extensions/Mention.ts`, `utils/{adfToTiptap,tiptapToAdf}.ts` |
| Reaction toggle pattern | `src/hooks/useCommentReactions.ts` (pattern cloned into `useChatMessageActions`) |
| AI | `ai-improve-story` (summary), `ai-improve-comment` (improve, inside CommentEditor) — **no new AI** |
| Presence | `useUserStatus`/`usePresence` (`user_presence`) |
| Roster | `resource_inventory` (NOT `ph_project_members`, which is stale) |
| Mention→notification | pattern from `ph_issues_notify_trigger` + `notify-dispatch` |

---

## 3. Database (all applied to prod `lmqwtldpfacrrlvdnmld`)

### Tables
- `chat_conversations` — `id, kind('ticket'|'channel'|'dm'), ticket_key, project_key, title, is_archived, archived_at, last_message_at, last_message_preview, created_by, created_at, updated_at`
- `chat_conversation_members` — PK `(conversation_id, user_id)`, `role, last_read_at, is_muted, joined_at`
- `chat_messages` — `id, conversation_id, parent_id (threads), author_id, body_text, body_adf jsonb, edited_at, deleted_at (soft delete), created_at`
- `chat_message_reactions` — `id, message_id, user_id, emoji`, unique `(message_id,user_id,emoji)`
- `chat_messages_archive` — cold storage; `id` PK

### Migrations (in `supabase/migrations/`, all applied)
1. `20260603000000_chat_engine.sql` — tables, RLS, 12 indexes (incl. FTS GIN on `body_text`), soft-delete, `last_message_at` touch trigger, **membership-bootstrap trigger** (`chat_add_members_on_create`), ticket-close archive trigger, **weekly `pg_cron` idle-archive sweep** (`chat-archive-weekly`, Sun 02:00, idle > 21 days).
2. `20260603000100_chat_rls_recursion_fix.sql` — **`chat_is_member(uuid,uuid)` SECURITY DEFINER** helper; rewrote members/conversations/messages SELECT policies to use it (fixes 42P17 self-reference recursion).
3. `20260603000200_chat_last_message_preview.sql` — adds `last_message_preview` column + maintains it in the touch trigger + backfill.
4. `20260604000000_chat_finish.sql` — allows `kind='dm'`; **`chat_extract_mention_ids(jsonb)`** (recursive ADF walk) + **`chat_notify_mentions` AFTER INSERT trigger** (`mentioned_in_chat` notifications); **un-archive + rehydrate trigger** on `ph_issues` reopen.
5. `20260604010000_chat_create_dm_rpc.sql` — **`chat_create_dm(other_user_id)` SECURITY DEFINER RPC** (pair-dedup, adds BOTH members atomically; GRANT EXECUTE to authenticated).

### RLS (the security model — TEST WITH 2 USERS before any change)
- Membership checks route through **`chat_is_member()` (SECURITY DEFINER)** — **never** inline `EXISTS` against the membership table (causes 42P17 recursion; see `CLAUDE.md` 2026-06-03 lesson).
- `chat_messages` SELECT keeps the **`author_id = auth.uid()` short-circuit** (PostgREST v12 INSERT+RETURNING trap, `CLAUDE.md` 2026-05-29).
- INSERT is member-gated. A non-member CANNOT read/insert. **2-user isolation verified for channels, tickets, AND DMs** (non-member sees 0, member sees 1).
- To create a DM from the client, **call the RPC** (`chat_create_dm`) — a plain client insert cannot add the *other* member under member-gated RLS.

### How to apply / test SQL
- Apply: Supabase MCP `apply_migration(project_id="lmqwtldpfacrrlvdnmld", name, query)`.
- 2-user RLS test pattern (run via `execute_sql`):
  ```sql
  BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"<user-uuid>","role":"authenticated"}';
  SELECT count(*) FROM public.chat_messages WHERE conversation_id='<id>';
  ROLLBACK;
  ```
  (Note: a volatile function's inserts inside a CTE aren't visible to the same statement — count in a *separate* statement.)

---

## 4. Source files map

### New chat module
```
src/types/chat.ts                          ChatConversation/Message/Person/Reaction types
src/lib/chat/ChatRealtimeManager.ts        single multiplexed Supabase realtime connection
src/lib/chat/chatMappers.ts                pure DB-row → type mappers (11 unit tests)
src/lib/chat/chatToCds.ts                  ChatMessage→CdsComment, ChatPerson→CdsUser adapter (the reuse glue)
src/hooks/chat/ChatRealtimeProvider.tsx    context provider for the realtime manager
src/hooks/chat/useConversations.ts         conversation list + unread counts (last_read_at)
src/hooks/chat/useMessages.ts              message feed + sendMessage (ADF→body_adf+body_text) + realtime invalidation
src/hooks/chat/useChatMessageActions.ts    toggleReaction / editMessage / deleteMessage (soft)
src/hooks/chat/useChatPeople.ts            presence-grouped roster (resource_inventory)
src/hooks/chat/useTypingIndicator.ts       typing via realtime broadcast
src/hooks/chat/useConversationSummary.ts   AI summary via ai-improve-story
src/hooks/chat/useCreateConversation.ts    createDM (via chat_create_dm RPC) + createChannel
src/components/chat/ChatMainView.tsx       3-pane shell; mounts CommentThread in the active pane
src/components/chat/ChatDockMount.tsx      always-on global dock container (collapsed by default)
src/components/chat/NewMessageModal.tsx    "New message" people/channel picker
src/components/chat/ConversationSummary.tsx AI summary surface
src/components/chat/chat.css                chat layout styles (ADS tokens only)
src/components/chat/main/{ConversationList,ConversationHeader,IconRail,avatar}.tsx
src/components/chat/dock/{ChatDock,QuickSwitcher,dock.css}
src/components/chat/__tests__/chat-data.test.ts   11 mapper unit tests
src/pages/chat/ChatPage.tsx                /chat route host
```

### Integration points (existing files edited)
- `src/routes/FullAppRoutes.tsx` — `/chat` route (lazy).
- `src/components/layout/CatalystShell.tsx` — **mounts `<ChatDockMount/>`** so the dock is on every authenticated page (hidden on `/chat`/`/auth`). **This is the correct mount point** — NOT FullAppRoutes' trailing FAB guards (those only render on `/*` catch-all routes, not App.tsx-declared routes like `/for-you`).
- `src/components/chat/main/ConversationHeader.tsx` — dropdown trigger no longer leaks `isSelected`/`testId` to the DOM.

### ⚠️ Dead code to remove (cleanup)
- `src/components/chat/main/MessageStream.tsx` and `src/components/chat/main/MessageComposer.tsx` are **now unused** — the active pane uses `CommentThread` instead. (The earlier "Suggest reply" composer change lives in `MessageComposer.tsx` and is therefore **moot** — the live composer is `CommentEditor` with "Improve writing" AI.) Safe to delete; confirm no imports first.

---

## 5. Verification status (be honest about this)

**✅ Verified (code + DB + live render):**
- Schema, RLS (2-user isolation: channels, tickets, **DMs**), `chat_is_member`, indexes, weekly cron.
- `chat_extract_mention_ids` returns correct IDs from ADF.
- DM creation via RPC → **2-member DM** (the previous "only-creator" bug is fixed).
- `CommentThread` renders real messages live with all affordances (screenshotted).
- Global dock FAB renders + opens on `/for-you`; lists conversations.
- ADS audit **0 violations** across all chat dirs; **11/11 unit tests** green.
- Seed data fully removed (0 conversations/messages/members/reactions).

**⚠️ NOT confirmed end-to-end via browser automation (harness limitation — pixel-typing a Tiptap rich editor is unreliable; the editor's empty-content guard then suppresses submit):**
- Message **send** persistence, **reaction** click, **edit**, **@mention send**.
- These are **code-correct** (source reviewed) and **DB-verified** (a simulated member insert succeeds). They flow through the battle-tested canonical `CommentThread`/`CommentEditor` + the now-verified handlers.
- **To close this gap:** type one message manually in the real browser at `/chat`, OR add a Playwright/RTL integration test that drives the ProseMirror editor via its API (not pixel input).

---

## 6. Remaining work (prioritized TODO)

1. **End-to-end confirm** send / react / edit / mention (manual type-test or integration test). *(highest value)*
2. **DM display name** — a DM has `title=null`, so the list shows a "?" avatar instead of the other member's name. Derive the display from the other `conversation_member`'s profile (in `chatToCds`/`useConversations`/`ConversationList`).
3. **Delete dead code** — `MessageStream.tsx` + `MessageComposer.tsx` (replaced by CommentThread).
4. **Channel-create UI** — `createChannel` exists but the New message modal only wires DMs; add a "create channel" entry (and decide auto-provision-per-project vs manual).
5. **Quick switcher (⌘K)** — `QuickSwitcher.tsx` is built but not globally mounted (⌘K conflicts with the app's global search). Pick a non-conflicting trigger.
6. **Verify mention→notification end-to-end** — the `chat_notify_mentions` trigger writes `mentioned_in_chat` rows; confirm `notify-dispatch` + the notification UI surface them.
7. **Threads** — currently uses the canonical quote-reply UX; a nested `parent_id` thread panel is optional (schema supports it).
8. **Mark-as-read polish** — `last_read_at` is stamped on conversation open (in `ChatMainView`); verify unread badges clear as expected across realtime.

---

## 7. Gotchas / operational notes

- **Auto-commit/auto-push hook is active** in this repo — it has committed (`cc`) and pushed on your behalf mid-session. Expect commits to appear; always `git status` and only stage explicit paths.
- **Never `git add -A` / `git add .`** — stage explicit paths only (`CLAUDE.md` P0).
- **bun, not npm** for install/dev (npm breaks the @atlaskit editor graph).
- **Port 8080 only.**
- **CI on PR #226 is red from pre-existing repo debt** (the design-system audit reports ~599 admin-page violations unrelated to chat; chat dirs are 0). Vercel checks fail due to **deploy rate-limit (24h)** + author access — infra, not code.
- **PR #225 was merged despite that red CI** (main advances regardless — the design-system gate is effectively non-blocking in practice). PR #226 is the same situation.
- **A `sk-ant-api03-…` key was pasted into chat earlier — rotate it** if it was a live secret.
- **Skills available:** `/catalyst-agent`, `/preflight`, `/jira-compare`, `/inspect`, `/design-critique`, `/deploy`. Reuse-first archaeology is mandatory (`CLAUDE.md` "ADOPT CANONICAL COMPONENTS").

---

## 8. Commands cheat-sheet

```bash
# dev
bun run dev                                              # localhost:8080

# chat unit tests
./node_modules/.bin/vitest run src/components/chat/__tests__/chat-data.test.ts

# ADS audit (must stay 0 violations on chat dirs)
node design-governance/rules/audit.js src/components/chat
node design-governance/rules/audit.js src/hooks/chat
node design-governance/rules/audit.js src/lib/chat

# git (always git -C <path>, never cd && git; explicit paths only)
git -C . status --short
```

---

## 9. Branches & PRs at handover time

- `main` — Phase-0 chat engine + dock-mount baseline (PR #225 merged).
- `Products-chat-dock-mount-01` — **PR #226 (open)**: global dock mount fix, CommentThread reuse completion, DMs + triggers + `chat_create_dm` RPC fix. Latest commit `1c3c8a955`.
- `chatbot` — this handover doc.

To continue: `git switch Products-chat-dock-mount-01` (the code) and read this doc from `chatbot` (or it's also on this branch if merged forward).

---

_End of handover._
