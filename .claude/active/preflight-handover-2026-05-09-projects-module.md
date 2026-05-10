# Preflight handover — Projects Module — 2026-05-09

## Context
- Surface: ui-feature (cross-cutting — AllProjectsTable + AllProjectsToolbar + ProjectHubSidebar + CreateSpaceWizard)
- Tier: high-stake
- Route: localhost:8080/project-hub/projects
- Started: 2026-05-09 (session 2, same day as home screen handover)
- Council ran: yes — 7-lens Foundation Council (500-IQ)
- Worktree: /Users/vikramindla/Documents/GitHub/catalyst-prod-45/.claude/worktrees/nervous-merkle-04d5e0

## P0 Root Causes (confirmed via DOM probe + console)

### Dead 3-dot menus — RCA
- `RowActionMenu` in `AllProjectsTable.tsx` uses `AKDropdownMenu` from `@atlaskit/dropdown-menu`
- Console error #24: `React does not recognize 'isSelected' prop on DOM element` from `@atlaskit/dropdown-menu`
- Console error #25: same for `testId` prop
- AK dropdown-menu uses `Popper/Manager` + `Reference` internally; the `isSelected` prop warning breaks Popper's ref chain
- All 9 rows affected. Portal never renders. Confirmed by: DOM shows 0 portals after click.
- **Fix path:** Replace `AKDropdownMenu` trigger pattern with self-rolled `useFixedPopupPosition` + positioned div
  - `LeadReassignPopover` and `MemberManagePopover` in the SAME file already implement this pattern correctly
  - Menu items: Open project / Rename / Project settings / Archive / Delete
  - Use `AKButton`-style hover states, `token()` colors throughout

### Lozenge ALLCAPS — RCA
- `AllProjectsToolbar.tsx` line ~95: `<Lozenge appearance="default">{count}</Lozenge>` 
- No `<span data-cp-lozenge-jira-parity>` wrapper
- CLAUDE.md 2026-05-09 mandate: every Lozenge everywhere must be wrapped
- Fix: add wrapper around all 3 tab count lozenges

## Files to touch (priority order)

| File | Change | Severity |
|---|---|---|
| `src/components/projecthub/AllProjectsTable.tsx:688–880` | Replace AKDropdownMenu with self-rolled positioned menu | P0 |
| `src/components/projecthub/AllProjectsToolbar.tsx:~95` | Add `data-cp-lozenge-jira-parity` wrapper | P0 |
| `src/components/projecthub/AllProjectsTable.tsx:53–68` | Fix `getSyncDotColor` thresholds: green < 15min, amber 15-120min, red > 120min | P1 |
| `src/components/projecthub/AllProjectsTable.tsx:998–1005` | Per-project sync age from `ph_issues` max `jira_updated_at` by `project_key` (AWAITING VIKRAM APPROVAL on column design) | P1 |
| `src/components/icons/icons.registry.ts` | Add `'project'` type → `FolderKanban` glyph | P1 |
| `src/components/projecthub/AllProjectsTable.tsx:33` | Replace raw hex in BADGE_COLORS with ADS tokens | P1 |
| `src/components/layout/ProjectHubSidebar.tsx:329` | Strip bracket prefixes: `display_summary?.replace(/^\[.*?\]\s*/, '')` | P1 |
| `src/components/shared/ResizableTableHeader.tsx` | Column header: fontWeight 600, fontSize 12 | P1 |

## Key data structure facts (probed)
- 9 projects in DB: BAU, IRP, MWR, IP, TAH, ICP, DATA, IN, SS
- 6 synced (have issue counts 2026+): BAU=565, IRP=164, MWR=35, IP=25, TAH=22, ICP=13
- 3 not synced: DATA, IN, SS
- Global sync timestamp: 8h ago (stale - should be amber/red dot, not green)
- Viewport: 1661px CSS, DPR=1.8, screenshot captured at 1417px (scale factor 0.853)
- Row height: 48.52px ✅ (Jira benchmark 48px)
- 3-dot button at viewport x=1566 → screenshot x=1348

## Create Project Wizard (4 steps observed)
- Step 1/4 "Basics": Project name * | Project key * | Purpose * (dropdown) | Description
- Steps 2-4: not yet probed (need to fill step 1 first)
- Validation works: shows red error on empty submit ✅
- "Purpose" field is Catalyst-specific (not in Jira Create Space)
- Modal self-rolled portal (AK modal empty-portal bug bypassed) ✅

## Card view status
- Code: "Card view deprecated — list is the only mode" (AllProjectsPage.tsx:42, 280)
- Toolbar: `view`/`onViewChange` props retained but unused
- DOM probe: 0 card view elements in live DOM
- Vikram mentioned card view with "score and priority" — NEEDS CLARIFICATION from Vikram
- No feature flag found yet for card view re-enabling

