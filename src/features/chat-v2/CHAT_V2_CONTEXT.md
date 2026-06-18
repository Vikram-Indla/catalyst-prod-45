# Chat v2 — Session Context Doc

Last updated: 2026-06-18.

This file is the single source of truth for continuing the Chat v2 build across context resets.
Read this FIRST before making any change in `src/features/chat-v2/`.

---

## 1. What this is

A Slack-look chat surface mounted at `/chat`, living side-by-side with the existing chat-v1.
Lives in `src/features/chat-v2/`. Mounted by `src/pages/chat/ChatPage.tsx` → `<ChatV2Shell />`.

### Stack / scope override
- shadcn/ui + Tailwind (CLAUDE.md ADS-only P0 is **explicitly waived** for this surface — Slack-look visual parity).
- Fonts stay ADS-locked: `var(--ds-font-family-body)` only.
- Reuses existing chat backend hooks under `src/hooks/chat/` (27 hooks, `chat_conversations` / `chat_messages` tables, RLS via `chat_is_member()`).
- Both light AND dark themes mandatory.

### Layout
4-column CSS Grid in `ChatV2Shell`:
- Closed thread: `'rail sidebar panel'` → `var(--cv2-rail-w) var(--cv2-sidebar-w) 1fr`
- Open thread:   `'rail sidebar panel thread'` → `... 1fr minmax(360px, 420px)`

---

## 2. File map

```
src/features/chat-v2/
├── ChatV2Shell.tsx                  # entry; mounts ChatRealtimeProvider + grid; owns sidebar+activity resize state
├── tokens.css                       # CSS custom properties (single import point)
├── CHAT_V2_CONTEXT.md               # ← this file
├── hooks/
│   ├── useChatTheme.ts              # localStorage-backed light/dark toggle
│   ├── useResizableSplit.ts         # drag-resize state + global mousemove/mouseup wiring
│   ├── useActivityFeed.ts           # merges DM unreads + @mentions + thread replies
│   ├── useStagedAttachments.ts      # upload-on-drop staging tied to conversation
│   └── useMessageAttachments.ts     # batched signed URLs per message
├── lib/
│   ├── formatTimestamp.ts           # formatMessageTime, formatRowTimestamp, formatActivityTime, dayKey, formatDateSeparator
│   ├── markdown.ts                  # renderMarkdownInline(md) + htmlToMarkdown(html)
│   └── emojiShortcodes.ts           # :smile: → 😄 (incl. +1 / :) / <3 aliases)
├── components/
│   ├── EmptyPanel.tsx
│   ├── shared/
│   │   ├── Icon.tsx                 # all SVG icons (Activity adds: Gear, Filter, ReplyArrow, ViewDense/Detailed, ThreadIn, Square, Mention, Huddle)
│   │   ├── PresenceAvatar.tsx
│   │   ├── IconButton.tsx
│   │   └── ActionTooltip.tsx
│   ├── WorkspaceRail/               # left 70px nav
│   ├── Sidebar/                     # conversation list (now resizable, default 280px, min 240px)
│   ├── MessagePanel/                # full message surface (now also accepts initialJumpMessageId)
│   ├── Composer/
│   ├── EmojiPicker/
│   ├── Schedule/                    # full schedule-send modal + send menu (helpers reused by Reminder modal)
│   ├── Forward/
│   ├── JumpToDate/
│   ├── CreateChannel/               # 2-step channel creation modal
│   ├── Attachments/                 # DropzoneOverlay, AttachmentList, ComposerAttachmentChip, UploadProgressBanner
│   ├── LinkPreviews/                # LinkPreviewList (chat_link_previews backed)
│   ├── Activity/                    # ← Round 10
│   │   ├── ActivityPanel.tsx        # header + tab/filter row + day-grouped list + reminder toast + menu wiring
│   │   ├── ActivityHeader.tsx       # title + tabs (All/DMs/Mentions/Threads/+) + filter row (Unreads chip, search, dense/detailed)
│   │   ├── ActivityRow.tsx          # owns hovered state + RightInfo swap (date ↔ inline icons + badge); 3 variants
│   │   ├── ActivityHoverStrip.tsx   # inline 3-icon group (Mark unread / Mark read / More)
│   │   ├── ActivityMoreMenu.tsx     # 3-dot menu (Edit/MarkUnread/Remind/TurnOffReplies/CopyLink/CopyMessage) — no Organize/ConnectApps/Delete
│   │   ├── RemindMeSubmenu.tsx      # In 20 min / 1 hr / 3 hrs / Tomorrow / Next week / Custom…
│   │   └── ReminderModal.tsx        # When + Time + Save (reuses Schedule's scheduleHelpers)
│   └── Thread/
│       └── ThreadPane.tsx           # right-pane thread view (mounted in both chat + activity layouts)
```

