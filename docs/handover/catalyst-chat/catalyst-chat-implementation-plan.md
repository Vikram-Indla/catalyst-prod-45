# Catalyst Chat — Full-Screen Mode: Complete Implementation Plan
**18 Features · 9 Vertical Slices · Zero Drift · Production-Ready**

---

## Ground Rules for Every Claude Code Session

```
HARD GUARDRAILS (read before every prompt block):
1. INSPECT FIRST — run inspect_catalyst() before touching any file.
   Locate and REUSE: MessageComposer, Avatar, WorkItemTypeIcon, ProjectIcon,
   StatusLozenge, existing Supabase hooks (useConversations, useMessages,
   useThreadMessages), existing icon set, existing RLS helpers.
2. REFACTOR, DO NOT REWRITE — if a component exists, extend it. Fork only
   when the contract is incompatible and you've confirmed it in writing.
3. ZERO DRIFT — every pixel value maps to the token contract in
   /src/features/chat/tokens.css. Hard-block any hardcoded colour/px
   not in that file or in ADS tokens.
4. RING-FENCE — all new code lives under /src/features/chat/. The global
   shell, router, and auth layers are read-only from this feature.
5. RLS FIRST — no new table ships without a migration AND an RLS policy
   tested against the anon and service_role keys.
6. RESPONSIVE — every layout uses the breakpoint tokens defined in
   Section 0. No fixed-width that breaks below 768px.
7. NFR GATES — each slice must pass the checklist in Section 0 before
   merge: bundle size, query count, FCP, CLS, a11y score.
```

---

## Section 0 — Shared Contracts (Read Before Any Session)

### 0.1 Token Contract
```css
/* /src/features/chat/tokens.css — ring-fenced; import nowhere else */
:root {
  /* layout */
  --cc-rail-w: 72px;
  --cc-sidebar-w: 220px;
  --cc-sidebar-collapsed: 56px;
  --cc-sidebar-transition: 180ms ease;
  --cc-thread-w-lg: 400px;
  --cc-thread-w-md: 360px;
  --cc-header-h: 64px;
  --cc-tabs-h: 44px;
  --cc-row-h: 52px;
  --cc-pad-x: 24px;
  --cc-pad-y: 16px;
  --cc-avatar: 36px;
  --cc-thread-avatar: 32px;
  --cc-chip-h: 22px;
  --cc-rx-h: 24px;
  --cc-toolbar-h: 32px;
  /* breakpoints */
  --cc-bp-sm: 768px;   /* sidebar collapses */
  --cc-bp-md: 1024px;  /* thread overlay */
  --cc-bp-lg: 1440px;  /* thread docked 360 */
  --cc-bp-xl: 1680px;  /* thread docked 400 */
  /* colours — ADS mapped */
  --cc-surface: var(--ds-surface, #fff);
  --cc-surface-raised: var(--ds-surface-raised, #fff);
  --cc-surface-sunken: var(--ds-background-neutral, #f7f8f9);
  --cc-border: var(--ds-border, #dfe1e6);
  --cc-text: var(--ds-text, #172b4d);
  --cc-text-subtle: var(--ds-text-subtle, #44546f);
  --cc-text-subtlest: var(--ds-text-subtlest, #626f86);
  --cc-hover-bg: var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,.06));
  --cc-selected-bg: var(--ds-background-selected, #e9f2ff);
  --cc-accent: var(--ds-link, #0c66e4);
  --cc-accent-hover: var(--ds-link-hovered, #0055cc);
  --cc-accent-subtle: var(--ds-background-accent-blue-subtlest, #e9f2ff);
  --cc-unread: var(--ds-text-danger, #ae2e24);
  --cc-focus: var(--ds-border-focused, #388bff);
  --cc-success: var(--ds-text-success, #22a06b);
  --cc-badge-bg: var(--ds-background-danger-bold, #ca3521);
}
```

### 0.2 Responsive Grid
```
≥1680px : rail(72) | sidebar(220) | feed(flex) | thread(400)
≥1440px : rail(72) | sidebar(220) | feed(flex) | thread(360)
≥1024px : rail(72) | sidebar(220) | feed(flex) | [thread overlay]
≥768px  : rail(72) | [sidebar overlay] | feed(full)
<768px  : [rail bottom-tab] | feed(full) | [sidebar sheet]
```

### 0.3 NFR Gate (every slice before merge)
```
□ No new bundle chunk > 40KB gzip
□ Supabase query count per screen ≤ 6 (use joins, not N+1)
□ FCP on Catalyst chat route ≤ 1.8s (Lighthouse throttled)
□ CLS ≤ 0.05 (no layout shift on message append)
□ Axe a11y: zero critical violations
□ All new RLS policies tested: anon blocked, member allowed, non-member blocked
□ Playwright smoke: open conv → send → receive → thread → activity ≤ 10s
```

### 0.4 Database Conventions
```sql
-- All new tables in public schema
-- UUID primary keys (gen_random_uuid())
-- created_at timestamptz default now()
-- updated_at timestamptz default now() + trigger
-- soft-delete: deleted_at timestamptz (never hard-delete user content)
-- RLS: USING (auth.uid() in (select user_id from conversation_members where conversation_id = ...))
-- All timestamps in UTC; clients convert to local
-- Indexes: FK columns, (conversation_id, created_at DESC), tsvector column
```

---

## Slice 1 — Schema Foundation + RLS
**18F coverage: #2 read cursors, #7 send states, #8 thread model, #13 RLS, #14 reactions/saved/pins**
**Estimated sessions: 1 long or 2 sequential**

### Prompt Block 1.0 — Repo Audit
```
CATALYST CHAT — SLICE 1.0 — REPO AUDIT (READ ONLY)
===================================================
Do NOT write any code yet.

TASK: Map the current codebase to fill in every [UNSPECIFIED] below.

1. Find the current chat-related files:
   - Full-screen chat entry component (path)
   - Conversation list component (path)
   - MessageComposer component (path) — record its props interface exactly
   - Message feed / stream component (path)
   - Thread pane component (path)
   - useConversations hook (path + return type)
   - useMessages hook (path + return type)
   - useThreadMessages hook (path + return type)
   - Existing Supabase client instantiation (path)
   - Existing RLS helper or policy file (path)
   - Existing icon registry (path) — list chat-relevant icons already present
   - Existing Avatar component (path + props)
   - Existing ProjectIcon / WorkItemTypeIcon (path + props)
   - Existing StatusLozenge (path + props)
   - Router entry for chat (path + route string)

2. Read the existing conversations, messages, and any thread tables:
   - Table names, column names, foreign keys
   - Existing RLS policies (paste them)
   - Existing indexes

3. Report as a JSON block:
{
  "components": { ... },
  "hooks": { ... },
  "tables": { ... },
  "rlsPolicies": { ... },
  "indexes": { ... },
  "icons": [],
  "routerEntry": "..."
}

4. Flag anything that would block ring-fencing:
   - Components imported from chat into non-chat paths (circular risk)
   - Hardcoded colours in any chat component (ADS drift)
   - N+1 query patterns in existing hooks

OUTPUT: JSON audit block only. No code changes.
```