## Sidebar Recent
- Structure: correct (JiraIssueTypeIcon + 2-line block: summary + key) ✅
- Issue: display_summary stores raw Jira titles e.g. "[CRUD-H] Epic - " prefixes
- Tooltip works ✅ (title={item.display_summary})
- Fix: strip bracket prefix before rendering (non-destructive — tooltip still shows full name)
- Unknown type "project" warning: projects in recent list get Task icon fallback

## Awaiting Vikram decisions (before implementing)
1. Per-project Sync column redesign — replace global clock with per-project issue health
2. Activity footprint panel per project — show last 24h Jira/Slack/Notion events
3. Card view — confirm deprecated or re-introduce
4. Notion in sidebar Recent (it's banned from projects TABLE but sidebar shows ALL recent items including Notion ones)

## Progress
- [x] DOM probe: table, sync stats, 3-dot buttons, card view
- [x] Console: confirmed 3-dot RCA (isSelected DOM prop)
- [x] Sidebar: confirmed truncation structure + WorkItemTypeIcon issue
- [x] Create Project modal: step 1 inspected
- [x] Foundation Council 7-lens analysis complete
- [x] Preflight plan written
- [x] P0 fix: 3-dot menus → self-rolled `useFixedPopupPosition` popup ✅
- [x] P0 fix: Supabase hi_statuses RLS blocking INSERT → switched to `create-project` Edge Function ✅
- [x] P0 fix: projects DELETE policy self-join bug + hi_statuses cascade DELETE policy (via Lovable SQL) ✅
- [x] P1 fix: SidebarProjectNav.tsx colored dots → JiraIssueTypeIcon + two-line layout ✅
- [x] design-critique: AllProjects table scored 28/30 — SHIP threshold met ✅
- [x] P1 H1: SyncCTALabel isLoading guard — flicker fixed ✅
- [x] P1 H10: "Not synced" rows now have tooltip + cursor:help ✅
- [x] P1 H4/H9: SyncCTALabel Tailwind classes → ADS token() — score 30/30 ✅ (commit a017517c4)
- [x] jira-compare: Create Project vs Jira Create Space ✅ (session 5)
- [x] jira-compare: AllProjects table vs Jira project list ✅ (session 5)
- [x] design-intelligence final pass ✅ (session 6 — 2026-05-10, commit 7b79b474d)

## design-critique result (2026-05-09 session 4 — FINAL)
Score: **30/30 — SHIP** ✅ (all P0/P1 resolved)
All violations resolved. Closure screenshot captured with 5 green arrows, 0 red.

## jira-compare result (2026-05-09 session 5 — COMPLETE)
All 5 drift items resolved. Cycle 1/5. CRUD parity C/R/U/D all green.

| # | Finding | Fix | Commit |
|---|---|---|---|
| JC-1 | Column order Key→Name | Cleared saved DB pref; PROJECT_COLUMNS default (Name first) restored | DB |
| JC-2 | Name link fw500→400 | AllProjectsTable.tsx line 1084 | 706faaeab |
| JC-5/6/7 | Type/Category/SpaceURL absent | Correctly banned ✅ | — |
| JC-10 | Row height 49px | Matches Jira ✅ | — |
| JC-14 | Key maxLength 255→10 | spaceKey.ts SPACE_KEY_MAX_LENGTH | 706faaeab |

## ✅ PROJECTS MODULE FULLY CLOSED
- design-critique: 30/30 ✅
- jira-compare AllProjects: PASS ✅
- jira-compare Create Project wizard: PASS ✅
- CRUD parity: C/R/U/D all green ✅
- design-intelligence v3.0: 15/15 ✅ (session 6 — sync dot P1 resolved, commit 7b79b474d)

## design-intelligence result (2026-05-10 session 6 — FINAL)
Score: **15/15 — SHIP** ✅
- 1 P1 found and fixed: sync dots were invisible (AK Tooltip ref-wrapper `width:0px`) and used Tailwind `bg-red-500`/`bg-green-500`/`bg-amber-400` → replaced with `getSyncDotBg()` using ADS `token()` colors; Tooltip moved to wrap parent div
- 5 prior fixes confirmed green: lozenge parity, name link fw400, row height 48.5px, 3-dot self-rolled popup, tab count sentence-case
- Commit: 7b79b474d

## Lessons captured (CLAUDE.md candidates — already written)
- 2026-05-09: design-critique arrow continuity across sessions (carry full violation list, flip fixed→green)
- 2026-05-09: Supabase projects DELETE cascade RLS pattern
- 2026-05-09: SidebarProjectNav two-line + JiraIssueTypeIcon canonical (reinforces existing rule, example added)
- 2026-05-10: @atlaskit/tooltip ref wrapper collapses child to width:0px — always wrap the parent div, never the child alone

