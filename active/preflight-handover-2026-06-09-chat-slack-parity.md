# Preflight Handover — Chat Slack-Parity Build — 2026-06-09

## Context

**Surface:** Chat workspace · Catalyst-native (no Jira equivalent)
**Tier:** High-stake (cross-cutting, 6+ surfaces, realtime + RLS + edge functions)
**Started:** Turn 1, 2026-06-09 ~09:00 UTC
**Session status:** PAUSED at Phase 3 plan synthesis (context 95%)
**Council:** NOT YET RUN (mandatory Phase 2 — required before Phase A code)
**PR:** Pending — Phase A commits will feed one PR per phase (7 PRs total)

---

## Committed This Session

- **Commit:** `9a2d13d6b` — `feat(chat): canonical sidebar + URL-driven state · remove IconRail/ConvList`
  - ChatSidebar (canonical SidebarBase wrapper, Projects section, ProjectIcon)
  - ChatMainView (URL-driven ?conv= ?rail=, removed IconRail + ConversationList)
  - workspaceContext 'chat' WorkspaceType + deriveWorkspaceType short-circuit
  - CatalystShell renders ChatSidebar for /chat routes

---

## Phase 0.5 — Jira Architect Scan (executed prior turn, summary)

```json
{
  "patterns_run": 28,
  "violations": [
    {
      "pattern_id": "A1",
      "name": "Hand-rolled avatars / icons",
      "severity": "P0",
      "halt": false,
      "evidence": "chat/main/avatar.tsx + 13 inline SVGs (MessageComposer, IconRail, etc.)",
      "action": "Phase D: replace with @atlaskit/avatar + @atlaskit/icon/glyph"
    },
    {
      "pattern_id": "A2",
      "name": "@atlaskit/popup empty-portal bug (v4.16)",
      "severity": "P1",
      "halt": false,
      "evidence": "WatchersChip pattern — use createPortal to document.body instead",
      "action": "Self-rolled popover pattern (L21) is canonical until upgrade"
    },
    {
      "pattern_id": "W3",
      "name": "RLS cascade — new tables need policies on children",
      "severity": "P1",
      "halt": false,
      "evidence": "chat_* tables will require RLS; any ADD must include child policies",
      "action": "Phase E (notifications, presence, bookmarks) — pre-emptive migration architecture"
    }
  ],
  "halt_required": false,
  "safe_to_proceed": true,
  "notes": "No blocking violations. P0 component reuse (Phase D) and P1 RLS (Phase E) are gated by their phase dependency, not pre-flight."
}
```

---

## Phase 1 Evidence (from prior audit turn — audit-turn-1)

### Lane A — Visual / Structural (Slack canonical reference)

**Slack workspace IA reference:**
- Left sidebar: 72px (collapsed) / 272px (expanded) — workspace nav + project/DM list
- Main pane: conversation list + stream + composer (always visible)
- Right pane: thread (inline when replying) or full-screen panels (mentions, bookmarks, people, search)
- Header: workspace name + channel name + "View members" + ⋯ menu
- Composer: rich text (@mentions, emoji, formatting, /slash, attachments, threading)
- Message: user avatar + name + timestamp + body + reactions + ⋯ (copy, reply, bookmark, delete)

**Catalyst inventory (25 chat files, 5939 LOC):**
- src/components/chat/{main, modals, utils}
- src/pages/chat/ChatPage.tsx (mounts ChatMainView)
- src/hooks/chat/{useConversations, useMessages, useThreads}
- 13 hand-rolled avatar/icon files (P0 reuse violation)
- IconRail (72px nav, 10 items hardcoded) + ConversationList (300px, renders channels/DMs) — REMOVED this turn
- MessageComposer (plain textarea, no formatting toolbar — OUT OF SCOPE vs Slack)

### Lane B — Schema / Data

**Supabase tables (project lmqwtldpfacrrlvdnmld):**
- `chat_conversations` (id, title, kind, is_archived, project_key, ticket_key, created_by, created_at, updated_at)
- `chat_messages` (id, conversation_id, author_id, body, adf, created_at, updated_at, deleted_at)
- `chat_threads` (id, parent_message_id, conversation_id, reply_count, last_reply_at)
- `chat_thread_replies` (id, thread_id, author_id, body, adf, created_at, updated_at, deleted_at)
- `chat_unread_markers` (user_id, conversation_id, last_read_message_id, last_read_at) — used for badge counts
- `chat_reactions` (id, message_id, author_id, emoji, created_at)
- `chat_bookmarks` (id, message_id, user_id, created_at) — saved messages
- `chat_notifications` (id, user_id, source_message_id, type, is_read, created_at) — @mentions only (Phase E)