### Prompt Block 1.1 — Migration 01: Core Tables
```
CATALYST CHAT — SLICE 1.1 — MIGRATION 01 (DB ONLY)
===================================================
INPUT: Audit JSON from 1.0.

Write a single Supabase migration file: 20260612_01_chat_schema.sql

Tables to create (skip if already exists with equivalent schema):

1. conversations
   - id uuid PK
   - kind text CHECK (kind IN ('project','channel','dm'))
   - is_project_channel boolean default false
   - project_id uuid FK → projects(id) ON DELETE CASCADE (nullable)
   - name text (nullable for DMs)
   - color text (nullable)
   - is_archived boolean default false
   - muted_by uuid[] default '{}' (per-user mute, array of user ids)
   - created_by uuid FK → auth.users(id)
   - created_at, updated_at

2. conversation_members
   - id uuid PK
   - conversation_id uuid FK → conversations(id) ON DELETE CASCADE
   - user_id uuid FK → auth.users(id) ON DELETE CASCADE
   - role text default 'member' CHECK (role IN ('admin','member'))
   - last_read_message_id uuid nullable
   - last_read_at timestamptz nullable
   - joined_at timestamptz default now()
   - UNIQUE (conversation_id, user_id)

3. messages
   - id uuid PK (client-generated for idempotency)
   - conversation_id uuid FK → conversations(id) ON DELETE CASCADE
   - thread_root_id uuid FK → messages(id) ON DELETE CASCADE nullable
   - author_id uuid FK → auth.users(id)
   - body text default ''
   - body_tsvector tsvector GENERATED ALWAYS AS (to_tsvector('english', body)) STORED
   - edited_at timestamptz nullable
   - deleted_at timestamptz nullable
   - reply_count int4 default 0
   - last_reply_at timestamptz nullable
   - is_also_in_channel boolean default false (thread reply sent to channel)
   - created_at, updated_at
   - INDEX (conversation_id, created_at DESC) WHERE deleted_at IS NULL
   - INDEX (thread_root_id, created_at ASC) WHERE deleted_at IS NULL
   - GIN INDEX body_tsvector

4. message_attachments
   - id uuid PK
   - message_id uuid FK → messages(id) ON DELETE CASCADE
   - storage_path text NOT NULL
   - filename text NOT NULL
   - mime_type text
   - size_bytes int8
   - created_at

5. message_reactions
   - id uuid PK
   - message_id uuid FK → messages(id) ON DELETE CASCADE
   - user_id uuid FK → auth.users(id)
   - emoji text NOT NULL
   - created_at
   - UNIQUE (message_id, user_id, emoji)

6. message_pins
   - id uuid PK
   - message_id uuid FK → messages(id) ON DELETE CASCADE
   - conversation_id uuid FK → conversations(id)
   - pinned_by uuid FK → auth.users(id)
   - created_at
   - UNIQUE (message_id)

7. saved_items
   - id uuid PK
   - user_id uuid FK → auth.users(id)
   - message_id uuid FK → messages(id) ON DELETE CASCADE
   - remind_at timestamptz nullable
   - created_at
   - UNIQUE (user_id, message_id)

8. activity_items
   - id uuid PK
   - user_id uuid FK → auth.users(id) -- the recipient
   - type text CHECK (type IN ('mention','thread','reaction','dm'))
   - conversation_id uuid FK → conversations(id) ON DELETE CASCADE
   - message_id uuid FK → messages(id) ON DELETE CASCADE
   - actor_id uuid FK → auth.users(id)
   - emoji text nullable
   - is_read boolean default false
   - is_cleared boolean default false
   - created_at
   - INDEX (user_id, is_read, created_at DESC)

9. message_drafts
   - id uuid PK
   - user_id uuid FK → auth.users(id)
   - conversation_id uuid FK → conversations(id) ON DELETE CASCADE
   - thread_root_id uuid nullable
   - body text
   - updated_at
   - UNIQUE (user_id, conversation_id, thread_root_id)

ALSO: update_updated_at() trigger function + trigger on all tables.
ALSO: reply_count denormalisation trigger: after INSERT/soft-DELETE on messages
      WHERE thread_root_id IS NOT NULL → UPDATE messages SET reply_count, last_reply_at.

RLS (every table):
- conversations: SELECT if member; INSERT by authenticated; UPDATE/DELETE if admin or created_by = auth.uid()
- conversation_members: SELECT if member of same conversation; INSERT if admin; DELETE self or admin
- messages: SELECT if member of conversation; INSERT if member and not archived; UPDATE if author = auth.uid() and deleted_at IS NULL; DELETE (set deleted_at) if author = auth.uid() or is admin
- All other tables: SELECT/INSERT/UPDATE/DELETE scoped to auth.uid() = user_id or membership check

Run the migration via Supabase MCP. Confirm each table was created with \d tablename. Report any errors immediately.
```

### Prompt Block 1.2 — Migration 02: Triggers + Functions
```
CATALYST CHAT — SLICE 1.2 — MIGRATION 02 (DB FUNCTIONS)
=========================================================
File: 20260612_02_chat_functions.sql

1. handle_new_message() — Realtime trigger payload enricher (not needed if using Realtime directly)

2. handle_project_conversation() — DB function:
   CREATE OR REPLACE FUNCTION create_project_conversation(p_project_id uuid, p_name text)
   RETURNS uuid — creates a conversation of kind='project',
   is_project_channel=true, linked to project; returns conversation id.
   Call on project creation via existing project lifecycle hook.

3. sync_project_members(p_project_id uuid) — updates conversation_members
   to match project membership. Called on project member add/remove.

4. activity_fan_out() — AFTER INSERT on messages:
   - If body contains @username pattern: insert activity_items for mentioned users (type='mention')
   - If thread_root_id IS NOT NULL: insert activity for thread followers (type='thread')
   - If conversation is DM and no prior activity from same sender in last 30s: type='dm'

5. check_conversation_archived() — BEFORE INSERT on messages:
   RAISE EXCEPTION 'conversation_archived' if conversation.is_archived = true
   (belt-and-suspenders; RLS handles it at policy level)

6. search_messages(p_conv_id uuid, p_query text, p_limit int default 50)
   RETURNS TABLE (id uuid, body text, author_id uuid, created_at timestamptz, rank real)
   AS $$ SELECT id, body, author_id, created_at,
      ts_rank(body_tsvector, plainto_tsquery('english', p_query)) as rank
   FROM messages
   WHERE conversation_id = p_conv_id
     AND deleted_at IS NULL
     AND body_tsvector @@ plainto_tsquery('english', p_query)
   ORDER BY rank DESC, created_at DESC LIMIT p_limit $$

Run all via Supabase MCP. Confirm each function with \df+ function_name.
```

