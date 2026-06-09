# Catalyst Chat — P0/P1/P2 Feature Map (Slack Reference Architecture)

> Deep research completed 2026-06-08. Source: Slack UI analysis, Slack Engineering blog, Slack Help Center, Slack Developer Docs.

---

## 1. MESSAGING CORE

### 1.1 Message Composition — Rich Text Editor

**Slack reference:** Bottom-of-view composer, single-line expanding vertically. Formatting toolbar: **Bold** (Cmd+B), *Italic* (Cmd+I), ~~Strikethrough~~ (Cmd+Shift+X), `Code` (Cmd+E), Code block, Blockquote, Ordered/Bulleted lists, Link (Cmd+Shift+U). "+" button left of input opens action menu (file upload, audio/video clip). Right side: emoji picker, @mention trigger, send button. Mentions use @ fuzzy autocomplete; channels use #. Emoji picker: categories, search, skin tone selector, frequently used row. File: drag-drop (up to 10), clipboard paste (Cmd+V), + menu picker. Each attachment gets preview card with optional description before send.

| Sub-feature | Priority |
|---|---|
| Plain text input + send | **P0** |
| Bold, italic, strikethrough, code inline | **P0** |
| Code blocks (fenced) | **P0** |
| Bulleted + ordered lists | **P0** |
| @mention autocomplete (users) | **P0** |
| Emoji picker (categories, search, frequently used) | **P0** |
| #channel link autocomplete | **P1** |
| Link insertion (Cmd+Shift+U) | **P1** |
| Blockquote | **P1** |
| File upload (drag-drop, paste, picker) | **P0** |
| File preview card before send | **P1** |
| Tables in messages | **P2** |
| Syntax-highlighted code blocks | **P2** |
| Voice/video clips | **P2** |
| Markup mode toggle | **P2** |

### 1.2 Message Types

**Slack reference:**
- **Regular**: avatar (36px circle, left), display name + timestamp (bold 15px name, subtle 12px time), body below. Hover reveals floating action toolbar (top-right): react, reply, forward, bookmark, more (three-dot).
- **Threaded reply**: parent shows "N replies" link with stacked avatars + "Last reply X ago".
- **Edited**: "(edited)" in subtle grey after body. Edit history via three-dot menu (paid plans).
- **Deleted**: removed from flow for others; "This message was deleted." placeholder for deleter.
- **Forwarded**: quoted embed card with original author avatar/name/channel/timestamp + forwarding user's comment.
- **System/bot**: app icon, "APP"/"BOT" badge, sometimes grey background.

| Sub-feature | Priority |
|---|---|
| Regular messages (avatar + name + timestamp + body) | **P0** |
| Threaded replies ("N replies" indicator) | **P0** |
| Edited indicator "(edited)" | **P0** |
| Deleted message handling (remove from flow) | **P0** |
| Forwarded message embed card | **P1** |
| System/bot messages with badge | **P1** |
| Ephemeral messages (only visible to you) | **P2** |

### 1.3 Message States

**Slack reference:** Optimistic UI — message appears instantly. No "sent" checkmark. Failed: red warning icon + "Not delivered" + "Retry" link. No per-message read receipts for channels. DMs on paid plans: "Seen by" below last message.

| Sub-feature | Priority |
|---|---|
| Optimistic send (instant local render) | **P0** |
| Failed state with retry | **P0** |
| Typing indicator ("X is typing...") | **P1** |
| "Seen by" for DMs | **P2** |

### 1.4 Real-Time Delivery

**Slack reference:** Persistent WebSocket to Gateway Servers. Channel Servers (stateful, in-memory) hold history + fan out. Presence Servers track online/away. Messages delivered globally in <500ms. Auto-reconnect with catch-up fetch on disconnect. Mobile: APNs/FCM push when WebSocket inactive.

**Catalyst mapping:** Supabase Realtime provides WebSocket channels (Postgres changes, broadcast, presence) — maps directly to Slack's GS/CS model.

| Sub-feature | Priority |
|---|---|
| Persistent WebSocket connection (Supabase Realtime) | **P0** |
| Sub-second message delivery | **P0** |
| Auto-reconnect with catch-up | **P0** |
| Push notifications (mobile/desktop) | **P1** |
| Lazy presence subscription (only visible users) | **P1** |

### 1.5 Message Actions

