# Chat — Drafts & Sent (design spec)

**Date:** 2026-06-18
**Surface:** `src/features/chat-v2/` (chat-v2 only — chat-v1 not touched)
**Status:** Approved sections 1–5 in brainstorming on 2026-06-18.

---

## 1. Goal

Add a Slack-look **Drafts & sent** experience to chat-v2:

- A new rail entry "Drafts & sent" with a scheduled-count badge.
- A three-tab panel: **Drafts** · **Scheduled** · **Sent**.
- Per-conversation **draft autosave** — typing in any chat, leaving, and coming back restores the unsent body in the composer.
- A composer-anchored **scheduled-message indicator banner** that appears whenever the current conversation has at least one pending scheduled send from the user.
- Bulk-edit mode for drafts (Edit → multi-select with master checkbox → bulk delete).
- An "Edit scheduled message" inline panel for canceling, sending now, or editing a queued message — no destructive single-click on a scheduled row.

Cross-device sync via Supabase. Defensive against an unapplied migration.

---

## 2. Non-goals

- Slack's "Threads" or "Huddles" sidebar entries — out of scope.
- Schedule-send features beyond what `chat_messages.scheduled_for` already supports.
- Re-architecting `ChatV2Shell` layout. The new panel mounts in the existing sidebar grid area (same slot as `ActivityPanel` / `LaterPanel`).
- Mobile layout. Current chat-v2 breakpoints assume ≥1024px.

---

## 3. Architecture

### 3.1 New `ChatView`

`src/features/chat/hooks/useShellState.ts` — extend the `ChatView` union:

```ts
export type ChatView = 'chat' | 'dms' | 'activity' | 'later' | 'people' | 'drafts';
```

Shell state also exposes:

```ts
type DraftsTab = 'drafts' | 'scheduled' | 'sent';
draftsActiveTab: DraftsTab;
setDraftsActiveTab: (t: DraftsTab) => void;
```

`setDraftsActiveTab('scheduled')` is called by the composer banner's "See all scheduled messages" link so the panel deep-links into the right tab.

### 3.2 Rail entry

In `WorkspaceRail.tsx`, between Activity and Later:

```tsx
<RailItem
  icon={<DraftsClockIcon size={20} />}
  label="Drafts & sent"
  active={activeView === 'drafts'}
  badgeCount={scheduledCount}
  onClick={() => onNavigate('drafts')}
/>
```

`scheduledCount` is sourced from a new hook `useMyScheduledCount()` — count of `chat_messages` where `author_id = me AND scheduled_for IS NOT NULL AND delivered_at IS NULL`. Drafts do not contribute to the badge (matches Slack).

A new icon `DraftsClockIcon` (paper plane with small clock badge) is added to `shared/Icon.tsx`. Pure SVG. Inherits `currentColor`.

### 3.3 Panel mount

In `ChatV2Shell.tsx`, add the new branch alongside `inActivityMode` / `inLaterMode`:

```ts
const inDraftsMode = shell.activeView === 'drafts';
```

In the sidebar grid area:

```tsx
{inActivityMode ? <ActivityPanel ... />
 : inLaterMode  ? <LaterPanel ... />
 : inDraftsMode ? <DraftsAndSentPanel ... />
 : <Sidebar ... />}
```

In the panel grid area, `inDraftsMode` is treated like `inActivityMode` for layout — the right pane stays empty until the user clicks a row. Selecting a row swaps `activeView` back to `'chat'` and routes per flow (§5).

### 3.4 Composer banner

`<ComposerScheduledBanner>` mounts in `MessagePanel.tsx` directly above the existing `Composer`. Visible only when `useMyScheduledCountByConversation()[activeConv.id]?.count > 0`. Hidden otherwise.

### 3.5 Composer draft wiring

`Composer.tsx` accepts new optional props:

```ts
initialDraft?: string;
onDraftChange?: (md: string) => void;
```

`MessagePanel.tsx` wires `useConversationDraft(convId)` — passes `body_md` to `initialDraft`, sets `onDraftChange` to a debounced upsert via the hook's `setDraft` setter. On send, the hook's `clearDraft` is invoked.

---

## 4. Data model

### 4.1 New table