---

## Slice 2 — Realtime Transport + Presence
**18F coverage: #1 realtime transport, #4 notification pipeline (presence layer)**

### Prompt Block 2.0 — Inspect Existing Realtime Usage
```
CATALYST CHAT — SLICE 2.0 — INSPECT REALTIME
=============================================
READ ONLY.

1. Does Catalyst already use Supabase Realtime anywhere? (grep for
   supabase.channel, supabase.from(...).on, RealtimeChannel)
2. Is there a shared Realtime client/singleton? (path)
3. What is the existing WebSocket reconnection strategy, if any?
4. Is there a global toast / notification system already?
   (path, props interface)
5. Is there an existing presence/online-status mechanism?

Report findings as JSON. No code changes.
```

### Prompt Block 2.1 — RealtimeService
```
CATALYST CHAT — SLICE 2.1 — REALTIME SERVICE
=============================================
File: /src/features/chat/services/RealtimeService.ts

CONSTRAINTS:
- Single Supabase Realtime connection (multiplexed channels).
- One channel per conversation the user has open or subscribed to.
- Reconnect with exponential back-off: 1s, 2s, 4s, 8s, 16s, cap 30s.
- Subscribe/unsubscribe must not cause React re-renders (use refs/external store).
- Use the Supabase client already instantiated in Catalyst — do NOT create a new one.

IMPLEMENT:

export class RealtimeService {
  private channels: Map<string, RealtimeChannel>
  private callbacks: Map<string, Set<(event: ChatEvent) => void>>

  // Called once at app start
  init(supabaseClient: SupabaseClient): void

  // Subscribe to a conversation's message, reaction, typing, and presence events
  subscribe(conversationId: string, cb: (event: ChatEvent) => void): () => void
  // Returns unsubscribe fn

  // Broadcast typing (throttled — max 1 broadcast per 3s per conversation)
  broadcastTyping(conversationId: string, userId: string): void

  // Broadcast message-read (debounced 500ms)
  broadcastRead(conversationId: string, userId: string, messageId: string): void

  // Presence: track online users per conversation
  getPresence(conversationId: string): PresenceState

  private handleReconnect(conversationId: string): void
}

export type ChatEvent =
  | { type: 'message.new'; payload: MessageRow }
  | { type: 'message.updated'; payload: MessageRow }
  | { type: 'message.deleted'; payload: { id: string } }
  | { type: 'reaction.added'; payload: ReactionRow }
  | { type: 'reaction.removed'; payload: ReactionRow }
  | { type: 'typing'; payload: { userId: string; conversationId: string } }
  | { type: 'read'; payload: { userId: string; conversationId: string; messageId: string } }
  | { type: 'presence'; payload: PresenceState }

CHANNEL SETUP PER CONVERSATION:
supabase.channel(`chat:${conversationId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
       filter: `conversation_id=eq.${conversationId}` }, handleNewMessage)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages',
       filter: `conversation_id=eq.${conversationId}` }, handleUpdatedMessage)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions',
       filter: ... }, handleReaction)
  .on('broadcast', { event: 'typing' }, handleTyping)
  .on('broadcast', { event: 'read' }, handleRead)
  .on('presence', { event: 'sync' }, handlePresence)
  .subscribe()

NFR: The channel map must be cleaned up when the chat feature unmounts.
Write a React context provider ChatRealtimeProvider that wraps the service
and exposes it via useChatRealtime() hook.
```

### Prompt Block 2.2 — Presence + Typing Hooks
```
CATALYST CHAT — SLICE 2.2 — PRESENCE & TYPING HOOKS
====================================================
Files:
  /src/features/chat/hooks/usePresence.ts
  /src/features/chat/hooks/useTypingIndicator.ts

usePresence(conversationId: string):
  - Subscribes to RealtimeService presence for the conversation
  - Returns { onlineUserIds: string[] }
  - Cleans up on unmount
  - NFR: does not trigger feed re-renders (store outside React)

useTypingIndicator(conversationId: string):
  - Returns { typingUsers: Array<{ userId: string; name: string }> }
  - Shows user for 4s after last typing event; auto-clears
  - broadcastTyping throttled at composer onChange (max 1/3s)
  - Never shows the current user

ALSO update MessageComposer (REUSE existing, do not rewrite):
  - Accept onTyping?: () => void prop
  - Call it on textarea input (the wrapper calls broadcastTyping)
```

---

## Slice 3 — Read State + Unread Badges
**18F coverage: #2 read cursors, #3 read receipts**

### Prompt Block 3.0 — Inspect Read State
```
CATALYST CHAT — SLICE 3.0 — INSPECT READ STATE
===============================================
READ ONLY.
1. Is there any existing read-state logic in useConversations or useMessages?
2. Is unread count computed client-side or from DB?
3. Does conversation_members table already exist with last_read_message_id?
   (answer should be yes after Slice 1)
Report as JSON.
```

### Prompt Block 3.1 — useReadState Hook
```
CATALYST CHAT — SLICE 3.1 — READ STATE HOOK
============================================
File: /src/features/chat/hooks/useReadState.ts

IMPLEMENT:

useReadState(conversationId: string) returns:
  - unreadCount: number
  - firstUnreadMessageId: string | null
  - markRead: (messageId: string) => Promise<void>  -- debounced 500ms
  - seenBy: (messageId: string) => string[]  -- user ids who have read past this msg

LOGIC:
1. On mount: SELECT last_read_message_id FROM conversation_members
   WHERE conversation_id = ? AND user_id = auth.uid()
