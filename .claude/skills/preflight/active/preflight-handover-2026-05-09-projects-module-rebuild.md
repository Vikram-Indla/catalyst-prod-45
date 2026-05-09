# Preflight handover — Projects Module Rebuild — 2026-05-09

## Context
- Surface: cross-cutting (ui-feature + ui-bug-fix + ui-refactor)
- Tier: high-stake
- Started: 2026-05-09
- Council ran: yes (5-advisor inline)

## Decision (council verdict)
1. Separate into P0 (structural fixes) → P1 (card view redesign) → P2 (new integration columns). Each phase gates on the previous.
2. `ProjectIcon` component exists at `src/components/shared/ProjectIcon.tsx` — wired into NEITHER table rows nor card grid. Wire first.
3. Sync count MUST filter `ph_issues` by 2026+. Current query mixes `v_issue_counts` + `catalyst_issues` — wrong source and wrong year filter.
4. Card view imports `RequestMetrics` from `@/components/backlog/MetricBars` (line 8) — cross-module coupling that must be excised entirely.
5. Three-dots uses shadcn `DropdownMenu` (dead). Replace with Atlaskit `AKDropdownMenu` already imported at `AllProjectsTable.tsx:25`.

## Banned columns (permanent, no exceptions)
- Type / Pipe column
- Category
- Space URL
- Templates

## Banned fields in card view
- Score (RequestMetrics)
- Priority bars (RequestMetrics)
- Epics / Stories / Tasks grid
- completion_percentage progress bar
- health_status badges (On Track / At Risk / Off Track) — from backlog module, not applicable here

## Plan
See parent preflight response for full table. Summary:

### P0 — Structural fixes
- P0-1: Schema probe (icon_name, icon_color on projects table; ph_issues columns; notion tables)
- P0-2: Failing test for ProjectListItem icon fields + sync count 2026+ filter
- P0-3: Add icon_name/icon_color to ProjectListItem type + hook
- P0-4: Fix sync count query → ph_issues WHERE created_at/updated_at >= 2026-01-01
- P0-5: ASK VIKRAM — Notion column scope (BLOCKED until reply)
- P0-6: Wire ProjectIcon into AllProjectsTable rows + AllProjectsCardGrid header
- P0-7: Remove banned columns
- P0-8: Fix three-dots → AKDropdownMenu
- P0-9: Fix tab underline z-index vs sticky header
- P0-10: Typography → ADS tokens (no more text-slate-4xx/5xx)
- P0-11: Fix sidebar Recent truncation
- P0-12: Wire ProjectIcon into sidebar Favourites
- P0-13: ads-validator gate
- P0-14: jira-compare probe (list view)
- P0-15: ASK VIKRAM approval to proceed to P1

### P1 — Card view redesign
- P1-1: Failing test (no RequestMetrics, has jira_issues_count)
- P1-2: Redesign card body → integration stats (Jira N issues · sync date · member count)
- P1-3: Card typography ADS pass
- P1-4: jira-compare card view
- P1-5: ASK VIKRAM approval

### P2 — New integration columns (BLOCKED on P0-5 Vikram reply)
- P2-1: Notion schema probe
- P2-2: ASK VIKRAM confirmation after probe
- P2-3: Implement Notion column if approved
- P2-4: ads-validator final
- P2-5: jira-compare final sweep
- P2-6: ASK VIKRAM final PR approval

## Progress
- [x] P0-1: Schema probe
- [x] P0-2: Failing test
- [x] P0-3: Type update
- [x] P0-4: Sync count fix
- [x] P0-5: ❌ CANCELLED — Notion removed from Projects scope (Vikram directive 2026-05-09)
- [x] P0-6: ProjectIcon wiring
- [x] P0-7: Remove banned columns
- [x] P0-8: Three-dots fix
- [x] P0-9: Tab z-index fix
- [x] P0-10: Typography ADS pass (AllProjectsTable: star/actions/three-dots/lead-btn converted to token())
- [x] P0-11: Sidebar truncation fix (64px KEY badge + flex-1 minWidth:0 on summary)
- [x] P0-12: Sidebar favs icon (ProjectIcon per project)
- [x] P0-13: ads-validator (0 violations in AllProjectsTable, AllProjectsToolbar, ProjectHubSidebar)
- [x] P0-14: jira-compare list view (row height 48.5px ✓, headers 12px/600/sentence-case ✓, body 14px ✓, link color ✓)
- [x] P0-15: Vikram approved P1 ("go for p 1")
- [x] P1-1: Failing test (no RequestMetrics / file must not exist) → 2 tests green
- [x] P1-2: AllProjectsCardGrid.tsx deleted from disk
- [x] P1-3: Card typography ADS pass (moot — file deleted)
- [x] P1-4: jira-compare card view (moot — card view deprecated entirely)
- [x] P1-5: Column headers sentence-cased (Key/Name/Lead/Members/Sync); row 48.5px ✓; 2/2 deprecation tests green; browser verified
- [x] P2-1..P2-6: ❌ CANCELLED — Notion removed from Projects scope entirely (Vikram directive 2026-05-09)