Migration file: `supabase/migrations/20260618xxxxxx_chat_message_drafts.sql`.

```sql
CREATE TABLE IF NOT EXISTS public.chat_message_drafts (
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid        NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  body_md         text        NOT NULL DEFAULT '',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

ALTER TABLE public.chat_message_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_message_drafts_self ON public.chat_message_drafts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS chat_message_drafts_user_updated_idx
  ON public.chat_message_drafts (user_id, updated_at DESC);

COMMENT ON TABLE public.chat_message_drafts IS
  'Per-user, per-conversation composer drafts. One row per (user_id, conversation_id). Empty body_md is treated as no draft.';
```

**RLS recursion check (CLAUDE.md 2026-06-03):** policy is `user_id = auth.uid()` — direct comparison, no JOIN, no EXISTS, no self-reference. Safe.

**No `chat_messages` schema changes.** Scheduled and sent both query the existing `chat_messages` rows.

### 4.2 Indexes already in place

- `chat_messages_pending_idx` (from `20260617000100_chat_schedule_send.sql`) covers the Scheduled tab and rail badge query.
- `chat_messages` has its standard `(conversation_id, created_at DESC)` index — covers the Sent tab cursor scan with a `WHERE author_id = me AND delivered_at IS NOT NULL`.

### 4.3 Defensive flag

```ts
// src/hooks/chat/chatDraftsFlags.ts
let draftsTableAvailable: boolean | undefined;
export const isDraftsTableAvailable = () => draftsTableAvailable !== false;
export const markDraftsTableMissing = () => { draftsTableAvailable = false; };
```

Every draft hook calls `markDraftsTableMissing()` on the first PostgREST error with `code === '42P01'`. All subsequent reads/writes early-return empty / no-op. Matches the `scheduleColumnsAvailable` precedent.

---

## 5. Interaction flows

### Flow A — Draft autosave

1. User opens conversation `A`. `useConversationDraft('A')` query fires:
   `select body_md from chat_message_drafts where user_id = me and conversation_id = 'A'`
2. If a row exists with non-empty `body_md`, `Composer.initialDraft` is set to it. The editor seeds.
3. User types. `Composer.onDraftChange(md)` fires via a debounced (600ms) wrapper inside `useConversationDraft`. The wrapper upserts:
   `upsert { user_id, conversation_id, body_md, updated_at: now() }`
4. User clicks conversation `B` in the sidebar. The `<MessagePanel>` for `A` unmounts. The hook's flush effect (`useEffect` cleanup) writes the latest in-flight `body_md` immediately — bypassing the debounce so nothing is lost.
5. Returning to `A` re-seeds the composer from the fresh row.
6. On send (the existing `Composer.submit`), `MessagePanel` calls `clearDraft()` which deletes the row.

### Flow B — Composer scheduled banner

1. `useMyScheduledCountByConversation()` returns `Map<convId, { count, nextSendAt }>`. Backed by:
   `select conversation_id, scheduled_for from chat_messages where author_id = me and scheduled_for is not null and delivered_at is null`
2. Bucketed client-side into the map, taking the earliest `scheduled_for` per conversation.
3. `<ComposerScheduledBanner>` renders only when `map[activeConvId]?.count > 0`.
4. Text:
   - `count === 1`: `Your message will be sent {today | tomorrow | <weekday>} at {h:mm AM/PM}.`
   - `count > 1`: `{count} messages scheduled — next {today | tomorrow | <weekday>} at {h:mm AM/PM}.`
5. The "See all scheduled messages" link calls `shell.setActiveView('drafts')` then `shell.setDraftsActiveTab('scheduled')`.
6. The banner self-rerenders every 60 seconds via `setInterval` so the relative day label stays correct across midnight rollover.

### Flow C — Drafts tab row click

1. `shell.setActiveView('chat')`.
2. `setActiveConversationId(row.conversationId)`.
3. The `<MessagePanel>` mounts. `useConversationDraft` reads the same row that fed the list. `Composer` seeds with that draft. No special "load this draft" plumbing needed.

### Flow D — Sent tab row click (mirrors activity)

1. `setActiveConversationId(row.conversationId)`.
2. If `row.parentId` (the message is a thread reply):
   - `shell.openThread(row.parentId)`
   - `setThreadJumpMessageId(null); setTimeout(() => setThreadJumpMessageId(row.messageId), 0);`