2. unreadCount = SELECT COUNT(*) FROM messages WHERE conversation_id = ?
   AND created_at > (SELECT last_read_at FROM conversation_members ...)
   AND author_id != auth.uid() AND deleted_at IS NULL
3. markRead: UPDATE conversation_members SET last_read_message_id = ?, last_read_at = now()
   Optimistic update immediately; rollback on error.
4. seenBy: aggregate read receipts from Realtime read broadcasts — store
   in a Map<messageId, Set<userId>> updated by RealtimeService read events.
5. Subscribe to RealtimeService read events for this conversation to update
   seenBy map reactively.

Esc key in feed → calls markRead(lastMessageId) for current conversation.

INTEGRATION:
- Chat shell calls markRead when conversation becomes visible AND when user
  scrolls within 160px of bottom.
- Read receipts (seenBy) rendered under own messages as avatar facepile.
- Muted conversations: unread count suppressed in badge only;
  still tracked internally so unmuting restores the correct count.
```

---

## Slice 4 — Message CRUD + Optimistic Sends + Offline Outbox
**18F coverage: #7 idempotent send, #16 edit/delete audit**

### Prompt Block 4.0 — Inspect Message Hooks
```
CATALYST CHAT — SLICE 4.0 — INSPECT MESSAGE HOOKS
==================================================
READ ONLY.
1. Read useMessages and useThreadMessages fully.
2. Does sendMessage already exist? What is its signature?
3. Is there any optimistic update pattern already in place?
4. Is there any error/retry mechanism?
Report the exact function signatures and any existing queue logic.
```

### Prompt Block 4.1 — useMessages Refactor
```
CATALYST CHAT — SLICE 4.1 — USEMESSAGES REFACTOR
=================================================
REFACTOR (not rewrite) the existing useMessages hook.
File: keep existing path, extend in-place.

ADD to useMessages(conversationId: string):

sendMessage(params: {
  id: string;          // client-generated uuid — idempotency key
  body: string;
  threadRootId?: string;
  alsoSendToChannel?: boolean;
  attachmentPaths?: string[];
}): Promise<void>

IMPLEMENTATION:
1. Optimistic insert: add message to local state immediately with status='sending'
2. Call Supabase INSERT with the client-generated id (ON CONFLICT DO NOTHING for retries)
3. On success: update status='sent', update reply_count on thread root via RPC
4. On error: update status='failed', store in outbox
5. Outbox: persisted to localStorage key `cc_outbox_${userId}`; retry on reconnect
6. Delivery states: 'sending' | 'sent' | 'seen' | 'failed'
   - 'seen': promoted when seenBy array (from Slice 3) becomes non-empty

editMessage(messageId: string, newBody: string): Promise<void>
  - Optimistic update local state
  - UPDATE messages SET body=?, edited_at=now() WHERE id=? AND author_id=auth.uid()
  - On error: rollback

deleteMessage(messageId: string): Promise<void>
  - Optimistic: set deleted_at locally (render tombstone "This message was deleted")
  - UPDATE messages SET deleted_at=now() WHERE id=? AND author_id=auth.uid()

pinMessage / unpinMessage(messageId: string, conversationId: string)
  - INSERT/DELETE message_pins
  - Invalidate pins query

NFR: No message fetch should use SELECT * — enumerate columns.
NFR: Paginate with cursor: load last 50, prepend 50 more on scroll-to-top.
     On prepend: record scrollHeight before, restore scrollTop + delta after.
```

---

## Slice 5 — Full-Screen Chat Shell + Sidebar
**18F coverage: #17 RTL/Arabic, #18 draft persistence — sidebar layer**
**This is the PRIMARY UI slice — pixel-perfect against V3 prototype**

### Prompt Block 5.0 — Inspect Chat Shell
```
CATALYST CHAT — SLICE 5.0 — INSPECT CHAT SHELL
===============================================
READ ONLY.
1. Find the current full-screen chat entry component. Read it fully.
2. Find the conversation sidebar / list. Read it fully.
3. Find how SidebarBase handles the 220/56px collapse and 180ms transition.
   Record the exact CSS class names and data attributes it uses.
4. Does the router already have a /chat route?
5. Are there existing section-header or nav-list components reusable here?
Report all findings as JSON.
```

### Prompt Block 5.1 — Chat Shell + Sidebar
```
CATALYST CHAT — SLICE 5.1 — CHAT SHELL + RESPONSIVE SIDEBAR
============================================================
Files to create/refactor:
  /src/features/chat/ChatFullScreen.tsx       -- entry, ring-fenced
  /src/features/chat/components/ChatShell.tsx -- grid orchestrator
  /src/features/chat/components/ConversationSidebar.tsx
  /src/features/chat/components/ConversationRow.tsx
  /src/features/chat/tokens.css              -- token file from Section 0

INSPECT first: read SidebarBase to reuse its collapse behavior exactly.
INSPECT: reuse existing Avatar component for DM rows and presence dot.
INSPECT: reuse existing ProjectIcon for project-channel icons.
INSPECT: reuse existing icon registry — do not recreate SVG inline if an
         icon component already exports it.

SHELL GRID:
.cc-shell {
  display: grid;
  height: 100vh;
  /* responsive — use CSS custom properties, not media queries inline */
  grid-template-columns: var(--cc-rail-w) var(--cc-sidebar-w) minmax(0,1fr) 0;
  transition: grid-template-columns var(--cc-sidebar-transition);
}
/* Variants via data attributes — no JS class toggling */
.cc-shell[data-sidebar-collapsed] {
  grid-template-columns: var(--cc-rail-w) var(--cc-sidebar-collapsed) minmax(0,1fr) 0;
}
.cc-shell[data-thread="docked-md"] {
  grid-template-columns: var(--cc-rail-w) var(--cc-sidebar-w) minmax(0,1fr) var(--cc-thread-w-md);
}
/* ... docked-lg, overlay handled in component */

@media (max-width: 1023px) {
  /* sidebar becomes overlay drawer */
  .cc-sidebar { position: fixed; left: 0; top: 0; height: 100vh; z-index: 30;
    transform: translateX(-100%); transition: transform 180ms ease; }
  .cc-sidebar[data-open] { transform: none; }
}
@media (max-width: 767px) {
  /* rail becomes bottom tab bar */
  .cc-rail { position: fixed; bottom: 0; left: 0; right: 0; height: 56px;
    flex-direction: row; z-index: 40; border-top: 1px solid var(--cc-border); }
}