---

## 3. CSS Tokens — the rules

### Where they live: `src/features/chat-v2/tokens.css`

Token blocks apply on **both** scopes so portals inherit:
```css
.cv2-chat-shell, body[data-cv2-theme]            { /* dimensions, fonts, motion */ }
.cv2-chat-shell, .cv2-chat-shell[data-cv2-theme="dark"], body[data-cv2-theme="dark"]   { /* dark colors */ }
.cv2-chat-shell[data-cv2-theme="light"], body[data-cv2-theme="light"]                  { /* light colors */ }
```

### Why body[data-cv2-theme] matters

`createPortal(..., document.body)` mounts portaled content OUTSIDE `.cv2-chat-shell`.
Without the body-scoped token block, `var(--cv2-bg-modal)` resolves to nothing → transparent backgrounds → all popovers / modals / menus appear see-through. This bit us multiple times.

### Theme propagation

`ChatV2Inner` runs an effect: `document.body.dataset.cv2Theme = theme; return () => delete ...`
Toggle theme → body attribute updates → portals re-resolve their token values instantly.

### Key tokens
| Token | Purpose |
|---|---|
| `--cv2-bg-modal` | Solid background for portaled modals / popovers — MUST resolve to opaque |
| `--cv2-bg-overlay` | Backdrop dim layer (modals only) |
| `--cv2-bg-input` | Form field surface |
| `--cv2-shadow-modal` | Modal / popover drop shadow |
| `--cv2-saved-bg` / `--cv2-saved-fg` | "Saved for later" message tint + badge color |
| `--cv2-highlight-jump` | Yellow pulse for jump-to-date target (rgba 236,178,46) |
| `--cv2-warning` | `#ECB22E` — used for saved-bubble left accent + jump-pulse shadow |
| `--cv2-modal-z` / `--cv2-popover-z` / `--cv2-tooltip-z` | 1000 / 1100 / 1200 |

### Banned in this surface
- No hardcoded hex outside `tokens.css`. All colors go through `var(--cv2-*)`.
- Atlassian ADS rules are waived but **fonts** stay ADS (`var(--ds-font-family-body)`).
- Tailwind utility classes are allowed for layout only — no color utilities.

---

## 4. State of each feature (as of 2026-06-18)