**Slack reference:** Hover toolbar (top-right): emoji react (smiley), reply in thread (speech bubble), forward (arrow), bookmark (flag), more (three-dot). Three-dot menu: Copy link, Copy text, Pin, Edit (own), Delete (own), Remind me (20min/1h/3h/tomorrow/next week/custom), Mark unread. Keyboard: E=edit, R=react, T=thread, P=pin, S=share, A=bookmark, M=remind, F=forward.

| Sub-feature | Priority |
|---|---|
| Hover toolbar (react, reply, forward, bookmark, more) | **P0** |
| Edit own message | **P0** |
| Delete own message | **P0** |
| Reply in thread | **P0** |
| Emoji reaction | **P0** |
| Pin to channel | **P1** |
| Bookmark/save message | **P1** |
| Copy link to message | **P1** |
| Forward message | **P1** |
| Mark as unread from here | **P1** |
| Keyboard shortcuts for all actions | **P1** |
| Remind me (20min/1h/3h/tomorrow/next week/custom) | **P2** |

---

## 2. CONVERSATIONS

### 2.1 Conversation Types

| Sub-feature | Priority |
|---|---|
| DM (1:1) | **P0** |
| Group DM (up to 9) | **P0** |
| Public channels (# prefix, discoverable, anyone can join) | **P0** |
| Private channels (lock icon, invite-only) | **P0** |
| Shared/cross-org channels | **P2** |

### 2.2 Channel Creation Flow

**Slack reference:** Modal: Name (auto-slug, lowercase, hyphens), Visibility toggle ("Make private" — can't change later), Description (optional), Add members (user search + chips), Create button.

| Sub-feature | Priority |
|---|---|
| Name + auto-slug validation | **P0** |
| Public/private toggle | **P0** |
| Description field | **P0** |
| Add members during creation | **P0** |
| Channel templates | **P2** |

### 2.3 Channel Settings

**Slack reference:** Click channel name → right-side details panel. About section (name, topic, description, created). Tabs bar (Messages, Pins, Bookmarks, Files, Canvases). Members list (searchable, presence, role badges). Per-channel notification override (Every message / Mentions / Nothing / Mute). Pinned items via Pins tab. Bookmarks bar (links/files in header, folders as tabs).

| Sub-feature | Priority |
|---|---|
| Channel name, topic, description (editable) | **P0** |
| Members list with search | **P0** |
| Per-channel notification override | **P1** |
| Pinned items tab | **P1** |
| Bookmarks bar / folders as tabs | **P2** |
| Integrations/apps list | **P2** |
| Tabs (drag-reorder, manager-controlled) | **P2** |

### 2.4 Conversation List (Sidebar)

**Slack reference:** ~260px sidebar. Top: workspace name, compose button. Navigation: Home, DMs, Activity, Later. Collapsible sections (Starred, Channels, DMs). Unread: bold name + white dot. @mention: red badge with count. Muted: grey italic, no badge. Custom sections: user-created, drag channels between them. Per-section sort (alpha, recent, priority).

| Sub-feature | Priority |
|---|---|
| Channel list with unread bold styling | **P0** |
| @mention red badge count | **P0** |
| DM list with presence dots | **P0** |
| Collapsible sections (Channels, DMs) | **P0** |
| Custom sidebar sections | **P1** |
| Per-section sort (alpha, recent, priority) | **P1** |
| Mute channel (grey, no badge) | **P1** |
| "Show only unread" per section | **P2** |
| Drag-reorder channels between sections | **P2** |

---

## 3. THREADS

### 3.1 Thread Model

**Slack reference:** Any message becomes thread parent. Replies are flat (no nesting). Channel shows collapsed indicator: stacked avatars (up to 3) + "N replies" + "Last reply X ago". Parent body stays visible. Replies hidden from channel by default. **"Also send to #channel"** checkbox per reply. Thread participants tracked for notifications.

| Sub-feature | Priority |
|---|---|
| Reply to any message (creates thread) | **P0** |
| Flat reply model (no nesting) | **P0** |
| Collapsed thread indicator (avatars + "N replies") | **P0** |
| "Also send to channel" checkbox | **P0** |
| Thread participant tracking + notifications | **P1** |

### 3.2 Thread Panel

**Slack reference:** Right-side panel (~400px), pushes channel list left. Header: channel name. Full parent message, divider "N replies", chronological replies. Composer at bottom with formatting + "Also send to #channel". Close: Escape or X. One thread panel at a time. "Threads" view: all participating threads across all channels, sorted by recent activity.

| Sub-feature | Priority |
|---|---|
| Right-side panel for thread view | **P0** |
| Full parent message + chronological replies | **P0** |
| Thread composer with formatting | **P0** |
| Close with Escape, X button | **P0** |
| "Threads" aggregated view (all channels) | **P1** |

---

## 4. PRESENCE & STATUS

### 4.1 Presence Indicators

**Slack reference:** Dot on avatar (bottom-right, 10px):
- **Active**: solid green. Auto-set on interaction.
- **Away**: hollow grey circle. Auto after ~10min inactivity. Manual set.
- **DND**: green circle with "Z". Suppresses all notifications.
- **Offline**: no dot.

Displayed in: sidebar DMs, member list, message author, profile card, @mention autocomplete.

| Sub-feature | Priority |
|---|---|
| Active (green dot, auto-set) | **P0** |
| Away (hollow dot, auto after inactivity) | **P0** |
| Offline (no dot) | **P0** |
| Presence dots on avatars across all surfaces | **P0** |
| DND mode (suppress notifications) | **P1** |

### 4.2 Custom Status

**Slack reference:** Avatar click → "Update your status". Popover: emoji picker + text (100 chars) + duration dropdown (Don't clear / 30min / 1h / 4h / Today / This week / custom). Preset statuses (In a meeting, Commuting, Out sick, Vacationing, Working remotely). Status shown next to name everywhere.

| Sub-feature | Priority |
|---|---|
| Custom status (emoji + text + duration) | **P1** |
| Auto-clear on expiry | **P1** |
| Status visible on profile + sidebar + messages | **P1** |
| Preset statuses | **P2** |

### 4.3 Timezone

| Sub-feature | Priority |
|---|---|
| Local time on profile card | **P2** |
| Timezone in user preferences | **P2** |

---

## 5. NOTIFICATIONS

### 5.1 Unread Counts

| Sub-feature | Priority |
|---|---|
| Bold channel name for unread | **P0** |
| Red @mention badge with count | **P0** |
| DM unread conversation count | **P0** |
| Global app badge (total mentions) | **P1** |
| Muted channel suppression | **P1** |

### 5.2 Notification Preferences

**Slack reference:** Global: All messages / Mentions & keywords (default) / Nothing. Keywords: comma-separated trigger words. Sound + banner toggles. Schedule: allow-notifications time window (auto-DND outside). Per-channel override: Every message / Mentions / Nothing / Mute. Thread reply notifications toggle. Mobile push: always / only when inactive on desktop.

| Sub-feature | Priority |
|---|---|
| Global notification level (all/mentions/nothing) | **P0** |
| Per-channel notification override | **P1** |
| DND schedule (time window) | **P1** |
| Thread reply notifications toggle | **P1** |
| Desktop banner + sound toggles | **P1** |
| Mobile push settings | **P1** |
| Keyword notifications | **P2** |

---

## 6. SEARCH

### 6.1 Message Search

**Slack reference:** Cmd+G or top search bar. Autocomplete: matching people (@), channels (#), recent searches. Filter modifiers: `from:@user`, `in:#channel`, `before:date`, `after:date`, `has:reaction/pin/link/star`, `is:thread`. Results: channel + timestamp header, author avatar + name, snippet with highlighted terms, context (one message before/after). Click jumps to message.

| Sub-feature | Priority |
|---|---|
| Full-text message search | **P0** |
| Result snippets with highlight + jump-to | **P0** |
| `from:` filter | **P1** |
| `in:` filter | **P1** |
| `before:` / `after:` date filters | **P1** |
| Autocomplete for @users and #channels in search | **P1** |
| `has:` content filters (link, pin, reaction) | **P2** |

---

## 7. FILE SHARING

### 7.1 Upload

| Sub-feature | Priority |
|---|---|
| Drag-drop upload | **P0** |
| Clipboard paste (images) | **P0** |
| File picker (+ menu) | **P0** |
| Multi-file upload (up to 10) | **P1** |
| Preview card before send | **P1** |
| Description field per file | **P2** |

### 7.2 Preview

| Sub-feature | Priority |
|---|---|
| Inline image rendering + lightbox | **P0** |
| Document card (icon + name + download) | **P0** |
| PDF preview card | **P1** |
| Code snippet with syntax highlighting | **P2** |
| Video inline player | **P2** |

### 7.3 Management

| Sub-feature | Priority |
|---|---|
| Per-channel Files tab | **P1** |
| Download from file list | **P1** |
| Global file search | **P2** |

---

## 8. REACTIONS

### 8.1 Emoji Reactions

**Slack reference:** Hover → smiley icon (or R key). Full picker: categories, search, frequently used row, skin tone selector. Custom workspace emojis section. One-click default reactions (admin-configured, up to 3 in toolbar).

### 8.2 Display

**Slack reference:** Chips below message: emoji + count. Same emoji = one chip with incremented count. Hover tooltip: list of users who reacted. Click chip: toggle own reaction. "+" at end to add new. Own reaction: blue highlight border.

| Sub-feature | Priority |
|---|---|
| Add reaction via picker | **P0** |
| Reaction chips with count below message | **P0** |
| Tooltip showing who reacted | **P0** |
| Toggle own reaction by clicking chip | **P0** |
| Frequently used emojis | **P1** |
| Skin tone preference (persistent) | **P1** |
| Custom workspace emojis | **P2** |
| One-click default reactions (admin-configured) | **P2** |

---

## 9. INTEGRATIONS (Reference — Not Day-1)

**Slack reference:** Slash commands (`/command [args]` → HTTP POST), Bots (programmatic users with APP badge), Incoming webhooks (JSON → channel message), Events API (event push to server), Block Kit (interactive UI components in messages), App Home (dedicated app tab).

**Catalyst mapping:** Webhook URL per channel for Jira updates, CI/CD, deployments. Slash commands (`/jira`, `/caty`) P1. Full Block Kit equivalent P2+.

| Sub-feature | Priority |
|---|---|
| Incoming webhooks (post to channels) | **P1** |
| Slash commands (user-triggered) | **P1** |
| Bot users (post as app identity) | **P2** |
| Events API (outbound event subscription) | **P2** |
| Interactive message components (buttons, selects) | **P2** |

---

## 10. ACCESSIBILITY

**Slack reference:** F6 cycles focus between regions (sidebar, messages, composer, thread, header). Tab within regions. Arrow keys navigate messages/sidebar. Cmd+K quick switcher. Alt+Up/Down unread channel nav. ARIA live regions for new messages. VoiceOver/NVDA/JAWS support. Simplified Layout Mode (reduced visual complexity).

| Sub-feature | Priority |
|---|---|
| F6 landmark navigation | **P0** |
| Tab within regions | **P0** |
| Arrow key message navigation | **P0** |
| Cmd+K quick switcher | **P0** |
| Escape to close panels/modals | **P0** |
| ARIA live regions for new messages | **P0** |
| Alt+Up/Down unread channel nav | **P1** |
| Screen reader support (VoiceOver, NVDA) | **P1** |
| Simplified layout mode | **P2** |

---

## SUMMARY

| Priority | Count | Description |
|---|---|---|
| **P0** | ~42 | Minimum viable chat — send messages, conversations, presence, search, react, keyboard nav |
| **P1** | ~35 | Expected within first month — threads aggregation, forwarding, notifications, files, status, per-channel overrides |
| **P2** | ~25 | Competitive parity — voice clips, syntax highlighting, shared channels, templates, Block Kit |

---

## RECOMMENDED BUILD ORDER

### Phase 1 — P0 Core (Launch Blocker)
1. Conversation model (DMs, Group DMs, Public channels, Private channels)
2. Message composition (rich text: bold/italic/code/lists/mentions/emoji)
3. Real-time delivery via Supabase Realtime WebSocket
4. Message list rendering (avatar + name + timestamp + body)
5. Message actions (edit, delete, reply in thread, react)
6. Thread model (parent + replies, "also send to channel", right-side panel)
7. Sidebar conversation list with unread indicators
8. Presence (active/away/offline dots)
9. Full-text search with result jump-to
10. File upload (drag-drop, paste, picker) + inline image preview
11. Emoji reactions (picker, chips with count, toggle)
12. Keyboard navigation (F6 regions, Tab, arrow keys, Cmd+K switcher)

### Phase 2 — P1 (First Month)
13. Typing indicators
14. Forwarded messages
15. Pin/bookmark messages
16. Per-channel notification overrides
17. Custom status (emoji + text + duration)
18. DND mode
19. Search filters (from:, in:, before:, after:)
20. Per-channel Files tab
21. Desktop/push notifications
22. Threads aggregated view
23. Custom sidebar sections
24. Mute channel

### Phase 3 — P2 (Competitive Parity)
25. Voice/video clips
26. Channel templates
27. Slash commands + webhooks
28. Syntax-highlighted code blocks
29. Read receipts for DMs
30. Simplified accessibility mode