SIDEBAR SECTIONS: Projects (auto) | Channels (custom) | Tickets | Direct Messages | Archived
Each section:
- Collapsible with chevron, aria-expanded, ↑↓ key nav
- Row: 52px, icon + title + preview (hover: show mute/mark-read/archive actions ONLY ON HOVER)
- Row actions INVISIBLE at rest — no CSS visibility:hidden (causes screen-reader pollution)
  use: opacity:0; pointer-events:none on .cc-row-actions;
       .cc-row:hover .cc-row-actions, .cc-row:focus-within .cc-row-actions { opacity:1; pointer-events:auto }
- Unread badge suppressed when muted (muted = conversations.muted_by contains auth.uid())
- Muted indicator: slashed-bell icon inline with title, subtle colour only
- Presence dot on DM rows: green dot bottom-right of avatar (from usePresence)
- RTL: use logical properties (padding-inline-start, margin-inline-end) throughout

ConversationRow PROPS:
  conversation: ConversationRow  (from useConversations)
  unreadCount: number
  isActive: boolean
  isPresent: boolean  (DM: other user online)
  onSelect: () => void
  onMute: () => void
  onMarkRead: () => void
  onArchive: () => void

DRAG TO REORDER (within same section, optional for v1):
  Use existing DnD library if already in Catalyst; otherwise defer.
  Persist order in conversation_members.sort_order (add column if needed).

COLLAPSED MODE (56px):
  - Show icon only, no text
  - Unread: dot indicator top-right of icon
  - Tooltip on hover (native title attribute — do not build custom)
  - aria-label always present regardless of collapse state
```

---

## Slice 6 — Message Feed + Hover Toolbar + Thread Pane
**18F coverage: #15 virtualized list, #17 RTL**
**Pixel-perfect match to V3 prototype — every component below has a spec in the prototype**

### Prompt Block 6.0 — Inspect Feed + Thread
```
CATALYST CHAT — SLICE 6.0 — INSPECT FEED + THREAD
==================================================
READ ONLY.
1. Read current message feed renderer fully.
2. Read current thread pane fully.
3. Does Catalyst use any virtual list library? (react-window, react-virtual, tanstack-virtual)
   If yes: record the exact import and usage pattern.
4. How are dates/times formatted today? (i18n library, locale settings)
5. Is there a markdown/rich-text renderer already? Record it.
6. How does the existing MessageComposer receive and handle file attachments?
Report as JSON.
```

### Prompt Block 6.1 — Message Feed
```
CATALYST CHAT — SLICE 6.1 — MESSAGE FEED (VIRTUALIZED)
=======================================================
Files:
  /src/features/chat/components/MessageFeed.tsx
  /src/features/chat/components/MessageRow.tsx
  /src/features/chat/components/HoverToolbar.tsx
  /src/features/chat/components/ReactionPills.tsx
  /src/features/chat/components/ThreadFooter.tsx
  /src/features/chat/components/DateDivider.tsx
  /src/features/chat/components/UnreadDivider.tsx
  /src/features/chat/components/InlineChip.tsx  (mentions + ticket keys)

VIRTUALISATION:
If tanstack-virtual or react-virtual already in Catalyst: use it.
Otherwise: install @tanstack/react-virtual (no other alternative).
- Virtualise main message list only. Thread pane: standard scroll (typically < 200 items).
- overscan: 5 rows above and below viewport.
- Prepend history: useRef(scrollHeight before) → set scrollTop += after - before.
- Append (new message): if user within 160px of bottom → pin to bottom;
  else preserve scroll and show "Jump to present" button.

MESSAGE GROUPING RULE (deterministic):
  Group = same author, gap ≤ 5 min, no system event or divider interrupting.
  First in group: show Avatar + author name + timestamp.
  Continuation: suppress avatar, show timestamp only on hover (absolute right-align in avatar col).

HOVER TOOLBAR (appears on .cc-msg:hover and .cc-msg:focus-within):
  Position: absolute, top: -16px, right: 8px.
  Z-index: 5 (above message, below modals).
  NO LAYOUT SHIFT: use position:absolute — toolbar sits outside document flow.
  Buttons (in order, with tooltips):
    ✅ "Completed"   → toggleReaction('✅')
    👀 "Taking a look…" → toggleReaction('👀')
    🙌 "Nicely done" → toggleReaction('🙌')
    [+emoji] "Add reaction" → opens EmojiPicker popover
    [thread] "Reply in thread" → opens thread pane
    [forward] "Forward message…" → opens ForwardModal
    [bookmark] "Save for later" → toggleSave; icon fills when saved
    [⋯] "More actions" → opens MessageMenu popover

  INSPECT: reuse existing tooltip component if present in Catalyst.
  If not: <button title="Completed"> is sufficient for NFR.

INLINE CHIPS:
  @mention: accent-subtle bg, accent text, 4px radius — reuse existing
    mention chip if present; otherwise create InlineChip variant='mention'.
  TICKET-KEY (BAU-xxx, MWR-xxx etc): same height, ticket-blue border,
    icon = reuse WorkItemTypeIcon(type='story' or detect from prefix).
  Current user's own mention: amber background to distinguish.

INLINE EDIT (on 'E' keypress or menu):
  Replace message text with <textarea> in place — no modal.
  Enter = save, Esc = cancel.
  Show "(edited)" badge after author name on edited messages.
  Tombstone for deleted: render grey italic "This message was deleted."

DELIVERY STATUS (own messages only, below message):
  sending → spinner
  sent → single tick (checkmark icon, subtle)
  seen → Avatar facepile from seenBy (Slice 3)
  failed → "Failed to send · Retry" in danger colour

DATE DIVIDER: centered pill with horizontal lines either side.
UNREAD DIVIDER: full-width line, "New" pill right-aligned, cc-unread colour.

RTL: body text: dir="auto" on each message body span.
     Arabic text renders right-to-left within the flat-row layout.
     Do not flip the entire feed layout; only text direction.
```

### Prompt Block 6.2 — Thread Pane
```
CATALYST CHAT — SLICE 6.2 — THREAD PANE
========================================
File: /src/features/chat/components/ThreadPane.tsx

INSPECT: reuse existing thread pane component (refactor, do not rewrite).
         Keep useThreadMessages hook — extend if needed.

LAYOUT:
  Docked (≥1440px): right column of chat shell grid.
  Overlay (<1440px): position:fixed, right:0, full height, z-index:40,
    backdrop div (semi-transparent) behind it.
  Width: CSS custom properties from token file.
  Close: X button top-right; Esc when focus not in dirty composer.