| Feature | State | Notes |
|---|---|---|
| Light + dark theme | ✅ | localStorage; body attribute syncs portals |
| Conversation list | ✅ | uses existing `useConversations`; sidebar grouped Channels / Projects / DMs |
| Sidebar resize | ✅ | `useResizableSplit` (default 280px, min 240px, max `vw - 70 - 5 - 360`); applies to chat / DMs / Later / People |
| Activity panel resize | ✅ | always-on draggable splitter (default = min 360px, max `vw - 70 - 5`); never auto-shrinks on selection |
| Message list + grouping | ✅ | 5-min same-author window, dayKey separator |
| Message bubble + hover actions | ✅ | 5 icons: react / save / forward / reply / more |
| Inline timestamp gutter | ✅ | 24h `HH:MM`, nowrap, 44px column |
| Composer (rich text) | ✅ | contentEditable + `document.execCommand`, Cmd+B/I/U/K |
| Composer toolbar | ✅ | B I U S link ol ul |
| Composer footer | ✅ | Aa / 😀 / @ / send-with-schedule chevron |
| Emoji picker | ✅ | 240+ emojis, 9 sections, search; click via `onMouseDown` |
| Emoji shortcodes | ✅ | `:smile:` / `+1` / `:)` / `<3` → emoji via `lib/emojiShortcodes.ts` |
| Reactions | ✅ | `useMessages.toggleReaction` |
| Save for later | ✅ | persistent via `useToggleBookmark` |
| Forward modal | ✅ | multi-select chips, textarea comment, copy-link + send-with-schedule split |
| Forward persistence | ✅ | wires `startDm` for person targets + insert per recipient |
| Schedule send menu | ✅ | quick: Tomorrow/Monday at 9 AM + Custom time |
| Schedule modal | ✅ | calendar popover + 15-min time dropdown |
| Schedule send persistence | ✅ | inserts with `scheduled_for` + `created_at` = scheduledFor; pg_cron flips `delivered_at` |
| Jump to date menu | ✅ | Most recent / Beginning / Specific |
| Jump to date modal | ✅ | bordered grid (Slack-style), 2026-06-17 |
| Jump highlight pulse | ✅ | 2.4s yellow bg + left border via `cv2-msg-jump-highlight` |
| Thread pane | ✅ | 4th grid column, parent + replies + composer |
| Mention autocomplete | ✅ | `@` triggers `MentionPicker`; @here / @channel + members from `useConversationMembers` |
| Message ⋮ more menu | ✅ | Slack-style multi-group portal menu (`MessageMoreMenu`) |
| Edit message in place | ✅ | `MessageEditInPlace`; toolbar + Cancel/Save; wired to `useChatMessageActions.editMessage` |
| (edited) marker | ✅ | inline `(edited)` after body when `message.editedAt` set |
| Delete confirmation | ✅ | `DeleteMessageDialog` portal modal + 300ms slide-up animation |
| Pin / unpin | ✅ | Organize submenu; persisted via `useTogglePin`; row gets yellow left border + "Pinned by …" caption |
| Pins panel tab | ✅ | Header tabs (Messages / Pins(N)); empty state copy |
| File attachments | ✅ | drag-drop dropzone, paste, chip grid, real Supabase Storage backend (per-conv staging) |
| Link previews | ✅ | `chat_link_previews` cache + `chat-unfurl` edge fn; defensive fallback when migration not applied |
| Mark message unread | ✅ | sets `chat_conversation_members.last_read_at = msg.createdAt - 1ms` |
| Channel browse / create | ✅ | `CreateChannelModal` 2-step (name + privacy); sidebar `Add channels` action |
| Activity panel | ✅ | full Slack-look feed (see Round 10 below) |
| Activity reminders | ✅ | quick presets + Custom Reminder modal (toast confirms; no persistence yet) |

---

## 5. Known gotchas

### Portals + CSS variables
Every popover / menu / modal MUST render under either `.cv2-chat-shell` OR a `body[data-cv2-theme]` token scope. We chose body-scope.
If a future component shows a transparent background → check (a) is it portaled, (b) does `document.body.dataset.cv2Theme` exist, (c) does the token block include `body[data-cv2-theme]`.

### Emoji click attaching
EmojiPicker buttons use `onMouseDown` with `e.preventDefault(); e.stopPropagation()` to fire the pick BEFORE the document `mousedown` outside-click listener races. Do NOT change this back to `onClick` — the picker has an outside-click listener that can swallow the click before React fires it.

### Jump-to-date highlight
- `MessagePanel.handleJumpTo(id)` sets `jumpHighlightId`, then `requestAnimationFrame` → `document.querySelector([data-message-id=...])` → `scrollIntoView({block:'center'})`, then 2s timeout clear.
- The pulse uses `box-shadow: inset 3px 0 0 var(--cv2-warning)` + `background: var(--cv2-highlight-jump)`.
- Highlight token was raised to `rgba(236,178,46,0.22-0.28)` for visibility. Do NOT drop below those alpha values.
- If the highlight stops firing: check that `MessageBubble` still has `className={jumpHighlight ? 'cv2-msg-jump-highlight' : undefined}` AND `data-message-id={message.id}`.