3. Else (main-channel message):
   - `setActivityJumpMessageId(null); setTimeout(() => setActivityJumpMessageId(row.messageId), 0);`
4. The existing `MessagePanel` jump-pulse logic (2.4 s yellow + 3 px left border) fires.

### Flow E — Scheduled tab row click

1. `shell.setActiveView('chat')` + `setActiveConversationId(row.conversationId)`. Composer stays empty.
2. `<EditScheduledMessagePanel>` mounts above the composer for the targeted message. Shows:
   - Message preview (formatted markdown render)
   - "Scheduled for {day} at {h:mm AM/PM}"
   - Buttons: `[Edit] [Send now] [Delete]`
3. `[Edit]` → deletes the `chat_messages` row, writes the body to `chat_message_drafts` for this conv, dismisses the panel. The composer re-seeds via Flow A.
4. `[Send now]` → updates the row: `scheduled_for = null, delivered_at = now()`. Panel dismisses.
5. `[Delete]` → hard delete the row. Panel dismisses.

Edit is the only path that destroys the queued send. Single click on a row never destroys anything.

### Flow F — Bulk-edit drafts

1. The `<DraftsAndSentHeader>` shows an `Edit` button in the top-right of the Drafts tab only.
2. Click `Edit` → `selectMode = true`. Header swaps to `[Delete] [Done]`. `Delete` is disabled (gray) until `selectedIds.length > 0`.
3. A `<SelectAllRow>` renders at the top of the list with a master checkbox + label `Select all` (or `Selected (N)` when N > 0).
4. Each `<DraftRow>` receives a leading 16 px checkbox.
5. Toggling the master checkbox selects/deselects all visible drafts.
6. `[Delete]` (now red) executes:
   `delete from chat_message_drafts where user_id = me and conversation_id in (selectedIds)`
   Then exits select mode.
7. `[Done]` and the Escape key both exit select mode without deleting.

Scheduled and Sent tabs do not have bulk-edit in v1 — Scheduled has individual hover-cancel (the `[Delete]` button on the inline edit panel from Flow E); Sent is read-only.

---

## 6. Component contracts

### 6.1 `DraftsAndSentPanel`

```ts
interface DraftsAndSentPanelProps {
  showRightBorder?: boolean;
  onSelectDraft: (convId: string) => void;
  onSelectScheduled: (msg: ScheduledMessage) => void;
  onSelectSent: (msg: SentMessage) => void;
}
```

Owns `activeTab` (initialized from `shell.draftsActiveTab`), `selectMode`, `selectedIds`. Renders `Header`, `Tabs`, then the active tab's content.

### 6.2 `useConversationDraft`

```ts
function useConversationDraft(conversationId: string | null): {
  draft: string;            // body_md or ''
  isLoading: boolean;
  setDraft: (md: string) => void;  // debounced 600 ms internally
  clearDraft: () => Promise<void>;
  flush: () => Promise<void>;       // bypass debounce, immediate write
};
```

Internally maintains a ref to the latest unwritten value. `useEffect` cleanup calls `flush()` if dirty.

### 6.3 `useAllDrafts`

```ts
function useAllDrafts(): {
  drafts: DraftRow[];   // includes resolved recipient title + avatar
  isLoading: boolean;
};
interface DraftRow {
  conversationId: string;
  conversationTitle: string;
  conversationKind: 'dm' | 'group_dm' | 'channel' | 'custom_channel' | 'ticket';
  recipientAvatarUrl: string | null;
  bodyPreview: string;
  updatedAt: string;     // ISO
}
```

Joins `chat_message_drafts` with `chat_conversations` to resolve title + kind + avatar. Filters out rows with empty `body_md`. Ordered by `updated_at DESC`.

### 6.4 `useMyScheduledMessages`

```ts
function useMyScheduledMessages(): {
  scheduled: ScheduledMessage[];   // sorted ascending by scheduled_for
  isLoading: boolean;
};
interface ScheduledMessage {
  id: string;
  conversationId: string;
  conversationTitle: string;
  conversationKind: ...;
  recipientAvatarUrl: string | null;
  bodyPreview: string;
  scheduledFor: string;   // ISO
}
```

