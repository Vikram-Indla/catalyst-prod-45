# HANDOVER — Dock conversation pane is layout-broken at dock width

**Date:** 2026-06-19 · **Branch:** `main` · **Status:** diagnosed, NOT yet fixed.

## Surface
The in-dock conversation view (`DockConversationPane`) — opened by clicking a row in the CATY dock directory. Route to repro: open app → click CATY FAB (bottom-right) → click any conversation row (e.g. a DM or "IP Implementation").

## Symptom (the "10000 cuts")
At the ~360–460px dock width everything collapses:
- `MessageStream` hover-action toolbar renders **vertically** (column) instead of a horizontal overlay row.
- `MessageComposer` formatting toolbar **wraps** onto multiple lines.
- `ConversationHeader` action row (people / mute / bell / ⋯) cramps.
- Message avatar is clipped; author name + timestamp jam together ("Vikram Indla11:24 AM" — no gap).
- A stray `# IP Implem… ✕` channel chip renders at the bottom.

## Root cause (ONE structural cause, not 40 bugs)
`src/components/chat/dock/DockConversationPane.tsx` (lines 12–15) mounts the **full-page** chat components and relies on CSS to "compact them to dock dimensions" (its own line-7 comment):
```
import { ConversationHeader } from '@/components/chat/main/ConversationHeader';
import { MessageStream }      from '@/components/chat/main/MessageStream';
import { MessageComposer }    from '@/components/chat/main/MessageComposer';
import { ThreadPanel }        from '@/components/chat/main/ThreadPanel';
```
These were built for a wide column. The dock-width compaction CSS in `src/components/chat/chat.css` (41.7KB) is missing/insufficient, so every `flex-direction: row` child with `min-width` overflows and wraps/stacks. Root container class: `.cc-conv-pane` (`DockConversationPane.tsx:34`).

## Fix plan (execute in a fresh window with full budget)

### Step 1 — probe the exact collapsing rules (live, MANDATORY first)
Open the dock conversation pane in Chrome and `getComputedStyle`-probe:
- the hover-action toolbar container → confirm `flex-direction` (expected bug: `column`, or a too-narrow parent forcing wrap). Source: `src/components/chat/main/MessageStream.tsx` (hover actions ~620-705) + `MessageActionsToolbar.tsx`.
- the composer toolbar wrapper → `src/components/chat/main/MessageComposer.tsx` (wraps `RichTextEditor`).
- `.cc-conv-pane` width and the header action row.
Dock-open gotcha: the FAB toggles; if a click closes it, click the FAB again. Use `find` for the conversation row ref then `computer.left_click` by ref.

### Step 2 — structural fix (CSS scope, smallest diff)
Scope `.cc-conv-pane` descendants in `chat.css` so they render compact-but-horizontal:
- Force the message hover-action toolbar to `position: absolute; flex-direction: row` overlay (not inline column).
- Composer toolbar: keep one row; collapse formatting (B/I/U/lists) behind the existing `Aa` toggle instead of showing all inline.
- Header: single row, `min-width: 0` + `overflow: hidden` on the title, icon row `flex: none`.
- Message row: `gap: 8px` between avatar/name/time; avatar `flex: 0 0 auto`.

### Step 3 — canonical-component swaps (Vikram's explicit ask: reuse-first, ADS)
Where hand-rolled bits exist in these dock-mounted components, replace with canonical:
- Message ⋯ menu + hover actions → `@atlaskit/dropdown-menu` + `@atlaskit/button` IconButton (NOT hand-rolled icon stacks). CLAUDE.md 2026-05-10 rule.
- Message avatar → `@atlaskit/avatar` (via the repo's `AtlaskitAvatar` wrapper) — never external `<img>` (CLAUDE.md §19; G6 already enforced in chat-v2 this session).
- Any status lozenge in the header → `CatalystStatusPill` (exact Jira hex), not a `<span>`.
- Reactions → existing `ReactionPicker` / `@atlaskit` patterns.
- The ticket-summary pill (`DockConversationPane.tsx:51-81`) is hand-rolled inline styles → consider `@atlaskit/section-message` or the `AIIntelligenceButton`/`CatyRainbowCTA` for the AI CTA.
- Stray `# channel ✕` chip at the bottom — find its source (likely a composer recipient/target chip leaking in) and remove for non-DM conversations.

### Step 4 — verify (NO blind changes)
- Type-check with the REAL command: `npx tsc --noEmit -p tsconfig.app.json` (plain `npx tsc --noEmit` is a NO-OP — root tsconfig has `files: []`). Baseline ≈157 pre-existing errors; confirm your touched files add none.
- DOM-probe the fixed pane: hover toolbar `flex-direction: row`, composer single row, no wrap. Screenshot before/after.
- `vitest` is broken on Node 20 here — do not rely on it; verify via DOM/tsc.

### Step 5 — commit discipline
- Work on `main` (CLAUDE.md default). Stage ONLY touched files by explicit path — NEVER `git add -A` (the tree carries unrelated stale changes).
- Small commits, one logical change each. End messages with the Co-Authored-By line.

## Context — work already shipped this session (8 commits, chat avatars/icons)
1. `331b7c8` strip banned `?? 'Task'` JiraIssueTypeIcon fallbacks
2. `dd804cc` AtlaskitAvatar `shape` prop (square projects)
3. `8db2efd` PresenceAvatar stops external avatar URLs (G6)
4. `01bcc24` 3 standalone external `<img>` sites (G6)
5. `88b2e37` chat-v2 ConversationRow → ProjectIcon / JiraIssueTypeIcon / face avatar
6. `08d205d` remove dead `src` prop from PresenceAvatar + callers
7. `3c9ad73` dock group-DM stacked member avatars (DmStackAvatar)
(the 8th is this handover doc commit, if committed)

## Key files
- `src/components/chat/dock/DockConversationPane.tsx` — the broken pane shell
- `src/components/chat/chat.css` — compaction CSS (root of the breakage)
- `src/components/chat/main/MessageStream.tsx` · `MessageActionsToolbar.tsx` — hover actions
- `src/components/chat/main/MessageComposer.tsx` — composer toolbar
- `src/components/chat/main/ConversationHeader.tsx` — header action row
- Canonical refs: `AtlaskitAvatar.tsx`, `@/components/shared/ProjectIcon`, `CatalystStatusPill`, `@/lib/jira-issue-type-icons`