### Saved-state bubble
MessageBubble adds `borderLeft: '3px solid transparent'` ALWAYS so the row width is consistent. When `isSaved`, it switches to `var(--cv2-warning)` + background `var(--cv2-saved-bg)`. Do NOT remove the transparent placeholder — without it the saved state shifts message text by 3px horizontally.

### Calendar grid in JumpToDateModal
Slack-style staircase grid (border only around the date region, not empty cells):
- Container: `display:grid; gridTemplateColumns:repeat(7,1fr); gap:0;` (NO container borders)
- Empty cells: plain `<div>` with `aspectRatio: 1/1` and NO borders.
- Date cells: always `borderRight + borderBottom: 1px solid var(--cv2-border)`.
  - PLUS `borderTop` ONLY when (row === 0) OR (cell directly above is empty).
  - PLUS `borderLeft` ONLY when (col === 0) OR (cell directly left is empty).
- Inner button is positioned `absolute; inset: 3; borderRadius: 50%` so today's blue ring is a circle inside the cell.
- Modal width: 360px. Cell fontSize: 13px. DO NOT widen — Slack reference is narrow.

### MessageBubble timestamp column
Avatar / gutter column is 44px (NOT 40px) to fit `HH:MM` in 24h without wrapping.

### Hover-on-mount bug (the "works after switching windows" issue)
Browsers (Chrome/Safari on macOS observed) do NOT recompute `:hover` when a new element
appears under a stationary cursor. They only fire `:hover` + `mouseenter` on actual cursor
*movement* across the element's boundary. After navigation (filter change, tab switch),
rows can mount with the cursor already over them and neither CSS `:hover` nor React
`onMouseEnter` will fire until the user nudges the mouse.

**The cure (used by `ActivityRow`):** install ALL of these on every hover-sensitive row:
1. `onMouseEnter` / `onPointerEnter` → `setHovered(true)` (standard entry)
2. `onMouseLeave` / `onPointerLeave` → `setHovered(false)` (standard exit)
3. `onMouseMove` → `setHovered(true)` (catches the case where mouseenter missed; React skips re-render when state is unchanged so the perf cost is zero)
4. `useEffect` document-level `pointermove` listener that checks `getBoundingClientRect()` against the cursor's `clientX/Y` (catches the case where cursor never moves after the row mounts under it)

Do NOT rely on CSS `:hover` alone for any newly-mounted hover-dependent UI. CSS `:hover` is
fine for elements that exist before the cursor enters, but it is unreliable for elements
that *appear* under a stationary cursor.

### Activity grid layout
Activity view uses `rail | activity ({activityWidth}px) | splitter (5px) | 1fr` always —
even when no item is selected (the 1fr area is just empty panel-bg). Splitter is always
mounted and draggable; switching to `activityMode = false` swaps the handler to the sidebar
resize hook but keeps the same `<ActivitySplitter>` component mounted. Both `activityWidth`
and `sidebarWidth` are clamped down on window resize.