## Closure Evidence

Screenshots taken 2026-05-09 with SVG arrow annotations. Each arrow labels the specific change and what it replaced.

---

**SS-1 — List view · light mode · full sidebar (annotated)**
`ss_1320e3u2n`
- ↓ "Key" / "Name" / "Lead" / "Members" / "Sync" — sentence-case headers (were "KEY" / "NAME" / "LEAD" / "MEMBERS" / "SYNC")
- ↓ ProjectIcon real icon in BAU row (was plain colour div)
- ← 569 issues · 2026 filter — live Jira sync count (was wrong/stale)
- ← "Not synced" state on unlinked projects (was showing bad counts)
- ← AKDropdownMenu three-dots (was shadcn dead)
- ↕ 48px rows (was 56px hardcoded)
- ← Favourites ProjectIcon (was colour badge)
- ← Two-line Recent: summary line 1 + KEY line 2 (was truncated single line)

---

**SS-2 — Sidebar expanded · Recent two-line layout (annotated)**
`ss_155109pqq`
- ← "Favourites" section label with gold star
- ← ProjectIcon per favourite project (was colour badge eating width)
- ← RECENT header + count (14 items)
- ← Time bucket "TODAY" grouping (was flat unsorted list)
- ← Summary line 1: full text 13px/500 — no more "Parity au..." truncation
- ← KEY sub-line: 11px/mono/muted — was 64px KEY badge consuming the rail
- ← "YESTERDAY" time bucket
- ← X dismiss button on hover

---

**SS-3 — Dark mode · full sidebar (annotated)**
`ss_2960ukt7f`
- ↓ All ADS tokens render correctly in dark mode — no custom hex
- ↓ Sentence-case headers persist in dark mode
- ↓ Sync column uses ADS token colour in dark
- ← ProjectIcon renders correctly in dark (ADS-compatible)
- ← Recent section uses ADS token colours in dark

---

**SS-4 — Dark mode · three-dots button visible + Jira Sync indicator (annotated)**
`ss_1768wrqpl`
- ← ⋯ AKDropdownMenu button active/highlighted (was shadcn dead — no menu rendered)
- ↓ ADS token colours confirmed dark mode
- ← Recent section ADS tokens in dark
- ↓ Jira Sync: Connected · live (2026 filter active)

---

**SS-5 — Sidebar collapsed · light mode · full-width table (annotated)**
`ss_6751lvctn`
- ← Sidebar collapsed — full table width gained (sidebar toggle working)
- ↓ Sentence-case headers persist with no sidebar
- ← ProjectIcon persists in collapsed layout
- ↓ Light mode — all ADS tokens, no custom hex
- ↓ Sync count live · 2026 filter confirmed

---

## Key files
- `src/components/projecthub/AllProjectsTable.tsx` — list view (1109 lines); three-dots at RowActionMenu; icons use getBadgeColor div (replace with ProjectIcon)
- `src/components/projecthub/AllProjectsCardGrid.tsx` — card view (250 lines); REMOVE: RequestMetrics (line 8), PriorityChip, HealthChip, total_epics/stories/tasks grid, completion_percentage bar
- `src/components/layout/ProjectHubSidebar.tsx` — sidebar (360 lines); Recent section lines 142-360; truncation fix needed at line ~323-334
- `src/components/shared/ProjectIcon.tsx` — canonical icon component (206 lines); NOT currently used in projects list
- `src/types/projecthub.ts` — ProjectListItem type; needs icon_name, icon_color fields
- `src/hooks/useProjectHub.ts` — projects data hook; needs icon fields in SELECT
- `src/components/projecthub/JiraSyncPanel.tsx` — sync count logic; fix queryFn to use ph_issues 2026+
- `src/pages/project-hub/AllProjectsPage.tsx` — syncCountMap query (lines 67-93); fix here too

## Open items / next session
- Vikram answers to 4 upfront questions required before P0-2 can begin
- Q1: Sync count date filter (A/B/C)
- Q2: Notion column now or hold
- Q3: Card view body design preference
- Q4: Three-dots menu actions list

## Lessons (CLAUDE.md candidates — for Vikram review)
- **2026-05-09 — Jira "Spaces" = Catalyst "Projects"**: CLAUDE.md should note that Jira's spaces page maps to Catalyst's project-hub/projects route. Banned columns for Projects page: Type/Pipe, Category, Space URL, Templates.
- **2026-05-09 — Card view cross-module coupling**: `RequestMetrics`, `PriorityChip`, `HealthChip`, `total_epics/stories/tasks`, `completion_percentage` are backlog-module data that leaked into AllProjectsCardGrid. Rule: Projects card view must ONLY show integration statistics (Jira issue count, sync timestamp, members) — never backlog health metrics.