### 6.5 `useMyScheduledCount` + `useMyScheduledCountByConversation`

Two thin hooks over the same underlying query (one returns total, one returns the per-conv map). Both invalidate on:
- `chat_messages` INSERT where `scheduled_for` is set (new schedule)
- `chat_messages` UPDATE where `delivered_at` flips from null to non-null (cron delivered)
- `chat_messages` DELETE (manual cancel)

Realtime subscription is the existing `ChatRealtimeProvider`.

### 6.6 `useMySentMessages`

```ts
function useMySentMessages(): {
  pages: SentMessage[][];
  hasMore: boolean;
  fetchNextPage: () => void;
  isLoading: boolean;
};
```

Cursor pagination. Page size 50. Query:
```
select id, conversation_id, parent_id, body_md, delivered_at
from chat_messages
where author_id = me
  and delivered_at is not null
  and delivered_at < $cursor
order by delivered_at desc
limit 51
```
The 51st row is sliced off and used to flag `hasMore = true`. Day-group headers are computed in the rendering component using `dayKey` from `lib/formatTimestamp.ts`.

### 6.7 `ComposerScheduledBanner`

```ts
interface ComposerScheduledBannerProps {
  count: number;
  nextSendAt: string;   // ISO
  onSeeAll: () => void;
}
```

Pure presentational — single row with clock icon, formatted timestamp text, and the "See all scheduled messages" link styled as `var(--cv2-accent)`.

### 6.8 `EditScheduledMessagePanel`

```ts
interface EditScheduledMessagePanelProps {
  message: ScheduledMessage;
  onEdit: () => void;       // pulls into composer + deletes row
  onSendNow: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}
```

Mounted by `MessagePanel` when the user clicks a Scheduled row OR when there's exactly one pending scheduled message for the conversation and the user clicks "Edit" from the banner. Dismisses on `Esc`.

---

## 7. Realtime + cache invalidation

| Mutation | Invalidates |
|---|---|
| `upsert chat_message_drafts` (debounced typing) | `['chat-draft', userId, convId]` (single-row), `['all-drafts', userId]` |
| `delete chat_message_drafts` (send / bulk delete) | same as above |
| Insert scheduled `chat_messages` | `['my-scheduled', userId]`, `['my-scheduled-count', userId]` |
| Cron delivered (UPDATE `chat_messages.delivered_at`) | `['my-scheduled', userId]`, `['my-scheduled-count', userId]`, `['my-sent', userId]` |
| Manual scheduled-delete | `['my-scheduled', userId]`, `['my-scheduled-count', userId]` |
| Send now (UPDATE `chat_messages` set `delivered_at = now()`, `scheduled_for = null`) | both scheduled + sent |

Realtime subscription is the existing `ChatRealtimeProvider` — extend its INSERT/UPDATE/DELETE handlers on `chat_messages` to invalidate the new query keys when `author_id === user.id`.

---

## 8. Empty states