SECTIONS:
  1. Header: "Thread · #channel-name" or "Thread · DM with Name"
  2. Parent message (pinned card with subtle border)
  3. "N replies" divider bar
  4. Reply list (standard scroll, MessageRow in thread-mode)
  5. Reply count label "Also send to #channel" checkbox
  6. Existing MessageComposer mounted in thread mode
     (REUSE — pass threadRootId prop; it already exists in the composer)

"Also send to #channel":
  - Checkbox below composer, label = channel name
  - When checked: sendMessage sets alsoSendToChannel=true
  - Server: also inserts message into main feed with is_also_in_channel=true
  - Main feed: renders these with "Posted in thread" badge

ACCESSIBILITY:
  Focus trap when overlay mode is active.
  aria-label="Thread replies"
  When thread opens: move focus to composer textarea.
  When thread closes: return focus to the message row that opened it.
```

---

## Slice 7 — Emoji Picker + Message Menu + Forward Modal
**18F coverage: #14 reactions (UI layer)**

### Prompt Block 7.1 — Emoji Picker
```
CATALYST CHAT — SLICE 7.1 — EMOJI PICKER
=========================================
File: /src/features/chat/components/EmojiPicker.tsx

INSPECT: does Catalyst already have an emoji picker? If yes: wrap it; do not rebuild.
If no:

IMPLEMENT a lightweight picker (NO heavy emoji-mart dependency).
Bundle budget: ≤ 8KB gzip for the picker component.
Strategy: store emoji data as a static JSON file imported lazily.

Categories (matching the V3 prototype exactly):
  "Getting Work Done": ✅ 👀 🙌 🙏 ➕ 👏 💡 🎯 👋 👍 🎉 1️⃣ 2️⃣ 3️⃣ 📣 ⚪ 🔵 🔴 🆒 🆗 🆘 🚨 🚀 🔥 ❤️ 💯
  "Smileys & People": [first 36 unicode smileys]
  [remaining categories loaded lazily on scroll]

FEATURES:
  - Search input (debounced 150ms): filter across all categories
  - Selected state highlights quick-react emojis already applied by current user
  - Skin tone selector (store preference in localStorage 'cc_skin_tone')
  - Keyboard: ↑↓←→ navigate grid, Enter select, Esc close
  - Position: smart-place — above message if insufficient space below
  - Click outside or Esc → close

INTEGRATION:
  useEmojiPicker() hook:
    openPicker(anchorEl, onSelect) → void
    closePicker() → void
  Renders a single floating instance; not per-message.
```

### Prompt Block 7.2 — Message Menu + Forward Modal
```
CATALYST CHAT — SLICE 7.2 — MESSAGE MENU + FORWARD MODAL
=========================================================
Files:
  /src/features/chat/components/MessageMenu.tsx
  /src/features/chat/components/ForwardModal.tsx

