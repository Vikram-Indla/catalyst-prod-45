# JIRA COMPARE — BAU list view + BAU-5609 rail (handoff to fresh conversation)

**Date:** 2026-04-27
**Reason for handoff:** prior conversation context approaching red; clean handoff per L15 to preserve audit state and run the proper Chrome MCP probe loop without compaction risk.

## Surface

- **Jira reference:** https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?direction=DESC&selectedIssue=BAU-5609&sortBy=key
- **Catalyst route:** http://localhost:8080/project-hub/BAU/backlog (or wherever the page mounts; route from `BacklogPage.atlaskit.tsx`)
- **Scope:** the BAU backlog list view + the BAU-5609 right-rail detail panel — every CTA, dimension, surface inside both screenshots Vikram shared on 2026-04-27.

## Already fixed this session (do NOT redo)

| # | Fix | File |
|---|---|---|
| 1 | Status lozenge color map: `In QA` / `Ready for QA` / `In UAT` / `Ready for UAT` / `In BETA` flipped from `inprogress` (blue) to `success` (green) to match Jira's "Done" status category | `src/modules/project-work-hub/utils/backlog.utils.ts` (STORY_STATUS_LOZENGE) |
| 2 | Header status pill on detail rail (Atlaskit Lozenge + chevron + dropdown picker) added to Quick Actions row, independent state `showHeaderStatusDropdown` | `src/modules/project-work-hub/components/dialogs/StoryDetailModal.tsx` |
| 3 | AI sparkle button relabeled to `✨ Improve Story` matching Jira's CTA | same file |
| 4 | Lightning bolt button (`Zap` from lucide) added between `+` and Improve Story, wired to `setShowWorkflow(true)` | same file |
| 5 | "All" tab now flattens the tree (was 135 visible because epics collapsed; flat shows all 243). Other tabs preserve manual tree | `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (visibleRows useMemo) |
| 6 | Table horizontal scroll — bumped `.jira-table-grid table` min-width from 800px → 1280px so columns don't crush when the rail eats 40%; viewport already had `overflow-x: auto` | `src/components/shared/JiraTable/JiraTable.tsx` |
| 7 | (Adjacent: catalyst_issues sweep started) `useProjectListItems.ts` — removed parallel catalyst_issues fetch + mapCatalystIssue helper + dedup logic; ph_issues now contains both jira and catalyst rows | `src/hooks/useProjectListItems.ts` |

## Deferred — needs the fresh agent to probe + fix

| # | Element | Status | Why deferred |
|---|---|---|---|
| D1 | Tabs paradigm: Catalyst has `All / Epics / Features / Stories` (type filters); Jira has `List / All work / Releases` (view modes) | open | Different mental model — restructure call needs design consideration |
| D2 | Page header rebuild — Jira: space avatar + "Senaei BAU" + tabs + share/lightning/expand icons; Catalyst: just "Backlog" h1 | open | Big surface change; needs ph_projects join for project name + avatar |
| D3 | Watcher count + eye icon on detail rail | open | Needs `ph_watchers` table wiring; UI-only stub possible if data isn't ready |
| D4 | Comments column richer cells — Jira: prominent "Add comment" link / "X comments" with chat icon; Catalyst: sparser | open | `makeCommentsCell` accepts a count fn but render shape differs from Jira |
| D5 | Filter avatar pills in toolbar (Jira's user-filter avatars next to search) | open | Component doesn't exist; would build new w/ @atlaskit/avatar-group + filter wiring |
| D6 | Layout switcher icon (Jira's rightmost "..." in toolbar with view options) | open | Needs view-mode storage; minor |
| D7 | "Group" button — Catalyst shows "Group by: None" with explicit label; Jira shows compact "Group" button | open | `@atlaskit/dropdown-menu` cosmetic change |
| D8 | Detail rail breadcrumb trailing `/` — "ProjectHub / BAU /" with nothing after | open | Needs DOM probe to confirm if it's actually a bug or just a separator before nav row |
| D9 | `[QUEUE LIVE TEST]` suffix on BAU-5609 title | data, not UI | Vikram's own test data from yesterday's iron-dome work. Strip from PROD or accept as transient. |
| D10 | Sidebar status pill in detail rail — second pill remains in sidebar even though header pill now exists. Jira has only one (header). | open | Can drop the sidebar one OR keep both per Vikram preference |
| D11 | Fontfamily / typography sweep — Catalyst inherits Charlie via `--cp-font-*` chain; needs probe vs Jira's actual rendered Atlaskit values | open | Needs `getComputedStyle` |
| D12 | Tab order through both surfaces vs Jira | open | Needs DOM walk |

## Open background items (NOT in scope of this audit)

- **Sync death since 2026-04-01.** ph_sync_log last success was 2026-03-03 (polling); webhook dropped on Apr 1. Force Sync was running when this handoff was written; check `ph_issues` BAU max key — should be > 5239 if it succeeded.
- **catalyst_issues sweep** — 27 callers remaining in 28 files (1 done, useProjectListItems.ts). Vikram paused mid-sweep to switch back to Backlog page.
- **schema drift** — `src/integrations/supabase/types.ts` is out of date vs PROD. Examples: `jira_sync_logs` has different columns on PROD (no `event_type`, `jira_key`, `items_deleted`, `sync_duration_ms`, `items_synced`). Don't trust types.ts blindly; introspect via `information_schema.columns` first.

## Lessons to apply (from §19 of skill, plus L26–L29 from prior audit)

- **L01** — DOM probe is mandatory; don't skip Chrome MCP for a comprehensive audit
- **L02** — Probe the whole subtree, not just the visible top
- **L09** — Adoption protocol for new `@atlaskit/*` packages: package.json + vite.config.ts optimizeDeps.include + canonical import + npm run dev (all four)
- **L10** — Supabase UUID column silent 400 (don't pass issue_key to UUID column)
- **L14** — Loop not closed until Phase 7 returns empty diff AND Phase 8 wiring test passes
- **L15** — Context health announced not assumed; emit handoff at red
- **L26** — Every DDL needs no-op ALTER + double NOTIFY pgrst (bare NOTIFY ignored on Lovable)
- **L27** — Query pg_trigger before any DROP TRIGGER
- **L28** — Supabase REST PATCH returns 204 on zero matches; never trust optimistic UI as proof of write
- **L29** — PersistQueryClientProvider persists to localStorage; UI can show fictional rows for weeks

## Wiring inventory (run in Phase 8)

For each interaction below, verify behaviour matches Jira and persists to DB:

1. **Click row → opens detail rail** with focus in summary; URL updates to `?selectedIssue=BAU-XXXX`
2. **Status pill click (header + sidebar)** → opens picker → selecting a status PATCHes ph_issues + appears in catalyst_status_history
3. **Lightning bolt click** → opens workflow modal (`setShowWorkflow(true)`)
4. **`+` Add menu** → all entries (Create subtask, Link work item, Add attachment, Add web link, Add design) work
5. **Improve Story** → AI panel opens, generates output, "Apply to Description" / "Apply Both" persist via `updateFieldMutation`
6. **Inline edit summary** → InlineEdit confirms → updateFieldMutation → ph_issues PATCH
7. **Tab switching (All / Epics / Features / Stories)** → URL updates, count badges accurate, table re-renders flat for All / tree for others
8. **Search** → filter visibleRows, no debounce lag
9. **Sort by Updated/Key/Summary/Status/Parent/Assignee/Priority** → persists to URL
10. **Group by None / Status / Assignee** → toggle works
11. **Filter chip changes (priority, status, work type, assignee, reporter, fix version, updated, created)** → applied to visibleRows
12. **Right rail nav chevrons** → moves through navigationItems list
13. **Right rail close (X)** → closes panel, URL updates

## Files to read FIRST in the new conversation

```
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/CLAUDE.md
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/.catalyst/audits/jira-compare/2026-04-27-bau-list-view-handoff.md   ← THIS FILE
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/.catalyst/audits/jira-compare/2026-04-27-bau-iron-dome-and-sync-dead.md  (yesterday)
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/.catalyst/audits/jira-compare/lessons-pending-skill-merge.md
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/modules/project-work-hub/components/dialogs/StoryDetailModal.tsx
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/components/shared/JiraTable/JiraTable.tsx
/Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/modules/project-work-hub/utils/backlog.utils.ts
```

## Next gate to run

**Phase 0 → 1 → 2** — fresh Chrome MCP probe on both Jira and Catalyst sides (don't trust the screenshots from prior conversation; re-pull DOM with `getComputedStyle`). Save snapshots to `.catalyst/audits/jira-compare/.probes/2026-04-27-bau-list-view/`. Then DIFF, audit report, and run patch → re-probe → wiring test loop until empty.

Max loops = 5. If loop 5 doesn't close, escalate with a `[ROVO]` prompt.