- **Drafts empty**: Slack illustration + "Draft messages to send when you're ready" + "Start typing a message anywhere, then find it here. Re-read, revise, and send whenever you'd like." + a "New Message" button that calls `onNewConversation`. (Matches image #239.)
- **Scheduled empty**: just an empty list. No special state — the rail badge already conveys "0 scheduled".
- **Sent empty**: "You haven't sent any messages yet." Centered, muted text.
- **All-outgoing banner** at the very top of the panel (image #239) — "All your outgoing messages — Everything you send, draft, and schedule can now be found here." Dismissable. Persistence key: `localStorage['cv2.draftsBannerDismissed'] = '1'`.

---

## 9. Tokens & styling

All styling uses existing `var(--cv2-*)` tokens. No new tokens required.

- Row hover: `var(--cv2-bg-row-hover)`
- Row border: `var(--cv2-border)`
- Primary text: `var(--cv2-text)`
- Muted text: `var(--cv2-text-subtle)` / `var(--cv2-text-muted)`
- Day-group header: `var(--cv2-text-subtle)` 12px / 500
- Delete button (active): `var(--cv2-danger)` background — token already exists from `DeleteMessageDialog`
- Composer banner clock icon: `var(--cv2-text-subtle)`
- "See all scheduled messages" link: `var(--cv2-accent)`
- Checkbox accent: `var(--cv2-accent)`

Fonts: `var(--cv2-font)` (already ADS-locked via tokens.css).

---

## 10. Test plan

### 10.1 RLS isolation (per CLAUDE.md 2026-06-03)

Two-user smoke test on `chat_message_drafts`:
1. Authenticate as User A; insert a draft for conversation `X`.
2. Authenticate as User B; `select * from chat_message_drafts where conversation_id = 'X'` must return 0 rows.
3. User A sees their draft.

This is a manual test against the live Supabase project (`lmqwtldpfacrrlvdnmld`) using the SQL editor's role-impersonation pattern from the CLAUDE.md 2026-06-03 lesson.

### 10.2 Migration negative test

Confirm `draftsTableAvailable` flag works:
1. Before applying the migration, navigate to `/chat`.
2. Open a conversation, type into the composer.
3. Drafts feature should silently no-op — no toast, no console error visible to the user.
4. Apply the migration. Refresh. Drafts now persist.

### 10.3 Functional matrix

| Scenario | Expected |
|---|---|
| Type in conv A, switch to B, return to A | Composer re-seeded with A's draft |
| Type in conv A, send | Draft row deleted; subsequent visit shows empty composer |
| Schedule a message in conv A | Banner mounts above composer; rail badge increments by 1 |
| Cron delivers a scheduled message | Banner removes itself (or text updates if count > 1 → 1); badge decrements |
| Click "See all scheduled messages" in banner | Drafts panel opens on Scheduled tab |
| Click a Sent row | Source chat opens; message pulses yellow for 2.4s |
| Click a Sent row that is a thread reply | Thread opens; reply pulses inside ThreadPane |
| Click a Scheduled row | Edit panel mounts above composer; composer stays empty |
| `[Edit]` from Edit panel | Composer seeds with message body; row deleted from `chat_messages` |
| `[Send now]` from Edit panel | Message becomes visible to other members immediately |
| `[Delete]` from Edit panel | Row removed; banner updates |
| Drafts: Edit → select 2 → Delete | Both rows removed; select mode exits |
| Drafts: Edit → Select all → Delete | All my drafts removed |
| Drafts: Edit → Done | Exits select mode; nothing deleted |
| Drafts: Edit → Esc | Same as Done |

### 10.4 Theme parity

Run all flows in both light and dark theme. Every surface must inherit `body[data-cv2-theme]` correctly. Portaled menus (none in this feature) — not applicable.

### 10.5 Network-failure handling

- Drafts upsert fails (timeout) → React Query retries. Editor state is unaffected. No toast (drafts are silent).
- Scheduled delete fails (network) → toast "Couldn't cancel message — try again". Row stays.

---

## 11. Open items (deferred to future rounds)

- Drafts search/filter — not in v1.
- Scheduled bulk select + cancel — single-row hover only.
- Sent: per-message hover actions (forward, copy link) — out of scope. Click-to-jump only.
- Mobile layout for the new panel.
- Cross-device draft sync via realtime (currently each tab reads on mount; conflict resolution = last-write-wins via `updated_at`).
- Drafts on threads (replies) — drafts are currently keyed on `conversation_id` only. Thread-reply drafts would need a `parent_message_id` column. Deferred.

---

## 12. Commit discipline reminder

Per `CHAT_V2_CONTEXT.md` §9 and CLAUDE.md 2026-06-01:

- Stage explicit paths only — never `git add -A`.
- Conventional commit prefixes: `feat(chat-v2): drafts-and-sent ...`, `feat(chat-v2): composer draft autosave ...`.
- `git status` before every commit; abort if any unrelated file is staged.
- Add the migration to the commit but treat its deployment as a separate step (don't auto-apply via `apply_migration` without explicit instruction).

---

## 13. Approval log

- Section 1 (Architecture) — approved 2026-06-18.
- Section 2 (Data model) — approved 2026-06-18.
- Section 3 (File map) — approved 2026-06-18.
- Section 4 (Interaction flows) — approved 2026-06-18, with E2 confirmed (no destructive single-click on Scheduled rows).
- Section 5 (Edge cases + defensive flags) — approved 2026-06-18.