MessageMenu (kebab ⋯):
  INSPECT: reuse existing Catalyst dropdown/menu component if present.
  Items (own message):
    ✏️ Edit message → trigger inline edit
    📌 Pin / Unpin → pinMessage / unpinMessage
    🔖 Save for later / Remove from Later
    📋 Copy text → navigator.clipboard.writeText
    📩 Mark unread from here → set cursor to this message
    🗑 Delete message… → confirm dialog → deleteMessage
  Items (other's message):
    📌 Pin / Unpin (admin only)
    🔖 Save for later
    📋 Copy text
    📩 Mark unread from here
    ↩️ Forward message…
  Separator + Caty item at bottom of every menu:
    [Caty icon] Ask Caty about this message

ForwardModal:
  Target list: all conversations the user is a member of, grouped (Projects / Channels / DMs / Tickets).
  Search box to filter.
  Optional note textarea.
  Forward: sends a new message with body = note, forwards the original message body/attachments
    as a quoted block (is_forwarded: true metadata).
  INSPECT: reuse existing modal/dialog component from Catalyst.
  REUSE: Avatar, ProjectIcon, existing list-item pattern.
```

---

## Slice 8 — Activity Surface + Later + In-Conversation Search
**18F coverage: #9 activity persistence, search backend #11**

### Prompt Block 8.1 — Activity Surface
```
CATALYST CHAT — SLICE 8.1 — ACTIVITY SURFACE
=============================================
File: /src/features/chat/components/ActivitySurface.tsx
      /src/features/chat/hooks/useActivity.ts

useActivity():
  - SELECT from activity_items WHERE user_id = auth.uid()
    ORDER BY created_at DESC LIMIT 100
  - Realtime: subscribe to activity_items INSERT for current user
    (filtered channel: `activity:${userId}`)
  - markRead(id): UPDATE activity_items SET is_read=true
  - markAllRead(): UPDATE activity_items SET is_read=true WHERE user_id=auth.uid() AND is_read=false
  - clear(id): UPDATE activity_items SET is_cleared=true
  - Filter tabs: All | DMs | Mentions | Threads | Reactions | Cleared
  - Unreads-only toggle
  - unreadCount: number (for rail badge)

ActivitySurface (two-pane — matches V3 prototype):
  Left pane (460px, scrollable):
    - Tab bar (All | DMs | @ Mentions | Threads | Reactions | Cleared)
    - Unreads filter pill + layout toggle (Detailed/Dense) + mark-all-read
    - Date-grouped activity cards (same date-pill pattern as message feed)
    - Card: avatar, "Name did X in #channel", 2-line preview, timestamp, quick actions
    - Quick actions (hover only): mark-read, clear
    - Selected card: accent border, box-shadow
  Right pane (flex, min 0):
    - When card selected: renders thread/message in context
    - Parent message + replies + composer with "Also send to" checkbox
    - Open-in-conversation button top-right → navigates and opens thread

  INSPECT: reuse MessageRow, ReactionPills, MessageComposer, Avatar from previous slices.
  Density modes: Detailed (preview visible) / Dense (preview hidden).
  NFR: virtual scroll left pane if > 100 items.
```

### Prompt Block 8.2 — Later Surface + In-Conversation Search
```
CATALYST CHAT — SLICE 8.2 — LATER + SEARCH
==========================================
Files:
  /src/features/chat/components/LaterSurface.tsx
  /src/features/chat/components/ConvSearch.tsx
  /src/features/chat/hooks/useSavedItems.ts

useSavedItems():
  - SELECT saved_items JOIN messages JOIN conversations WHERE user_id = auth.uid()
    ORDER BY saved_items.created_at DESC
  - saveItem(messageId) / removeItem(messageId)
  - count: number (for rail badge)

LaterSurface:
  - Cards: context line (channel, author, relative date), message preview
  - Jump to conversation → openConv + scroll to message
  - Remove from Later (X button, hover-only)
  - Empty state: bookmark icon + "Nothing saved yet"
  REUSE: MessageRow in read-only mode; Avatar; existing card layout pattern.

ConvSearch (in-conversation, from header search button or ⌘F):
  Renders as a full-width pill bar (see V3 prototype) above the message feed.
  Calls search_messages() RPC (defined in Slice 1.2).
  Results: replace feed with search result list (not a modal).
    - Each result: message in context with search term highlighted (yellow mark)
    - Result count badge in pill
    - Up/Down arrow keys navigate between results
    - Enter / click: jump to message in full feed (search stays open)
    - Esc: close search, return to normal feed
  INSPECT: does Catalyst have a global ⌘K search? If so, do NOT conflict with it.
  Wire ⌘F in ChatFullScreen; ⌘K remains global.
  RTL: search input is LTR for query typing; results honour dir="auto".
```

---

## Slice 9 — Caty Summarize + Notifications + File Pipeline
**18F coverage: #4 notifications, #5 Caty gateway, #12 file pipeline**

### Prompt Block 9.1 — Caty Summarize
```
CATALYST CHAT — SLICE 9.1 — CATY SUMMARIZE
===========================================
Files:
  /src/features/chat/components/CatySummaryPanel.tsx
  /src/features/chat/services/catySummarize.ts
  supabase/functions/chat-summarize/index.ts  (Edge Function)

PLACEHOLDER + REAL WIRING:
  The panel is already designed and approved (V3 prototype).
  This slice wires the Gemini gateway that already exists in Catalyst.

INSPECT FIRST:
  1. Find the existing Gemini/AI gateway in Catalyst (grep for gemini, openai, anthropic client)
  2. Find its request/response interface
  3. Find any existing edge function invokeFunction pattern

Edge Function (chat-summarize):
  - Input: { conversationId: string, windowDays: number, userId: string }
  - Auth: verify JWT, check conversation membership
  - Fetch last windowDays days of messages with author profiles
  - Build prompt:
      "You are Caty, Catalyst's AI assistant. Summarize this team conversation.
       Return JSON with keys: stats{messageCount,replyCount,participantCount},
       keyDecisions[], actionItems[], mentionsOfUser[], openThreads[], filesShared[].
       Each item: {messageId, authorName, preview, timestamp}.
       Be concise. Max 3 items per category."
  - Call Gemini gateway (reuse existing client — do NOT create a new AI client)
  - Return structured JSON

CatySummaryPanel:
  - Trigger: header Caty button, kebab "Ask Caty to summarize", composer Caty icon
  - Opens as a right-side panel (fixed, full height, 460px, same pattern as thread overlay)
  - Loading state: skeleton cards while Edge Function runs
  - Sections match V3: stats row + 5 accordion sections
  - "Regenerate" button: clears cache, re-invokes edge function
  - Cache: sessionStorage key cc_caty_${convId} with TTL 5min
  - Footer: "Powered by Gemini · Summarising last N days"

catySummarize(conversationId, windowDays):
  - Calls supabase.functions.invoke('chat-summarize', { body: ... })
  - Returns SummaryResult | SummaryError
  - On error: shows inline error with retry

REUSE: existing CatyAI icon / branding assets — do NOT create a new Caty avatar.
       Find the existing Caty icon in the Catalyst asset directory and reference it.
```

### Prompt Block 9.2 — In-App Notifications
```
CATALYST CHAT — SLICE 9.2 — IN-APP NOTIFICATIONS
=================================================
Files:
  /src/features/chat/services/NotificationService.ts
  /src/features/chat/components/NotificationToast.tsx
  /src/features/chat/components/MuteModal.tsx

INSPECT: is there an existing toast system in Catalyst? If yes: extend it for chat.
If no: create a minimal one in /src/features/chat/components/Toast.tsx.

NotificationService:
  init(supabaseClient, userId):
    - Subscribe to activity_items INSERT for current user via Realtime
    - For each new activity: check if conversation is muted (muted_by contains userId)
      If muted: skip entirely
    - Check browser notification permission; request if not determined
    - Spawn in-app toast (always) + browser push notification (if permitted)

NotificationToast:
  - Width 330px, fixed top-right, stacked
  - Slides in from right (transform + opacity, 180ms)
  - Auto-dismiss: 6s
  - Content: actor avatar + "Name · #channel" title + 2-line message preview
  - Click: navigates to conversation (and thread if thread type)
  - X: dismiss immediately
  - NFR: max 3 toasts visible simultaneously; queue overflow

Mute semantics (MuteModal):
  Triggered from header bell button or sidebar row action.
  Options:
    ○ Mute (no expiry — until manually unmuted)
    ○ Mute for 30 minutes
    ○ Mute for 2 hours
    ○ Mute for 24 hours
  Storage: UPDATE conversations SET muted_by = array_append(muted_by, userId)
           For timed mute: store expiry in localStorage 'cc_mute_${convId}'; check on mount.
  Unmute: removes userId from muted_by array.

System events (render in feed, not as chat messages):
  "A huddle happened · You and Name were in the huddle for Nm." — PLACEHOLDER only,
  styled as a grey pill in the feed. Huddles are out of scope for implementation.
  Render: messages with body = null and metadata.type = 'system_huddle'.
```

### Prompt Block 9.3 — File Pipeline
```
CATALYST CHAT — SLICE 9.3 — FILE PIPELINE
==========================================
Files:
  /src/features/chat/components/FileCard.tsx
  /src/features/chat/components/FileGrid.tsx
  /src/features/chat/components/AttachmentUploader.tsx
  /src/features/chat/components/FilesTab.tsx

INSPECT:
  1. Does Catalyst already use Supabase Storage? Find the bucket name and upload pattern.
  2. Does MessageComposer already have a file attachment prop? Check its interface.
  3. Is there a file icon / type icon component already?

Storage:
  Bucket: 'chat-attachments' (create if not exists).
  Path pattern: {conversationId}/{messageId}/{filename}
  Max file size: 50MB (enforce client-side before upload).
  RLS: members of the conversation can read; uploader can delete.

AttachmentUploader (extends existing MessageComposer attach flow):
  - File input or drag-drop zone on composer
  - Upload to Supabase Storage before sending message
  - Progress indicator per file (0-100%)
  - On upload complete: include storage_path in sendMessage call → saved in message_attachments
  - Cancel: abort upload and remove from UI
  REUSE: existing composer file-attach pattern if present; extend, not replace.

FileCard:
  - Icon: reuse existing file-type icon if present; otherwise colour-coded by MIME type
  - Fields: filename, type badge, size
  - Click: download (signed URL, 60s expiry from Supabase Storage)
  - Context: in-message FileGrid (max 3 per row) and in FilesTab

FilesTab:
  - Rendered when "Files" tab selected in conversation header tabs
  - Query: SELECT message_attachments JOIN messages WHERE conversation_id = ?
    ORDER BY messages.created_at DESC
  - Groups by date (same pill pattern)
  - Download-all: ZIP server-side if > 1 file (edge function) or sequential signed URLs
  - REUSE: existing grid/list view toggle if Catalyst has one

ALSO: update message feed to render FileGrid under message body when attachments present.
      Update ConvSearch results to include messages with attachments.
```

---

## Slice 10 — Drafts + Polish + Playwright Suite
**18F coverage: #18 draft persistence; final integration + NFR gate**

### Prompt Block 10.1 — Draft Persistence
```
CATALYST CHAT — SLICE 10.1 — DRAFT PERSISTENCE
===============================================
File: /src/features/chat/hooks/useDraft.ts

useDraft(conversationId: string, threadRootId?: string):
  - Returns { draft: string; setDraft: (v: string) => void; clearDraft: () => void }
  - Persists to message_drafts table (upsert on debounced change, 1s delay)
  - Loads on conversation switch
  - Draft indicator in sidebar row: faint "Draft" prefix in preview text
  - Thread composer also uses this hook (pass threadRootId)
  - Sending clears the draft (clearDraft called on successful send)

COMPOSER INTEGRATION:
  REUSE MessageComposer. Pass draft as initialValue prop.
  Composer already manages its own internal state — only write back to draft
  store on onChange (debounced), not on every keystroke event.
```

### Prompt Block 10.2 — Final Integration + Playwright
```
CATALYST CHAT — SLICE 10.2 — INTEGRATION + PLAYWRIGHT
======================================================

STEP 1 — Integration audit (read-only):
  1. Check all imports across /src/features/chat/ — nothing should import FROM
     /src/features/chat/ into the global shell or other features, EXCEPT
     the router entry and the ChatFullScreen component.
  2. Verify token.css is imported exactly once in ChatFullScreen.
  3. Verify MessageComposer, Avatar, WorkItemTypeIcon are imported FROM
     their canonical paths, not copied.
  4. Run TypeScript strict-mode check on /src/features/chat/*.
  5. Check bundle: vite build --report. Chat feature chunk must be ≤ 200KB gzip.
  6. Run axe-playwright on ChatFullScreen for zero critical a11y violations.

STEP 2 — Playwright test suite:
File: /tests/features/chat/chat.spec.ts

Tests (cover the full NFR gate from Section 0):

test('open conversation + receive message + mark read')
test('send message → optimistic render → seen receipt')
test('send message while offline → outbox → retry on reconnect')
test('open thread → reply → "also send to channel" → verify main feed')
test('react with emoji from hover toolbar → verify pill count')
test('save for later → verify Later surface badge and card')
test('activity: mention arrives → toast → click → navigate → activity marked read')
test('in-conversation search → result count → navigate to message')
test('mute conversation → incoming message → no toast → no badge')
test('Caty panel opens → skeleton → summary renders → regenerate clears cache')
test('file upload → progress → card renders → download link valid')
test('edit message → (edited) badge → history preserved')
test('delete message → tombstone renders → not in search results')
test('sidebar collapse → 56px → icons only → tooltip on hover')
test('thread pane: docked at 1440+ → overlay at 1023 → focus trap in overlay')
test('RTL message body → dir=auto → Arabic text right-aligned')
test('draft persists on conversation switch → restores on return')
test('keyboard navigation: F6 cycles sections → T opens thread → R reacts → Esc marks read')

Each test:
  - Mocks Supabase via MSW (or Playwright network intercept)
  - Asserts DOM (not implementation), aria roles, visual snapshots
  - Measures FCP, CLS on the chat route (Playwright performance API)
  - Reports PASS/FAIL with screenshot on failure

STEP 3 — Checklist run (all items in Section 0 NFR Gate must be checked):
  □ Bundle ≤ 200KB gzip total for /src/features/chat/
  □ Max 6 Supabase queries on initial conversation load
  □ FCP ≤ 1.8s throttled
  □ CLS ≤ 0.05
  □ Axe: 0 critical
  □ RLS: confirmed with postgres role switching test
  □ All 18 Playwright tests green

Only mark this slice DONE when ALL boxes checked.
```

---

## Execution Order + Session Map

```
SESSION 1  → Slice 1.0 (audit)
SESSION 2  → Slice 1.1 + 1.2 (migration)
SESSION 3  → Slice 2.0 + 2.1 (realtime service)
SESSION 4  → Slice 2.2 + 3.1 (presence + read state)
SESSION 5  → Slice 4.0 + 4.1 (message CRUD)
SESSION 6  → Slice 5.0 + 5.1 (shell + sidebar)
SESSION 7  → Slice 6.0 + 6.1 (feed + hover toolbar)
SESSION 8  → Slice 6.2 + 7.1 + 7.2 (thread + emoji + menus)
SESSION 9  → Slice 8.1 + 8.2 (activity + later + search)
SESSION 10 → Slice 9.1 (Caty)
SESSION 11 → Slice 9.2 + 9.3 (notifications + files)
SESSION 12 → Slice 10.1 + 10.2 (drafts + Playwright + gate)
```

---

## Hard Guardrail Checklist — Paste at the Start of Every Session

```
□ INSPECTED the relevant existing components before writing any code?
□ All new files inside /src/features/chat/ (ring-fenced)?
□ Zero hardcoded colours — all via var(--cc-*) or var(--ds-*)?
□ MessageComposer reused (not forked)?
□ Avatar, ProjectIcon, WorkItemTypeIcon imported from canonical paths?
□ Every new Supabase table has RLS + migration file?
□ Responsive: logical CSS properties, breakpoints via token variables?
□ RTL: dir="auto" on all user-generated text nodes?
□ No N+1 queries — joins or single RPC per surface?
□ TypeScript strict — no `any` without explicit comment?
□ Playwright test written for every user-visible feature in this slice?
□ NFR gate passed before declaring slice DONE?
```

---

*Plan version: V3 | Slices: 10 | Sessions: 12 | Features: 18 | Drift tolerance: 0%*