### Activity row + inline action strip
- The hover strip is **rendered inline** in the row's right-info slot, swapping with the date when hovered. NOT absolute-positioned. This was redone after multiple absolute-positioning attempts proved unreliable for hover detection + caused overlap with the unread badge.
- The unread `1` badge stays inline at the far right regardless of hover state.
- `showActions = hovered || isMenuOpen`. ActivityPanel passes `isMenuOpen={moreAnchor?.item.id === item.id}` so the strip stays visible while the portaled three-dot menu is open even when the cursor moves off the row onto the menu.
- The three-dot menu deliberately excludes: `Organize`, `Connect to apps`, `Delete` (per spec — image #160 / #172 / #175).

### Dense view grouping
Dense mode wraps each day's rows in a rounded container with `overflow: hidden` + a single
outer border. Inter-row dividers live on the row itself as `border-bottom` (suppressed on
the last row via the `isLastInGroup` prop) — NOT inside the container as separator
elements. Selected dense row uses `box-shadow: inset 0 0 0 2px var(--cv2-accent)` so the
accent ring doesn't push siblings around.

---

## 6. User feedback iteration log

### Round 1 (delivered)
Build the basic chat clone. 16 issues identified, all fixed.

### Round 2 (delivered)
Visual + behavioral fixes: composer rich text, 5-action hover toolbar, emoji picker, schedule, forward, save, jump-to-date, thread pane.

### Round 3 (delivered 2026-06-17)
- Popovers transparent → fixed via `body[data-cv2-theme]` token propagation.
- Emoji click not attaching → fixed via `onMouseDown + preventDefault + stopPropagation`.
- Saved message had no bg tint → added `var(--cv2-saved-bg)` + yellow left border.
- Forward dialog Composer was confusing → swapped to plain `<textarea>`.

### Round 4 (delivered 2026-06-17 — this round)
- Jump-to-date highlight invisible → stronger keyframe (yellow tint + 3px box-shadow), raised highlight token alpha to 0.22 / 0.28.
- Calendar didn't match Slack → rebuilt as bordered grid, widened modal to 440px.

### Round 5 (delivered 2026-06-17 — Batch A)
- Mention autocomplete (`@`) — `MentionPicker` + ComposerEditor caret-aware trigger detection.
- ⋮ more menu — `MessageMoreMenu` with Edit / Mark unread / Remind / Notif / Copy link / Copy message / Organize > / Connect / Delete.
- Inline edit — `MessageEditInPlace` mounts in place of body, Cancel + Save buttons.
- Delete confirmation — `DeleteMessageDialog` portal + `cv2-msg-remove` keyframe (300ms slide-up).
- Pin + Pins tab — pin via `useTogglePin`, `PinsPanel` tab listing pinned cards.

Wired hooks: `useChatMessageActions` (edit/delete/toggleReaction), `useConversationPins` + `useTogglePin`, `useConversationMembers` (for mention list AND pinned-by names).

### Round 6 (delivered 2026-06-17)
- Pinned banner — `PinnedBanner` now renders ABOVE the message list (Slack style); empty when no pins, shows latest pinned preview + count of additional pins. Removed per-bubble `PinnedIndicator` + left-border accent.
- Hover strip — stays visible while `MessageMoreMenu` is open (was hiding too eagerly): `visible={(hovered || moreOpen) && !pickerOpen && !editing}`.

### Round 7 (delivered 2026-06-17)
- Reverted Round 6 #1 — `PinnedBanner` removed; pinned styling lives ON the message bubble itself: warm yellow tint `rgba(236,178,46,0.08)` background + "📌 Pinned by you / by {name}" caption above the body (yellow icon, muted gray label). Matches Slack reference.
- `ActionTooltip` (`shared/ActionTooltip.tsx`) — portaled dark pill tooltip with optional keyboard-shortcut chip below the label; shown on every hover-toolbar button.
- `MessageHoverActions` rewritten — 32px buttons, 6px radius, shortcuts wired (`R` add reaction, `T` reply in thread, `F` forward, `A` save for later).

### Round 8 (delivered 2026-06-17)
- Bug: Pin/Unpin via Organize submenu silently no-op'd after the first pin. Root cause: `MessageMoreMenu` outside-click handler closed the parent menu when user clicked inside the `OrganizeSubmenu`, because the submenu is portaled to `document.body` (outside `menuRef`). The unmount cancelled the React onClick before it could fire.
- Fix: tag the submenu root with `data-cv2-submenu-of="message-more"` and have the parent's outside-click handler skip clicks inside it (`target.closest('[data-cv2-submenu-of="message-more"]')`).

**General rule for portal+submenu patterns**: when a child popover is portaled outside its parent menu, the parent's outside-click handler MUST recognise it as still part of the menu — by data-attribute traversal or shared ref — otherwise the child's onClick will race-lose to the parent's close.

### Round 9 (delivered 2026-06-17)
- PinsPanel hover affordance — each pinned card now shows a 5-button toolbar on hover (Find another reaction / Reply in thread / Forward / Save for later / More) anchored top-right inside the card, with blue accent border on hover. Card click still opens the message; clicks inside `[data-cv2-pin-actions]` are guarded to prevent jump-to.
- Action wiring — react opens EmojiPicker → toggleReaction; reply → openThread; forward → ForwardModal; save → toggleBookmark; more → MessageMoreMenu (full Edit / Delete / Pin / etc. menu).
- Bug: hover strip 👀 / ✅ / 🙌 quick-reaction icons were inert placeholders. Wired to `onToggleReaction(message.id, emoji)` so they now actually add/remove the corresponding reaction.

### Round 10 — Activity panel (delivered 2026-06-17 → 2026-06-18)

Slack-look Activity feed mounted on `activeView === 'activity'`.

**Built:**
- `useActivityFeed` hook — merges three sources into one chronological list:
  1. DM/channel unread heads (one latest non-mine message per conversation with `unreadCount > 0`)
  2. `@chat_mention` notifications addressed to me
  3. Thread replies in conversations I'm a member of (parent_id IS NOT NULL, not by me)
  - Batches `profiles` lookups for all author ids. Defensive on every fetch.
  - Returns `{ items, unreadCount, isLoading, countsByTab }` for tab badges.
- `ActivityPanel` — header + tab/filter row + day-grouped list + reminder toast + three-dot menu mount. Owns `moreAnchor` state (which item's menu is open). Day groups in dense mode wrapped in rounded container with internal dividers.
- `ActivityHeader` — `Activity` title + gear, tabs (`All` / `DMs` / `Mentions` / `Threads` / `+`) with purple count pills, filter row (scope select, Unreads chip, Filter, animated search expand, Detailed/Dense radio toggle).
- `ActivityRow` — 3 variants:
  - **Detailed** (panel < 760px): card with border, 2-line layout (name+subline+body)
  - **SingleLine** (detailed + panel ≥ 760px): name | badge | body | time on one row
  - **Dense**: inside a per-day rounded container, single-line row layout, divider between rows, no individual border-radius
  - All three share a `RightInfo` helper that swaps date ↔ inline action icons based on `showActions = hovered || isMenuOpen`
- `ActivityHoverStrip` — inline 3-icon group: Mark as unread / Mark as read / More. NOT absolute-positioned. Rendered inline by RightInfo when active.
- `ActivityMoreMenu` — Edit (if mine) / Mark unread / Remind me ▸ / Turn off replies / Copy link / Copy message. Excludes Organize / Connect to apps / Delete per spec.
- `RemindMeSubmenu` — In 20 min / 1 hr / 3 hrs / Tomorrow at 9 AM / Next week at Mon 9 AM / Custom…
- `ReminderModal` — full When + Time picker reusing `Schedule/scheduleHelpers`. Save returns ISO; ActivityPanel shows a transient toast (no persistence yet).
- `MessagePanel` extended with `initialJumpMessageId` prop — when set (and conversation messages are loaded), triggers `handleJumpTo()` to scroll-pulse the target. Used by activity item selection to highlight the source message.
- `ChatV2Shell` layout: in activity mode, grid is always `rail | activity ({activityWidth}px) | splitter (5px) | 1fr`. The 1fr area renders `MessagePanel` (DM/mention pick) or `ThreadPane` (thread pick) or stays empty. Selecting an activity item:
  - DM/mention → `setActiveConversationId + closeThread + setActivityJumpMessageId(target)` → pulse on the right
  - Thread → `setActiveConversationId + openThread(parentId)` → ThreadPane on the right
- Resizable splitter system — `useResizableSplit` hook + `ActivitySplitter` component (`gridArea: 'splitter'`, 5px wide with 3×36px grip handle centered, ±4px hit-target overflow, `col-resize` cursor, accent on hover/drag). Applies to BOTH activity-mode AND chat-mode (sidebar). Default activity = min 360px; default sidebar = 280px.

**Lessons from this round (already merged into Gotchas above):**
- The "works after switching windows" hover bug. CSS `:hover` is unreliable when elements first appear under a stationary cursor. Cure: stack `onMouseEnter` + `onMouseMove` + `onPointerEnter` + document-level `pointermove` probe.
- Don't auto-shrink the activity panel on item select. Causes visible jank; user explicitly asked for "stable click". Let user drag.
- Splitter must be ALWAYS present in activity mode (even with no selection) — user wants the panel draggable at all times.
- Default `activityWidth = min` (360px) per Vikram's explicit ask — gives the maximum room to drag rightward.
- Three-dot menu must EXCLUDE Organize / Connect to apps / Delete (image #160 + #172 spec).
- Dense view needs a wrapping container per day group with dividers; rows are NOT freestanding cards in dense mode.
- The action strip renders inline (swaps with date), NOT absolute-positioned. Multiple absolute-positioning attempts caused overlap with the unread badge and unreliable hover. Inline render is the canonical pattern.
- Activity icons: only 3 — Mark as unread, Mark as read, More. NOT the 9-icon message hover toolbar.
- `isMenuOpen` lock pattern: parent tracks which row's menu is open (`moreAnchor?.item.id === item.id`) and passes that flag down so the strip stays visible when the cursor moves off the row onto the portaled menu.

---

## 7. How to continue after a context reset

1. **Read this file end to end.** It is the only document needed.
2. `git -C ~/catalyst log --oneline -5` to see recent commits.
3. `git -C ~/catalyst status` to see uncommitted changes.
4. If the user asks for a visual change → DOM-probe first (CLAUDE.md 2026-06-07 lesson). Never code-then-test for visual bugs.
5. Run `npx tsc --noEmit` after any change. Exit 0 required.
6. Don't add backwards-compatibility shims. The surface ships v2-only.
7. Don't reach across the boundary into chat-v1 (`src/features/chat/`) except to re-use existing hooks under `src/hooks/chat/`.

---

## 8. Open items / not yet built

User-deferred (do NOT build unless explicitly asked):
- Slash command palette (`/`).
- Fenced code blocks (``` … ```) in composer.
- Mobile responsive layout (current breakpoints assume ≥1024px).
- Unread divider ("New messages" line in MessageList).
- Typing indicators.
- Read receipts / message status.

Batch C — settings & shell (next up):
- Notification preferences modal.
- Settings rail at bottom of WorkspaceRail.

Smaller polish backlog:
- "Connect to apps" + "Add to list…" submenus in MessageMoreMenu (currently TODO stubs in non-activity menu).
- Activity reminder persistence — currently the Reminder modal returns ISO and ActivityPanel shows a toast, but the reminder is NOT stored. Needs `reminders` table + cron + push.
- Activity "Turn off notifications for replies" — currently a TODO stub.
- Activity "share" / forward — currently no-op in activity context (no Forward modal yet wired from Activity).
- Activity feed source coverage — `useActivityFeed` does NOT currently include: reactions on my messages, message edits, channel joins. Add when product asks.

Pending Supabase deployments (migrations + functions still on disk, not yet applied):
- `supabase/migrations/20260617000000_chat_link_previews.sql`
- `supabase/migrations/20260617000100_chat_schedule_send.sql`
- `supabase/migrations/20260617000200_chat_create_channel_visibility.sql`
- `supabase/functions/chat-unfurl/` (edge function)

The runtime is defensive — every code path that touches an unapplied table/column falls
back to empty/null via session-level flags (`scheduleColumnsAvailable`, `linkPreviewBackendAvailable`).
Deploy these to unlock the matching features in prod.

---

## 9. Commit discipline

- Only stage explicit paths (`git add <path>`). NEVER `git add -A` — repo carries unrelated stale work (CLAUDE.md 2026-06-01 P0).
- Always `git status` before committing. If unrelated files are staged → STOP.
- Conventional commit messages: `feat(chat-v2): ...`, `fix(chat-v2): ...`, `chore(chat-v2): ...`.