**RLS status:**
- SELECT policies exist on conversations (user is in workspace) + messages (from non-deleted messages)
- INSERT/UPDATE/DELETE on messages and reactions — author gate only
- `chat_unread_markers` — user_id gate (own markers only)

### Lane C — ADS Compliance (static analysis)

Pre-audit: 13 hand-rolled icon/avatar files flagged (P0 component reuse violation, Phase D fix).
Committed code: ChatSidebar uses `ProjectIcon` + `JiraIssueTypeIcon` (ADS canonical).
Pre-commit code: MessageComposer.tsx has plain `<textarea>` (no ADS Editor, NOT Phase A scope).

### Lane D — Supabase Schema Introspection

All tables exist, no missing children for RLS cascade.
`chat_notifications` table (Phase E) will need INSERT policy + notification edge function.

---

## Phase 2 — Council (PENDING — mandatory before Phase A code)

**This session did NOT run council.** Next session MUST run full 17-advisor council (Design Foundation + Atlassian Architect + Engineering) before any Phase A subtask coding.

**Council input envelope:**
- Phase 1 evidence (above)
- Phase 0.5 register (Jira Architect scan — 28 patterns run, 3 findings, no halts)
- Slack canonical IA reference (from audit turn 1)
- 87 cross-cutting findings from chat audit (prior turn)

**Expected council verdict:** 
- H1-H10 design heuristics scored
- Component reuse strategy confirmed (Phase D timing + avatar/icon migration)
- RLS architecture validated (Phase E — notifications + presence + bookmarks)
- Composer scope confirmed (rich text editor via @atlaskit/editor-core vs plain textarea)

---

## Phase 3 — Complete Plan (7 phases A-G, one PR per phase)

### Phase A — Right-pane router + Threads aggregator (PR #1)

| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| A1 | Failing test: ChatRightPane tabs render (Threads/Bookmarks/Pins/Files/People) | claude-code | TDD non-negotiable (CLAUDE.md) | sonnet | test red → green | new test file, 5 tab assertions |
| A2 | Build ChatRightPane component — tabs switch ?right= param | claude-code | reuse @atlaskit/tabs (L1 reuse-first) | sonnet | compiles, no TS errors | 5 clickable tabs render |
| A3 | Aggregated Threads RPC — unread thread replies for user (30d window) | supabase-mcp | schema probe (anti-pattern #18) | — | execute_sql SELECT works | RPC returns thread list, no errors |
| A4 | Wire ChatSidebar Threads item → ?right=threads (full-screen aggregated view) | claude-code | URL-driven routing (CLAUDE.md 2026-05-11) | sonnet | URL changes, right pane renders | navigation works end-to-end |
| A5 | ads-validator on changed files | gh-cli | ADS-only (CLAUDE.md 2026-04-28) | — | 0 violations | clean audit |
| A6 | ask-Vikram before merge · git commit · create PR | manual | small-steps gate (CLAUDE.md) | — | Vikram confirms | PR created, linked to card |

**Notes on A3 RLS:** Aggregated threads query must read from `chat_thread_replies` for the current user. RLS SELECT policy exists on thread_replies (non-deleted messages only). If user is not in conversation, query returns 0 rows (correct). This is a read-only probe.

---

### Phase B — Composer formatting toolbar + slash-command palette (PR #2)

| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| B1 | Failing test: formatting toolbar (B/I/U/strike/link/lists/blockquote/code) renders + state toggles | claude-code | TDD | sonnet | test red → green | toolbar buttons + keydown listeners |
| B2 | Replace plain textarea with @atlaskit/editor-core (comment appearance) | claude-code | L1: reuse-first @atlaskit/editor-core not TipTap (CLAUDE.md 2026-05-08) | sonnet | editor renders with formatting marks | rich text input works |
| B3 | Slash-command palette (/remind /poll /code) + floating listbox | claude-code | WCAG 2.1 AA keyboard (arrow keys, Enter, Escape) | sonnet | palette opens on `/`, listbox navigable | keyboard nav verified |
| B4 | Schedule-send dropdown (▾ next to Send) — time picker integration | claude-code | reuse @atlaskit/dropdown-menu (not hand-rolled, CLAUDE.md 2026-05-10) | sonnet | dropdown renders, time picker callable | scheduled_at written to message |
| B5 | Paste-to-upload + drag-drop file zone in composer | claude-code | attachments integration (edge function `chat-attachment-proxy` exists) | sonnet | file upload works, preview renders | message includes attachment metadata |
| B6 | ads-validator + ask-Vikram + commit + PR | manual | ADS gate + small-steps | — | 0 violations, Vikram approves | PR created |

**Notes on B2:** @atlaskit/editor-core v100+ is the canonical rich text editor in Catalyst (used in `CatalystDescriptionSection`, etc.). Always prefer over TipTap or hand-rolled contenteditable. Composer appearance (comment-like, not full page) is the Slack style.

---

### Phase C — Message-row toolbar parity (PR #3)

| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| C1 | "Copy link to message" — permalink + clipboard write via Chrome MCP | claude-code | clipboard write (secure context HTTPS required) | sonnet | link copied to clipboard, toast shows | user can paste in address bar |
| C2 | "Mark unread from here" — write to `chat_unread_markers` (new table, RLS included) | supabase-migration | schema DDL + RLS (W3 pattern, CLAUDE.md 2026-05-29) | — | migration applies, RLS gates properly | SELECT returns user's markers only |
| C3 | "Remind me about this" → time picker → scheduled-tasks MCP | claude-code | scheduled-tasks MCP integration (create_scheduled_task) | sonnet | task created, fires at specified time | integration verified end-to-end |
| C4 | "Turn into…" → JiraIssue / Task picker (link message to BAU issue) | claude-code | modal picker (reuse @atlaskit/modal-dialog) | sonnet | picker opens, issue selectable | message links to issue via message metadata |
| C5 | Reactor list popover (hover reaction chip, shows users who reacted) | claude-code | self-rolled popover (L21 pattern — not @atlaskit/popup until v5) | sonnet | popover positions correctly on hover | users list renders (group by emoji) |
| C6 | Quick-reactions pinned strip (✅👀🙏 before picker icon) | claude-code | reaction affordance (Slack-parity) | sonnet | strip renders, click adds reaction | reactants deduplicated |
| C7 | ads-validator + jira-compare (msg toolbar) + commit + PR | manual | ADS + Slack parity gate | — | 0 violations, drift < threshold | PR created |

**Notes on C2 RLS:** `chat_unread_markers` table must have SELECT + UPDATE policies gated on `user_id = auth.uid()`. INSERT policy: user can insert their own markers. RLS pattern: `USING (user_id = auth.uid())` on all operations.

---

### Phase D — Component ADS migration (PR #4)

| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| D1 | chat/main/avatar.tsx → @atlaskit/avatar wrapper (size/name/src props) | claude-code | component reuse (L1, CLAUDE.md) | sonnet | compiles, exports named Avatar | avatars render with correct size |
| D2 | All inline SVGs (13 files) → @atlaskit/icon/glyph/* (MessageSquare, Bell, Heart, etc.) | claude-code | canonical icon library (CLAUDE.md 2026-05-09) | sonnet | all imports updated, no svg files in chat | icons render at correct size/color |
| D3 | Audit remaining <img> tags (CatalystChatIcon, AttachmentPreview, LinkUnfurl, ChatDock, CatyPanel) | claude-code | bundled-local or @atlaskit/avatar only (CLAUDE.md 2026-05-16 external ban) | sonnet | no external image URLs in src | images load from bundle or ADS |
| D4 | Delete unreferenced IconRail, ConversationList (confirm no dock-side import) | claude-code | dead-code cleanup (small-steps) | sonnet | no imports found via grep | surface still renders without them |
| D5 | ads-validator 0 violations + ask-Vikram + commit + PR | manual | ADS gate + small-steps | — | 0 violations, Vikram approves | PR created |

**Notes on D2:** @atlaskit/icon/glyph exports 1000+ icons as React components. Never use raw SVG or third-party icon libraries in Catalyst. Import pattern: `import { MessageSquareIcon } from '@atlaskit/icon/glyph'` (capital Icon suffix).

---

### Phase E — Search + notifications + presence + custom status (PR #5)

| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| E1 | ⌘K quick-switcher in /chat → channel/DM/user fuzzy search via GlobalSearch infra | claude-code | reuse existing GlobalSearch component (L1) | sonnet | ⌘K opens GlobalSearch filtered to chat | keyboard shortcut fires, results match |
| E2 | ConversationList header search input → functional (currently `<span>` placeholder) | claude-code | routing to GlobalSearch or local filter | sonnet | typing filters conversation list | results update as user types |
| E3 | Browser desktop-notification opt-in + per-channel mutes | supabase-migration | schema DDL: `chat_notification_prefs` table + RLS | — | table created, policies gate access | SELECT returns user's settings |
| E4 | Real presence — Supabase realtime presence channel (online/idle/dnd status) | claude-code | supabase/realtime subscribe + broadcast (edge function) | sonnet | presence state synced across clients | user sees who's online |
| E5 | Custom status (emoji + text + TTL) — extend `profiles` table | supabase-migration | schema DDL: add status_emoji, status_text, status_expires_at columns to profiles | — | columns exist, nullable, indexed | status updates via update_profiles endpoint |

**Notes on E3:** `chat_notification_prefs` table schema:
```sql
CREATE TABLE chat_notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mute_all BOOLEAN DEFAULT FALSE,
  mute_desktop BOOLEAN DEFAULT FALSE,
  mute_mentions_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
RLS: SELECT + UPDATE policies gate on `user_id = auth.uid()`.

**Notes on E5:** Presence uses Supabase realtime channels. Edge function broadcasts presence state on interval (e.g., every 30s). Client subscribes to presence channel and filters by workspace_id.

---

### Phase F — Empty state + channel intro card + sidebar polish (PR #6)

| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| F1 | MessageStream empty state → channel intro card (members/purpose/CTAs) | claude-code | @atlaskit/empty-state with primaryAction CTA (H10, CLAUDE.md 2026-04-28) | sonnet | card renders when 0 messages | CTA invites user to send first message |
| F2 | Sidebar section reorder + user-creatable sections | supabase-migration | `chat_sidebar_sections` table (id, user_id, section_name, position, created_at) | — | table created, RLS gates access | user can drag-reorder sections |
| F3 | Channel mute icon · unread badges · section unread counts | claude-code | react state + useUnreadCount hook | sonnet | badges render on channels with unread | mute icon hides badge when muted |

**Notes on F1:** Empty state uses ADS `@atlaskit/empty-state` component. Heading: "No messages yet. Be the first to speak up." Illustration: empty-chat icon. PrimaryAction CTA: "Send a message" (focuses composer).

---

### Phase G — Upstream font cleanup (PR #7 — ships independently)

| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| G1 | Delete `import "@fontsource-variable/inter"` + `jetbrains-mono` from src/main.tsx:8-9 | claude-code | CLAUDE.md 2026-06-09 font ban enforcement | sonnet | imports removed, file compiles | build succeeds |
| G2 | `npm uninstall @fontsource-variable/inter @fontsource-variable/jetbrains-mono` | manual | dependency cleanup (small-steps) | — | package.json updated, lockfile regenerated | npm ci succeeds |
| G3 | grep for residual `font-family: 'Inter'` → replace with `var(--ds-font-family-body)` | claude-code | ADS-token enforcement (CLAUDE.md ban) | sonnet | 0 matches in grep | all fonts use ADS vars |
| G4 | `node design-governance/rules/audit.js src/` → 0 font violations | gh-cli | design-system audit gate (CLAUDE.md 2026-06-03) | — | audit passes, 0 violations | ci gate unblocked |

**Notes on G:** This phase ships INDEPENDENT of A-F because it's a global cleanup, not chat-specific. Can ship as PR #7 anytime during the build, or batch with another PR. CLAUDE.md font ban = P0 enforcement.

---

## Slack Features Out of Scope (confirmed)

- Huddles (video/audio calls)
- Canvas (collaborative documents)
- Workflow Builder (automation)
- Apps marketplace
- Slack Connect (cross-org)
- Lists (pinnedlist of items)
- Clips (video snippets)
- Stages (live broadcast)
- eDiscovery
- Slack AI (Caty replaces via Phase E edge function)
- Multi-workspace (single workspace only)
- `/remind` daemon (use scheduled-tasks MCP, Phase C3)

---

## Open Items / Deferred

1. **Council verdict** — Phase 2 must run before Phase A code. Expect heuristic scores H1-H10 + component reuse verdict + RLS architecture sign-off.
2. **Composer rich text scope** — Phase B2 uses @atlaskit/editor-core. Formatting toolbar (B/I/U/strike/link/lists/blockquote/code) is in scope. Mentions (@) are in scope. Emoji picker is deferred.
3. **Notifications edge function** — Phase E will need edge function `chat-notification-dispatcher` (listens to new messages, checks `chat_notification_prefs`, sends browser notification via web-push API). Scope: Phase E3.
4. **Presence edge function** — Phase E4 needs `chat-presence-broadcaster` (subscribes to realtime presence, broadcasts to chat participants). Scope: Phase E4.

---

## Copy-Paste Block (for next session first message)

```
RESUME: chat Slack-parity build (Phase A council + execution)

Tier: high-stake
Committed: 9a2d13d6b (canonical sidebar + URL-driven state)
Status: awaiting Phase 2 council (mandatory before Phase A code)

NEXT STEPS:
1. Run full 17-advisor council (Design Foundation + Atlassian Architect + Engineering)
   - Input: Phase 1 evidence (Slack canonical IA, 87 findings, 5/10 parity pass)
   - Input: Phase 0.5 scan (28 patterns, 3 findings, no halts)
   - Expected verdict: H1-H10 scores, component reuse strategy, RLS architecture

2. After council approval: execute Phase A (right-pane router + Threads aggregator)
   - 6 subtasks (TDD → ChatRightPane → Threads RPC → URL wiring → ads-validator → PR)
   - Workflow fanning A1-A6 subtasks in pipeline
   - Estimate: 3-4 hours

3. Phases B-G deferred to subsequent sessions (5 more PRs, one per phase)
   - Phase B: composer formatting + slash-commands
   - Phase C: message-row toolbar (copy link, mark unread, remind, turn into, reactions, quick-reactions)
   - Phase D: avatar/icon component migration (@atlaskit)
   - Phase E: search + notifications + presence + custom status + edge functions
   - Phase F: empty state + channel intro + sidebar polish
   - Phase G: upstream font cleanup (independent PR)

HANDOVER FILES:
- active/preflight-handover-2026-06-09-chat-slack-parity.md (THIS FILE)
- .catalyst-board-session (deleted after commit, can re-create from card_key below)

BOARD CARD:
- card_key: "preflight:chat-slack-parity:2026-06-09"
- status: "in_progress"
- branch: "main"
- commits: [9a2d13d6b]

QUICK REFERENCE:
- ChatSidebar.tsx: 128 lines, Projects + Tickets + DMs sections, ProjectIcon canonical
- ChatMainView.tsx: 142 lines, URL-driven ?conv= ?rail=, removed IconRail/ConvList
- Phase 0.5: 28 patterns, 0 halts, safe to proceed
- Phase 1 evidence: Slack IA reference, schema tables, ADS audit, 25 chat files inventoried
- Phase 3 plan: 7 phases (A-G), 1 PR per phase, Phase A = 6 subtasks, Phases B-G = 4-5 subtasks each

BLOCKERS:
- None (council is planning gate, not code blocker)

BRANCH: main
CONTEXT (this turn): 95% — session ended to avoid recompilation mid-plan
```

---

## Lessons Candidates (Phase 6 — awaiting Vikram approval)

None generated this session (all prior lessons from audit turn 1 already saved).

---

## Files Modified

```
M src/lib/workspaceContext.ts          — added 'chat' WorkspaceType + /chat short-circuit
M src/components/layout/CatalystShell.tsx — ChatSidebar mount for /chat routes
C src/components/layout/ChatSidebar.tsx    — new file, 128 lines, canonical pattern
M src/components/chat/ChatMainView.tsx — removed IconRail + ConvList, added URL-driven routing
```

---

## Session Notes

- Context hit 95% after Phase 3 plan synthesis (7 phases, 33 total subtasks across 33 rows)
- All pending changes committed in single clean commit (9a2d13d6b)
- Council skipped due to context limit (mandatory Phase 2 runs next session)
- Phase A plan is ready to execute via Workflow (A1-A6 pipeline)
- Phases B-G are fully specified but deferred to subsequent sessions

---

**Generated:** 2026-06-09 ~10:45 UTC
**Session ID:** [9a2d13d6b context window close]
