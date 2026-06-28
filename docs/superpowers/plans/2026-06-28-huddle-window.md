# Huddle Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small huddle FAB + standalone screen-share window with one large draggable+resizable Slack-style huddle window containing participant/screen tiles, a thread panel with composer, and a control bar — and post a "huddle happened" event message to the conversation thread on leave.

**Architecture:** A new `HuddleWindow` mounts in `CatalystShell` (app-shell scope, like the FAB) and reads `useHuddleStore`. The FAB becomes the *minimized* form (shown only when `windowState === 'minimized'`). Screen share renders inside the window (stream getters + marker data-channel lifted from `HuddleScreenView`, which is retired from the shell). Messages typed in the window go through the existing `useMessages(conversationId).sendMessage` into `chat_messages`; the right panel shows only this-session messages. On `leave()`, the store inserts one idempotent `chat_messages` row with `event_type='huddle_summary'`, rendered as a centered event row in `MessageList`.

**Tech Stack:** React + TypeScript, Zustand (`@/store/huddleStore`), Supabase (`chat_messages`, migrations), `@atlaskit/*`, Vitest.

## Global Constraints

- ADS tokens only — `var(--ds-*)` / existing `--cv2-*` vars. No hex/rgb/Tailwind color utilities in new code (match the existing huddle components, which use `var(--ds-…, #fallback)` pairs — keep that exact pattern).
- Reuse canonical components: `Composer` for the message box, `@atlaskit/avatar` for tiles. No hand-rolled composer/table/menu.
- No new call capabilities: audio + screen share only. WebRTC `HuddleConnection` stays 2-person. No camera, no add-people, no reactions/raise-hand.
- Stage explicit files per commit. Never `git add -A`.
- Run tests with `npx vitest run <file>`; lint with `npx eslint <file>`.
- Migrations: additive only (`ADD COLUMN IF NOT EXISTS`). Do not alter existing columns/policies.

---

### Task 1: Schema — `event_type` / `event_meta` on `chat_messages`

**Files:**
- Create: `supabase/migrations/20260628100000_chat_message_huddle_event.sql`

**Interfaces:**
- Produces: nullable columns `chat_messages.event_type text`, `chat_messages.event_meta jsonb`; partial unique index `chat_messages_huddle_summary_uniq` on `(event_meta->>'huddle_id')` where `event_type='huddle_summary'` (guarantees one summary row per huddle even if both clients insert).

- [ ] **Step 1: Write the migration**

```sql
-- 20260628100000_chat_message_huddle_event.sql
-- Adds an event-message channel to chat_messages so a huddle can post a
-- "A huddle happened" summary row into the conversation thread.
-- Normal messages leave both columns NULL (no behavior change).

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS event_meta jsonb;

COMMENT ON COLUMN public.chat_messages.event_type IS
  'NULL = normal message. Non-null = system/event row (e.g. huddle_summary).';
COMMENT ON COLUMN public.chat_messages.event_meta IS
  'Event payload, e.g. { huddle_id, duration_seconds, with_name } for huddle_summary.';

-- One huddle_summary per huddle: both peers may race to insert on leave; the
-- partial unique index makes the second insert fail (caught + ignored client-side).
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_huddle_summary_uniq
  ON public.chat_messages ((event_meta->>'huddle_id'))
  WHERE event_type = 'huddle_summary';
```

- [ ] **Step 2: Apply locally and verify**

Run (against the local Supabase DB used by this repo):
```bash
supabase db push
```
Expected: applies without error. If `supabase` CLI is not wired for push here, apply the SQL via the project's standard migration path (same as other `supabase/migrations/*` files) and confirm.

Verify columns + index exist:
```bash
psql "$SUPABASE_DB_URL" -c "\d+ public.chat_messages" | grep -E 'event_type|event_meta'
psql "$SUPABASE_DB_URL" -c "\di public.chat_messages_huddle_summary_uniq"
```
Expected: both columns listed; index listed.

- [ ] **Step 3: Confirm RLS unaffected**

The existing `chat_messages_insert` policy authorizes on `author_id = auth.uid()` + conversation membership. The new columns are not referenced by any policy, so an insert that sets `author_id = selfId` still passes. No policy change. (Read `supabase/migrations/20260618000101_chat_attachment_upload_fix.sql:43-` to confirm the current insert policy shape; do NOT modify it.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260628100000_chat_message_huddle_event.sql
git commit -m "feat(huddle): add event_type/event_meta to chat_messages for huddle summary"
```

---

### Task 2: Carry event fields on `ChatMessage` (read path)

**Files:**
- Modify: `src/types/chat.ts` (add fields to `ChatMessage`)
- Modify: `src/hooks/chat/useMessages.ts:25-27` (field lists), `:33-48` (MessageRow), `:185-206` (mapping)
- Test: `src/hooks/chat/useMessages.eventfields.test.ts` (create)

**Interfaces:**
- Consumes: Task 1 columns.
- Produces: `ChatMessage.eventType: string | null`, `ChatMessage.eventMeta: Record<string, unknown> | null`. `useMessages` returns these populated; normal rows have `null`.

- [ ] **Step 1: Add fields to the `ChatMessage` type**

In `src/types/chat.ts`, find the `ChatMessage` interface and add (near `bodyAdf`):
```ts
  /** Non-null for system/event rows (e.g. 'huddle_summary'). Normal messages: null. */
  eventType?: string | null;
  /** Event payload for event rows. Normal messages: null. */
  eventMeta?: Record<string, unknown> | null;
```

- [ ] **Step 2: Write a failing test for the mapper**

The mapping is inline in `fetchPage`. Extract the row→ChatMessage mapping concerns by testing the public contract: a `MessageRow` with `event_type` set surfaces as `eventType`. Create `src/hooks/chat/useMessages.eventfields.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { ChatMessage } from '@/types/chat';

// Mirrors the mapping added in useMessages.fetchPage. Kept as a pure helper so
// the event-field plumbing is unit-testable without a live Supabase.
export function mapEventFields(row: { event_type?: string | null; event_meta?: unknown }): Pick<ChatMessage, 'eventType' | 'eventMeta'> {
  return {
    eventType: row.event_type ?? null,
    eventMeta: (row.event_meta as Record<string, unknown> | null) ?? null,
  };
}

describe('message event fields', () => {
  it('surfaces huddle_summary event_type + meta', () => {
    const out = mapEventFields({ event_type: 'huddle_summary', event_meta: { duration_seconds: 62 } });
    expect(out.eventType).toBe('huddle_summary');
    expect(out.eventMeta).toEqual({ duration_seconds: 62 });
  });
  it('normal rows map to null', () => {
    const out = mapEventFields({});
    expect(out.eventType).toBeNull();
    expect(out.eventMeta).toBeNull();
  });
});
```

- [ ] **Step 3: Run it — fails (helper not wired into the real fetch)**

Run: `npx vitest run src/hooks/chat/useMessages.eventfields.test.ts`
Expected: PASS for the helper in isolation, but it is not yet used by `useMessages`. (This test pins the contract; next step wires the same logic into the real fetch.)

- [ ] **Step 4: Wire event fields into `useMessages`**

In `src/hooks/chat/useMessages.ts`:

`MESSAGE_FIELDS_BASE` (line 25-26) — append the columns:
```ts
const MESSAGE_FIELDS_BASE =
  'id, conversation_id, parent_id, author_id, body_text, body_adf, created_at, edited_at, deleted_at, reply_count, last_reply_at, is_also_in_channel, event_type, event_meta';
```

`MessageRow` interface (after `body_adf: unknown | null;`, line ~39) add:
```ts
  event_type: string | null;
  event_meta: Record<string, unknown> | null;
```

In the `messages` map (line ~185-206), add to the returned object (after `bodyAdf`):
```ts
        eventType: m.event_type ?? null,
        eventMeta: m.event_meta ?? null,
```

- [ ] **Step 5: Lint + run the chat message test suite**

Run: `npx eslint src/hooks/chat/useMessages.ts src/types/chat.ts`
Run: `npx vitest run src/hooks/chat/useMessages.eventfields.test.ts`
Expected: lint clean; tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/chat.ts src/hooks/chat/useMessages.ts src/hooks/chat/useMessages.eventfields.test.ts
git commit -m "feat(huddle): plumb event_type/event_meta through ChatMessage read path"
```

---

### Task 3: Duration formatter util

**Files:**
- Create: `src/lib/chat/huddle/formatHuddleDuration.ts`
- Test: `src/lib/chat/huddle/formatHuddleDuration.test.ts`

**Interfaces:**
- Produces: `formatHuddleDuration(seconds: number): string` — e.g. `0→'0s'`, `45→'45s'`, `62→'1m'`, `3720→'1h 2m'`. Used by the event row (Task 5) and may be reused by the window timer.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/chat/huddle/formatHuddleDuration.test.ts
import { describe, it, expect } from 'vitest';
import { formatHuddleDuration } from './formatHuddleDuration';

describe('formatHuddleDuration', () => {
  it('seconds under a minute', () => {
    expect(formatHuddleDuration(0)).toBe('0s');
    expect(formatHuddleDuration(45)).toBe('45s');
  });
  it('whole/partial minutes show minutes only', () => {
    expect(formatHuddleDuration(60)).toBe('1m');
    expect(formatHuddleDuration(62)).toBe('1m');
    expect(formatHuddleDuration(599)).toBe('9m');
  });
  it('hours show h + m', () => {
    expect(formatHuddleDuration(3600)).toBe('1h');
    expect(formatHuddleDuration(3720)).toBe('1h 2m');
  });
  it('guards bad input', () => {
    expect(formatHuddleDuration(-5)).toBe('0s');
    expect(formatHuddleDuration(NaN)).toBe('0s');
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npx vitest run src/lib/chat/huddle/formatHuddleDuration.test.ts`
Expected: FAIL "Cannot find module './formatHuddleDuration'".

- [ ] **Step 3: Implement**

```ts
// src/lib/chat/huddle/formatHuddleDuration.ts
/** Human huddle length: '45s', '1m', '1h 2m'. Minutes drop the seconds. */
export function formatHuddleDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}
```

- [ ] **Step 4: Run — passes**

Run: `npx vitest run src/lib/chat/huddle/formatHuddleDuration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/huddle/formatHuddleDuration.ts src/lib/chat/huddle/formatHuddleDuration.test.ts
git commit -m "feat(huddle): add formatHuddleDuration util"
```

---

### Task 4: Store — window state, chat panel, start time, summary insert on leave

**Files:**
- Modify: `src/store/huddleStore.ts`
- Test: `src/store/huddleStore.test.ts` (extend existing)

**Interfaces:**
- Consumes: Task 1 columns; `formatHuddleDuration` (not needed here — store stores raw seconds).
- Produces on the store:
  - `windowState: 'open' | 'minimized' | 'maximized'`, `setWindowState(m)`.
  - `chatPanelOpen: boolean`, `toggleChatPanel()`.
  - `enter()` sets `windowState:'open'`, `chatPanelOpen:false`, and stamps a module-level `huddleStartedAt`.
  - `leave()` inserts one `chat_messages` row `{ event_type:'huddle_summary', body_text:'A huddle happened', event_meta:{ huddle_id, duration_seconds, with_name } }` before clearing state (duplicate-key error ignored).

- [ ] **Step 1: Write the failing test (extends existing dbCalls pattern)**

Add to `src/store/huddleStore.test.ts` inside the `describe('huddleStore', …)` block:

```ts
  it('enter sets windowState open and chat panel closed', async () => {
    await useHuddleStore.getState().enter({
      conversationId: 'c1', huddleId: 'h1', conversationName: 'Zulqarnain', selfId: 'me',
    });
    expect(useHuddleStore.getState().windowState).toBe('open');
    expect(useHuddleStore.getState().chatPanelOpen).toBe(false);
  });

  it('leave inserts a huddle_summary event message', async () => {
    await useHuddleStore.getState().enter({
      conversationId: 'c1', huddleId: 'h1', conversationName: 'Zulqarnain', selfId: 'me',
    });
    dbCalls.length = 0;
    useHuddleStore.getState().leave();
    await Promise.resolve(); // let the async insert flush
    const summary = dbCalls.find(
      (c) => c.op === 'insert' && c.vals?.event_type === 'huddle_summary',
    );
    expect(summary).toBeTruthy();
    expect(summary.vals.event_meta.huddle_id).toBe('h1');
    expect(summary.vals.event_meta.with_name).toBe('Zulqarnain');
    expect(summary.vals.body_text).toBe('A huddle happened');
  });
```

- [ ] **Step 2: Run — fails**

Run: `npx vitest run src/store/huddleStore.test.ts`
Expected: FAIL — `windowState` undefined / no `huddle_summary` insert.

- [ ] **Step 3: Add state + start-time ref**

In `src/store/huddleStore.ts`:

Add module ref near the other refs (after line 60):
```ts
let huddleStartedAt: number | null = null;
```

Extend the `HuddleStore` interface (inside the `interface HuddleStore {` block):
```ts
  /** Big huddle-window display mode. 'minimized' shows the compact FAB instead. */
  windowState: 'open' | 'minimized' | 'maximized';
  setWindowState: (m: 'open' | 'minimized' | 'maximized') => void;
  /** Is the in-window Thread panel open? */
  chatPanelOpen: boolean;
  toggleChatPanel: () => void;
```

In the store body (near `screenWindow` defaults, line ~141) add:
```ts
  windowState: 'open',
  setWindowState: (m) => set({ windowState: m }),
  chatPanelOpen: false,
  toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
```

- [ ] **Step 4: Stamp start time + window state in `enter()`**

In `enter()` `set({ … })` (line ~173-179) add to the object:
```ts
      windowState: 'open',
      chatPanelOpen: false,
```
And after `huddleIdRef = huddleId;` (line ~172) add:
```ts
    huddleStartedAt = Date.now();
```

- [ ] **Step 5: Insert the summary in `leave()`**

Add a helper near `markLeft` (after line 137):
```ts
/** Post one "A huddle happened" event row into the conversation thread.
 *  Idempotent: the partial unique index on (event_meta->>'huddle_id') rejects a
 *  duplicate from the other peer — we swallow that error. */
async function postHuddleSummary(
  conversationId: string | null, huddleId: string | null,
  authorId: string | null, withName: string, startedAt: number | null,
) {
  if (!conversationId || !huddleId || !authorId) return;
  const durationSeconds = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
  try {
    await db.from('chat_messages').insert({
      conversation_id: conversationId,
      author_id: authorId,
      body_text: 'A huddle happened',
      event_type: 'huddle_summary',
      event_meta: { huddle_id: huddleId, duration_seconds: durationSeconds, with_name: withName },
    });
  } catch { /* duplicate (other peer already posted) or transient — ignore */ }
}
```

In `leave()`, capture the values BEFORE clearing refs (the function currently nulls `huddleIdRef`/`selfIdRef` at line 198-199). Replace the body from line 196 onward:
```ts
    const a = get().active;
    void markLeft(huddleIdRef, selfIdRef);
    void setOnCall(selfIdRef, null);
    void postHuddleSummary(a?.conversationId ?? null, huddleIdRef, selfIdRef, a?.conversationName ?? '', huddleStartedAt);
    selfIdRef = null;
    huddleIdRef = null;
    huddleStartedAt = null;
    set({ active: null, screenWindow: 'normal', windowState: 'open', chatPanelOpen: false, ticketsWindow: 'closed', ticketsAutoOpened: false, markerPen: false });
```
(Note: `.insert(...)` on the real Supabase client returns a thenable that may reject; the `try/catch` in `postHuddleSummary` only catches synchronous throws — also chain `.then(undefined, () => {})`? The existing `db` cast resolves errors in the `{ error }` shape, not a reject, so a duplicate yields `{ error }` not a throw. To be safe, ignore the returned error explicitly: capture `const { error } = await db... ; void error;`.)

Apply that safety: change the insert to:
```ts
    const { error } = await db.from('chat_messages').insert({ /* …as above… */ });
    void error; // duplicate summary from the other peer is expected & ignored
```

- [ ] **Step 6: Run — passes**

Run: `npx vitest run src/store/huddleStore.test.ts`
Expected: PASS (all existing + 2 new).

- [ ] **Step 7: Lint + commit**

```bash
npx eslint src/store/huddleStore.ts
git add src/store/huddleStore.ts src/store/huddleStore.test.ts
git commit -m "feat(huddle): store windowState/chatPanel + post huddle_summary on leave"
```

---

### Task 5: Render the `huddle_summary` event row in the thread

**Files:**
- Create: `src/features/chat-v2/components/MessagePanel/HuddleEventRow.tsx`
- Modify: `src/features/chat-v2/components/MessagePanel/MessageList.tsx` (branch in `buildRenderList` + render)
- Test: `src/features/chat-v2/components/MessagePanel/HuddleEventRow.test.tsx`

**Interfaces:**
- Consumes: `ChatMessage.eventType` / `eventMeta` (Task 2), `formatHuddleDuration` (Task 3).
- Produces: a centered "🎧 A huddle happened — You and {with_name} were in the huddle for {dur}" row, rendered in place of a `MessageBubble` when `message.eventType === 'huddle_summary'`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/chat-v2/components/MessagePanel/HuddleEventRow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HuddleEventRow } from './HuddleEventRow';
import type { ChatMessage } from '@/types/chat';

function msg(meta: Record<string, unknown>): ChatMessage {
  return {
    id: 'm1', conversationId: 'c1', parentId: null, authorId: 'me', authorName: 'Me',
    authorAvatarUrl: null, bodyText: 'A huddle happened', bodyAdf: null,
    createdAt: new Date().toISOString(), editedAt: null, deletedAt: null,
    scheduledFor: null, deliveredAt: null, reactions: [], replyCount: 0,
    lastReplyAt: null, isAlsoInChannel: false,
    eventType: 'huddle_summary', eventMeta: meta,
  } as ChatMessage;
}

describe('HuddleEventRow', () => {
  it('shows the duration and other participant', () => {
    render(<HuddleEventRow message={msg({ duration_seconds: 62, with_name: 'Zulqarnain' })} />);
    expect(screen.getByText(/A huddle happened/i)).toBeTruthy();
    expect(screen.getByText(/Zulqarnain/)).toBeTruthy();
    expect(screen.getByText(/1m/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npx vitest run src/features/chat-v2/components/MessagePanel/HuddleEventRow.test.tsx`
Expected: FAIL "Cannot find module './HuddleEventRow'".

- [ ] **Step 3: Implement `HuddleEventRow`**

```tsx
// src/features/chat-v2/components/MessagePanel/HuddleEventRow.tsx
import React from 'react';
import type { ChatMessage } from '@/types/chat';
import { formatHuddleDuration } from '@/lib/chat/huddle/formatHuddleDuration';

/** Centered system row in the thread: "🎧 A huddle happened — …in the huddle for 1m". */
export function HuddleEventRow({ message }: { message: ChatMessage }) {
  const meta = (message.eventMeta ?? {}) as { duration_seconds?: number; with_name?: string };
  const dur = formatHuddleDuration(Number(meta.duration_seconds ?? 0));
  const withName = (meta.with_name || '').trim();
  const detail = withName
    ? `You and ${withName} were in the huddle for ${dur}.`
    : `In the huddle for ${dur}.`;
  return (
    <div
      role="note"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 20px', margin: '2px 0',
        color: 'var(--cv2-text-muted, var(--ds-text-subtle, #44546F))',
        fontFamily: 'var(--cv2-font)', fontSize: 13,
      }}
    >
      <span aria-hidden style={{
        flex: '0 0 auto', width: 28, height: 28, borderRadius: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--ds-surface-sunken, #F7F8F9)',
      }}>🎧</span>
      <span>
        <strong style={{ color: 'var(--ds-text, #172B4D)' }}>A huddle happened</strong>
        {'  '}{detail}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Branch in `MessageList`**

In `src/features/chat-v2/components/MessagePanel/MessageList.tsx`:

Add import at top:
```tsx
import { HuddleEventRow } from './HuddleEventRow';
```

In the `renderList.map(...)` (line ~165), change the message branch so event rows render `HuddleEventRow`:
```tsx
          item.kind === 'date' ? (
            <DateSeparator
              key={item.key}
              iso={item.date!}
              onJumpToDate={handleJumpToDate}
              onJumpMostRecent={handleJumpRecent}
              onJumpBeginning={handleJumpBeginning}
            />
          ) : item.message!.eventType === 'huddle_summary' ? (
            <HuddleEventRow key={item.key} message={item.message!} />
          ) : (
            <MessageBubble
              key={item.key}
              message={item.message!}
              showHeader={!!item.showHeader}
              /* …existing props unchanged… */
              onOpenForwardSource={onOpenForwardSource}
            />
          ),
```
(Keep every existing `MessageBubble` prop exactly as-is; only the `item.message!.eventType === 'huddle_summary'` branch is inserted before it.)

Also, in `buildRenderList` (line ~47-65), event rows should not be grouped under "same author" headers — they have no avatar header anyway since they bypass `MessageBubble`. No change needed there; the bypass at render time is sufficient.

- [ ] **Step 5: Run + lint**

Run: `npx vitest run src/features/chat-v2/components/MessagePanel/HuddleEventRow.test.tsx`
Run: `npx eslint src/features/chat-v2/components/MessagePanel/HuddleEventRow.tsx src/features/chat-v2/components/MessagePanel/MessageList.tsx`
Expected: PASS; lint clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/chat-v2/components/MessagePanel/HuddleEventRow.tsx src/features/chat-v2/components/MessagePanel/MessageList.tsx src/features/chat-v2/components/MessagePanel/HuddleEventRow.test.tsx
git commit -m "feat(huddle): render huddle_summary event row in the thread"
```

---

### Task 6: `HuddleWindow` shell — frame, drag, resize, mount; gate the FAB

**Files:**
- Create: `src/components/layout/HuddleWindow.tsx`
- Modify: `src/components/layout/CatalystShell.tsx:24` (import) `:882` (replace `<HuddleScreenView />` mount with `<HuddleWindow />`)
- Modify: `src/components/layout/HuddleFab.tsx` (gate visibility on `windowState==='minimized'`; click → restore)

**Interfaces:**
- Consumes: `useHuddleStore` (`active`, `windowState`, `setWindowState`).
- Produces: `HuddleWindow` component (default export `function HuddleWindow()`), rendered when `active && windowState !== 'minimized'`. This task delivers the empty frame (header + draggable/resizable container); stage/thread/controls are added in Tasks 7-9.

- [ ] **Step 1: Create the window frame**

```tsx
// src/components/layout/HuddleWindow.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useHuddleStore } from '@/store/huddleStore';

/**
 * HuddleWindow — large draggable + resizable Slack-style huddle surface.
 * Replaces the FAB + standalone screen window as THE call UI while open.
 * - windowState 'open'      : floating window (this component).
 * - windowState 'minimized' : hidden here; the compact HuddleFab shows instead.
 * - windowState 'maximized' : full-viewport.
 * Mounted at app-shell scope (survives route changes), like the FAB.
 */
const POS_KEY = 'huddle-window-pos';
const SIZE_KEY = 'huddle-window-size';
type Pos = { top: number; left: number };
type Size = { w: number; h: number };
function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch { /* ignore */ }
  return fallback;
}

export function HuddleWindow() {
  const active = useHuddleStore((s) => s.active);
  const windowState = useHuddleStore((s) => s.windowState);
  const setWindowState = useHuddleStore((s) => s.setWindowState);

  const [pos, setPos] = useState<Pos>(() => load(POS_KEY, { top: 72, left: 120 }));
  const [size] = useState<Size>(() => load(SIZE_KEY, { w: 900, h: 560 }));
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // persist size on resize (normal mode only)
  useEffect(() => {
    if (windowState !== 'open') return;
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      try { localStorage.setItem(SIZE_KEY, JSON.stringify({ w: el.offsetWidth, h: el.offsetHeight })); } catch { /* ignore */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [windowState]);

  // drag via the title bar
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-huddle-btn]')) return;
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current; const el = wrapRef.current;
    if (!d || !el || e.buttons === 0) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    el.style.left = `${Math.max(8, Math.min(window.innerWidth - el.offsetWidth - 8, d.ox + dx))}px`;
    el.style.top = `${Math.max(8, Math.min(window.innerHeight - el.offsetHeight - 8, d.oy + dy))}px`;
  }, []);
  const endDrag = useCallback(() => {
    const d = dragRef.current; const el = wrapRef.current; dragRef.current = null;
    if (!d || !d.moved || !el) return;
    const r = el.getBoundingClientRect();
    const next = { top: Math.max(8, r.top), left: Math.max(8, r.left) };
    setPos(next);
    try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  if (!active || windowState === 'minimized') return null;
  const maximized = windowState === 'maximized';

  const frameStyle: React.CSSProperties = maximized
    ? { position: 'fixed', inset: 16, zIndex: 120 }
    : { position: 'fixed', top: pos.top, left: pos.left, width: size.w, height: size.h, minWidth: 560, minHeight: 380, resize: 'both', zIndex: 120 };

  return (
    <div
      ref={wrapRef}
      role="dialog"
      aria-label={`Huddle with ${active.conversationName}`}
      style={{
        ...frameStyle,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'var(--ds-surface, #FFFFFF)',
        borderRadius: maximized ? 12 : 14,
        border: '1px solid var(--ds-border, #DFE1E6)',
        boxShadow: '0 24px 64px rgba(9,30,66,.34)',
      }}
    >
      {/* title bar */}
      <div
        onPointerDown={maximized ? undefined : onPointerDown}
        onPointerMove={maximized ? undefined : onPointerMove}
        onPointerUp={maximized ? undefined : endDrag}
        onPointerCancel={maximized ? undefined : endDrag}
        style={{
          flex: '0 0 auto', height: 44, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 12px', cursor: maximized ? 'default' : 'grab', touchAction: 'none',
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-surface-overlay, #FFFFFF)',
        }}
      >
        <span aria-hidden>🎧</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ds-text, #172B4D)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Huddle with {active.conversationName}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
          <button type="button" data-huddle-btn title="Minimize" onClick={() => setWindowState('minimized')} style={winBtn}>—</button>
          {maximized
            ? <button type="button" data-huddle-btn title="Restore" onClick={() => setWindowState('open')} style={winBtn}>❐</button>
            : <button type="button" data-huddle-btn title="Maximize" onClick={() => setWindowState('maximized')} style={winBtn}>▢</button>}
        </span>
      </div>

      {/* body: stage (Task 7) | thread (Task 8) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div data-huddle-stage style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--ds-surface-sunken, #F7F8F9)' }}>
          {/* stage content added in Task 7 */}
        </div>
        {/* thread panel added in Task 8 */}
      </div>

      {/* control bar added in Task 9 */}
    </div>
  );
}

const winBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--ds-surface-sunken, #F7F8F9)', color: 'var(--ds-text, #172B4D)', fontSize: 14,
};
```

- [ ] **Step 2: Mount in `CatalystShell`, replacing the standalone screen view**

In `src/components/layout/CatalystShell.tsx`:

Replace the import on line 24:
```tsx
import { HuddleWindow } from "./HuddleWindow";
```
Replace the mount on line 882 (`<HuddleScreenView />`):
```tsx
      <HuddleWindow />
```
(Leave `<HuddleFab />` and `<HuddleIncoming />` mounts as-is. `HuddleScreenView.tsx` is now unreferenced — leave the file in place but unmounted; do NOT delete in this task.)

- [ ] **Step 3: Gate the FAB to the minimized state + click-to-restore**

In `src/components/layout/HuddleFab.tsx`:

Read `windowState` (add near line 37):
```tsx
  const windowState = useHuddleStore((s) => s.windowState);
  const setWindowState = useHuddleStore((s) => s.setWindowState);
```
Change the early return (line 174) so the FAB only shows while minimized:
```tsx
  if (!active || windowState !== 'minimized') return null;
```
In `endDrag` (line ~157), change the no-drag click from toggling expand to restoring the window:
```tsx
    if (!d.moved) { setWindowState('open'); return; } // click (no drag) → reopen the window
```

- [ ] **Step 4: Typecheck the touched files via build-less lint + a render smoke test**

Run: `npx eslint src/components/layout/HuddleWindow.tsx src/components/layout/CatalystShell.tsx src/components/layout/HuddleFab.tsx`
Expected: lint clean (no unused `HuddleScreenView` import remains in CatalystShell — verify it was replaced, not duplicated).

Manual smoke (per CLAUDE.md UI acceptance — DOM proof, not just screenshot): start the app (`npm run dev`), start a huddle on `/chat`, confirm:
- Big window appears with title "Huddle with {name}".
- Drag by title bar moves it; resize handle works; position persists on reload.
- Minimize → window hides, compact FAB appears; clicking FAB body reopens the window.
- Maximize/restore toggle works.
Capture a screenshot for the feature folder `10_SCREENSHOT_CHECKLIST.md`.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/HuddleWindow.tsx src/components/layout/CatalystShell.tsx src/components/layout/HuddleFab.tsx
git commit -m "feat(huddle): add HuddleWindow frame, mount in shell, FAB becomes minimized state"
```

---

### Task 7: Window stage — participant tile + screen-share video + annotation canvas

**Files:**
- Modify: `src/components/layout/HuddleWindow.tsx`

**Interfaces:**
- Consumes: `getHuddleRemoteScreen`, `getHuddleLocalScreen`, `getHuddleRemoteStream`, `onHuddleMarker`, `sendHuddleMarker` from `@/store/huddleStore`; `useActiveHuddle` for participant avatars; `markerPen`/`setMarkerPen` from the store.
- Produces: stage content filling `[data-huddle-stage]` — a participant tile (avatar) beside a screen-share video with the annotation canvas (marker logic lifted from `HuddleScreenView`).

- [ ] **Step 1: Add stage imports + state**

At the top of `HuddleWindow.tsx` extend the store import and add atlaskit avatar + hook:
```tsx
import { useHuddleStore, getHuddleRemoteScreen, getHuddleLocalScreen, sendHuddleMarker, onHuddleMarker } from '@/store/huddleStore';
import Avatar from '@atlaskit/avatar';
import { useActiveHuddle } from '@/hooks/chat/useHuddleData';
```
Inside the component add (after the existing store selectors):
```tsx
  const markerPen = useHuddleStore((s) => s.markerPen);
  const { huddle } = useActiveHuddle(active?.conversationId ?? null);
  const participants = huddle?.participants ?? [];
  const remoteSharing = !!active?.remoteSharing;
  const localSharing = !!active?.screenSharing;
  const showRemote = remoteSharing;
  const screenVisible = remoteSharing || localSharing;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<{ id: string; color: string; points: { x: number; y: number }[]; t: number }[]>([]);
  const drawingRef = useRef<{ id: string; color: string; points: { x: number; y: number }[]; t: number } | null>(null);
  const lastSendRef = useRef(0);
```

- [ ] **Step 2: Lift the marker receive/redraw/draw logic**

Add these effects + handlers inside the component (ported verbatim from `HuddleScreenView.tsx:52-150`, using the local refs above). Paste the full blocks:

```tsx
  // receive remote markers → upsert by id
  useEffect(() => onHuddleMarker((m) => {
    const s = m as { id: string; color: string; points: { x: number; y: number }[] };
    if (!s || !s.id || !Array.isArray(s.points)) return;
    const arr = strokesRef.current;
    const i = arr.findIndex((x) => x.id === s.id);
    const next = { id: s.id, color: s.color || '#C9372C', points: s.points, t: Date.now() };
    if (i >= 0) arr[i] = next; else arr.push(next);
  }), []);

  // redraw loop with fade-out
  useEffect(() => {
    const FADE_HOLD = 2500, FADE_OUT = 700;
    const contentRect = (W: number, H: number) => {
      const v = videoRef.current;
      const vw = v?.videoWidth || 0, vh = v?.videoHeight || 0;
      if (!vw || !vh) return { x: 0, y: 0, w: W, h: H };
      const s = Math.min(W / vw, H / vh);
      const cw = vw * s, ch = vh * s;
      return { x: (W - cw) / 2, y: (H - ch) / 2, w: cw, h: ch };
    };
    let raf = 0;
    const loop = () => {
      const cv = canvasRef.current;
      if (cv) {
        const w = cv.clientWidth, h = cv.clientHeight;
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          const now = Date.now();
          strokesRef.current = strokesRef.current.filter((s) => now - s.t < FADE_HOLD + FADE_OUT);
          const cr = contentRect(w, h);
          for (const s of strokesRef.current) {
            const age = now - s.t;
            ctx.globalAlpha = age < FADE_HOLD ? 1 : Math.max(0, 1 - (age - FADE_HOLD) / FADE_OUT);
            ctx.strokeStyle = s.color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath();
            s.points.forEach((p, idx) => {
              const x = cr.x + p.x * cr.w, y = cr.y + p.y * cr.h;
              if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // bind the right screen stream to the <video>
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const stream = showRemote ? getHuddleRemoteScreen() : localSharing ? getHuddleLocalScreen() : null;
    v.srcObject = stream ?? null;
    if (stream) void v.play().catch(() => { /* autoplay guard */ });
  }, [showRemote, localSharing, remoteSharing, windowState]);

  const normPt = useCallback((e: React.PointerEvent) => {
    const cv = canvasRef.current!; const r = cv.getBoundingClientRect();
    const v = videoRef.current; const vw = v?.videoWidth || 0, vh = v?.videoHeight || 0;
    const s = vw && vh ? Math.min(r.width / vw, r.height / vh) : 1;
    const cw = vw ? vw * s : r.width, ch = vh ? vh * s : r.height;
    const cx = (r.width - cw) / 2, cy = (r.height - ch) / 2;
    return { x: (e.clientX - r.left - cx) / cw, y: (e.clientY - r.top - cy) / ch };
  }, []);
  const onCanvasDown = useCallback((e: React.PointerEvent) => {
    if (!markerPen) return;
    e.stopPropagation();
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const stroke = { id, color: '#22A06B', points: [normPt(e)], t: Date.now() };
    drawingRef.current = stroke; strokesRef.current.push(stroke);
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, [markerPen, normPt]);
  const onCanvasMove = useCallback((e: React.PointerEvent) => {
    const d = drawingRef.current;
    if (!markerPen || !d || e.buttons === 0) return;
    d.points.push(normPt(e)); d.t = Date.now();
    const now = Date.now();
    if (now - lastSendRef.current > 50) { lastSendRef.current = now; sendHuddleMarker({ id: d.id, color: d.color, points: d.points }); }
  }, [markerPen, normPt]);
  const onCanvasUp = useCallback(() => {
    const d = drawingRef.current;
    if (d) { sendHuddleMarker({ id: d.id, color: d.color, points: d.points }); drawingRef.current = null; }
  }, []);
```

- [ ] **Step 3: Render the stage content**

Replace the `{/* stage content added in Task 7 */}` placeholder inside `[data-huddle-stage]` with:
```tsx
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: 12 }}>
            {/* screen-share tile (only when someone shares) */}
            {screenVisible && (
              <div style={{ flex: 2, minWidth: 0, position: 'relative', background: '#000', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ flex: 1, width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block', minHeight: 0 }} />
                <canvas ref={canvasRef}
                  onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={onCanvasUp}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                    pointerEvents: markerPen ? 'auto' : 'none', cursor: markerPen ? 'crosshair' : 'default', touchAction: 'none' }} />
                <span style={{ position: 'absolute', left: 12, bottom: 12, padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(9,30,66,.55)', color: '#FFFFFF', fontSize: 12, fontWeight: 600 }}>
                  {showRemote ? `${active.conversationName} — screen` : 'You are sharing'}
                </span>
              </div>
            )}
            {/* participant tile(s) */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--ds-surface, #FFFFFF)', borderRadius: 12, border: '1px solid var(--ds-border, #DFE1E6)' }}>
              <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {participants.length > 0
                  ? <Avatar size="xxlarge" name={participants[participants.length - 1].name || undefined} src={participants[participants.length - 1].avatarUrl || undefined} />
                  : <Avatar size="xxlarge" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
                  {participants[participants.length - 1]?.name || active.conversationName}
                </span>
              </span>
            </div>
          </div>
```

- [ ] **Step 4: Lint + manual verify**

Run: `npx eslint src/components/layout/HuddleWindow.tsx`
Expected: clean.

Manual (DOM proof): start a huddle on two clients; share screen from one. Confirm the remote screen renders in the window's left tile, the participant avatar in the right tile, and (with marker pen on) annotation strokes draw and replicate to the peer. Screenshot for the checklist.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/HuddleWindow.tsx
git commit -m "feat(huddle): window stage — participant tile + screen share + annotations"
```

---

### Task 8: Window thread panel — session messages + composer

**Files:**
- Modify: `src/components/layout/HuddleWindow.tsx`

**Interfaces:**
- Consumes: `useMessages(active.conversationId)` → `{ messages, sendMessage }`; `Composer`; `chatPanelOpen` from the store; the huddle start time to filter session messages.
- Produces: a ~360px right panel (rendered when `chatPanelOpen`) showing the Slack intro then only messages created at/after huddle start, with a `Composer` whose `onSend` posts to the conversation thread.

- [ ] **Step 1: Imports + session message hook**

Add imports to `HuddleWindow.tsx`:
```tsx
import { useMessages } from '@/hooks/chat/useMessages';
import { Composer } from '@/features/chat-v2/components/Composer/Composer';
```
Add inside the component (after the existing selectors):
```tsx
  const chatPanelOpen = useHuddleStore((s) => s.chatPanelOpen);
  const { messages, sendMessage } = useMessages(active?.conversationId ?? null);
  // huddle started this session — only show messages from now on, like Slack.
  const sessionStartRef = useRef<string>(new Date().toISOString());
  useEffect(() => { sessionStartRef.current = new Date().toISOString(); }, [active?.huddleId]);
  const sessionMessages = messages.filter(
    (m) => m.eventType !== 'huddle_summary' && m.createdAt >= sessionStartRef.current,
  );
```
(ISO strings from the same source compare lexicographically in time order, so the `>=` filter is valid.)

- [ ] **Step 2: Render the thread panel**

After the `[data-huddle-stage]` `</div>` and before the body's closing `</div>`, add:
```tsx
        {chatPanelOpen && (
          <div style={{ flex: '0 0 360px', minWidth: 0, display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface, #FFFFFF)' }}>
            <div style={{ flex: '0 0 auto', padding: '10px 14px', borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              fontWeight: 700, fontSize: 14, color: 'var(--ds-text, #172B4D)' }}>Thread</div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sessionMessages.length === 0 ? (
                <div style={{ color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 13, lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ds-text, #172B4D)' }}>Every huddle has a thread.</strong>
                  {' '}Send messages, files, and links to everyone in the huddle. They are saved in this conversation, so you can read them after the huddle ends.
                </div>
              ) : (
                sessionMessages.map((m) => (
                  <div key={m.id} style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: 'var(--ds-text, #172B4D)' }}>{m.authorName || 'You'}</span>
                    <span style={{ marginLeft: 8, color: 'var(--ds-text, #172B4D)', whiteSpace: 'pre-wrap' }}>{m.bodyText}</span>
                  </div>
                ))
              )}
            </div>
            <div style={{ flex: '0 0 auto', borderTop: '1px solid var(--ds-border, #DFE1E6)' }}>
              <Composer
                placeholder="Message"
                conversationId={active.conversationId}
                onSend={(md) => { void sendMessage(md); }}
              />
            </div>
          </div>
        )}
```
(If `Composer` has additional required props beyond `placeholder`/`onSend`/`conversationId`, read `src/features/chat-v2/components/Composer/Composer.tsx:14-60` and pass the minimal required set — do not invent handlers; reuse existing optional defaults.)

- [ ] **Step 3: Lint + manual verify**

Run: `npx eslint src/components/layout/HuddleWindow.tsx`
Manual (DOM proof): with the chat panel toggled open (Task 9 wires the toggle; until then set `chatPanelOpen` default to `true` temporarily OR verify via React devtools), type a message → it appears in the panel AND in the `/chat` thread, and persists after leaving. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/HuddleWindow.tsx
git commit -m "feat(huddle): window thread panel — session messages + composer"
```

---

### Task 9: Window control bar — mute · screen share · chat toggle · leave

**Files:**
- Modify: `src/components/layout/HuddleWindow.tsx`

**Interfaces:**
- Consumes: store actions `toggleMute`, `startScreen`, `stopScreen`, `leave`, `toggleChatPanel`; `active.micMuted`, `active.screenSharing`, `active.remoteSharing`.
- Produces: a bottom control bar inside the window.

- [ ] **Step 1: Pull the action selectors**

Add inside the component:
```tsx
  const toggleMute = useHuddleStore((s) => s.toggleMute);
  const startScreen = useHuddleStore((s) => s.startScreen);
  const stopScreen = useHuddleStore((s) => s.stopScreen);
  const leave = useHuddleStore((s) => s.leave);
  const toggleChatPanel = useHuddleStore((s) => s.toggleChatPanel);
  const muted = !!active?.micMuted;
  const sharing = !!active?.screenSharing;
```

- [ ] **Step 2: Render the control bar**

Replace the `{/* control bar added in Task 9 */}` placeholder (just before the outer container's closing `</div>`) with:
```tsx
      <div style={{ flex: '0 0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        borderTop: '1px solid var(--ds-border, #DFE1E6)', background: 'var(--ds-surface-overlay, #FFFFFF)' }}>
        <button type="button" data-huddle-btn onClick={toggleMute} aria-pressed={muted} title={muted ? 'Unmute' : 'Mute'}
          style={ctrlBtn(muted ? 'var(--ds-background-warning, #FFF7D6)' : 'var(--ds-surface-sunken, #F7F8F9)')}>
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button type="button" data-huddle-btn disabled={remoteSharing}
          onClick={() => { if (!remoteSharing) void (sharing ? stopScreen() : startScreen()); }}
          aria-pressed={sharing}
          title={remoteSharing ? 'Other participant is sharing' : sharing ? 'Stop sharing' : 'Share screen'}
          style={{ ...ctrlBtn(sharing ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-surface-sunken, #F7F8F9)'),
            opacity: remoteSharing ? 0.45 : 1, cursor: remoteSharing ? 'not-allowed' : 'pointer' }}>
          {sharing ? 'Stop share' : 'Share screen'}
        </button>
        <button type="button" data-huddle-btn onClick={toggleChatPanel} aria-pressed={chatPanelOpen} title="Toggle chat"
          style={ctrlBtn(chatPanelOpen ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-surface-sunken, #F7F8F9)')}>
          Chat
        </button>
        <button type="button" data-huddle-btn onClick={leave} title="Leave huddle"
          style={{ ...ctrlBtn('var(--ds-background-danger-bold, #C9372C)'), color: '#FFFFFF' }}>
          Leave
        </button>
      </div>
```
Add the helper next to `winBtn`:
```tsx
function ctrlBtn(bg: string): React.CSSProperties {
  return {
    height: 40, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
    background: bg, color: 'var(--ds-text, #172B4D)',
  };
}
```

- [ ] **Step 3: Lint + full manual acceptance**

Run: `npx eslint src/components/layout/HuddleWindow.tsx`
Manual (DOM/behavior proof, two clients):
- Mute toggles the mic (peer stops hearing) and the button state flips.
- Share screen starts/stops; button disabled while the peer shares.
- Chat toggles the thread panel; sending posts to the thread.
- Leave ends the call, window closes, FAB disappears, and exactly one "🎧 A huddle happened — …1m" row appears in the `/chat` thread.
Screenshots for `10_SCREENSHOT_CHECKLIST.md`.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/HuddleWindow.tsx
git commit -m "feat(huddle): window control bar — mute/share/chat/leave"
```

---

### Task 10: Retire `HuddleScreenView` + final cleanup

**Files:**
- Delete: `src/components/layout/HuddleScreenView.tsx` (and its test if one exists)
- Modify: any remaining importers of `HuddleScreenView` / `screenWindow` restore chip in `HuddleFab.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no dead component; the FAB's old "restore shared screen" chip (which referenced `screenWindow`/`setScreenWindow`) removed, since screen share now lives in `HuddleWindow`.

- [ ] **Step 1: Confirm no remaining references**

Run:
```bash
grep -rn "HuddleScreenView" src
```
Expected: only the file itself (the `CatalystShell` import/mount was replaced in Task 6).

- [ ] **Step 2: Remove the FAB screen-restore chip**

In `src/components/layout/HuddleFab.tsx`, remove the `screenMinimized` restore chip block (the `{screenMinimized && (…)}` JSX, ~line 286-296) and the now-unused `screenWindow`/`setScreenWindow`/`screenMinimized`/`screenActive` locals (lines 37-38, 55-56). The FAB no longer manages the screen window. Keep mute/screen-share/leave actions.

(Screen-share toggle from the FAB still calls `startScreen`/`stopScreen` — keep `screenShareBtn`. It just no longer pops a separate window; the share renders in `HuddleWindow` when restored.)

- [ ] **Step 3: Delete the dead component**

```bash
git rm src/components/layout/HuddleScreenView.tsx
```
If `grep -rn "HuddleScreenView" src` from Step 1 showed a test file, `git rm` it too.

- [ ] **Step 4: Lint + run the huddle suite + smoke**

Run: `npx eslint src/components/layout/HuddleFab.tsx`
Run: `npx vitest run src/store/huddleStore.test.ts`
Expected: clean; PASS.

Manual: start a huddle, minimize to FAB, start screen share from the FAB, restore the window → the share shows inside the window. No separate screen window appears anywhere. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add -u src/components/layout/HuddleFab.tsx
git commit -m "refactor(huddle): retire standalone HuddleScreenView; screen lives in HuddleWindow"
```

---

## Self-Review

**Spec coverage:**
- Large draggable+resizable window → Task 6. ✓
- Minimize → FAB → Task 6 (FAB gated to `minimized`). ✓
- Screen share inside window + annotations → Task 7. ✓
- Participant tile (avatar, no camera) → Task 7. ✓
- Thread panel: empty intro → session-only messages → Task 8. ✓
- Messages persist to conversation thread → Task 8 (`useMessages.sendMessage`). ✓
- Control bar Mute/Screen/Chat/Leave → Task 9. ✓
- Schema `event_type`/`event_meta` → Task 1. ✓
- "A huddle happened" event row, one per huddle, with duration → Tasks 4 (insert+idempotent), 5 (render), 3 (duration). ✓
- Read-path plumbing → Task 2. ✓
- Non-scope (no camera/multi-party/add-people/reactions) → honored; control bar excludes them. ✓
- Retire standalone screen window → Task 10. ✓

**Placeholder scan:** No TBD/TODO. The two "if Composer needs more props / if a test file exists" notes are conditional verification steps with explicit fallbacks, not deferred work.

**Type consistency:** `windowState` literal `'open'|'minimized'|'maximized'` consistent across store (Task 4), window (Task 6), FAB (Task 6). `eventType`/`eventMeta` consistent across type (Task 2), store insert keys `event_type`/`event_meta` (Task 4, DB columns), row reader (Task 5). `formatHuddleDuration(seconds)` defined Task 3, consumed Task 5. `sendMessage(md)` signature matches `useMessages` (Task 8).

## Execution Handoff
