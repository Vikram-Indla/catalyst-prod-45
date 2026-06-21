# Catalyst Replay Theatre — Discovery Report

## 1. Work item types (from `src/lib/jira-issue-type-icons.tsx`)

| Type | Icon asset | Used in Theatre |
|---|---|---|
| Business Request | `business-request.svg` (amber lightbulb) | Yes — root of `SEED_BR_SCRIPT` |
| Epic | `epic.svg` (purple lightning) | Yes — root of `SEED_EPIC_SCRIPT` |
| Feature | `feature.svg` (green hexagon) | No (not in seed data) |
| Story | `story.svg` (blue bookmark) | Yes — child items in all scripts |
| Task | `task.svg` (blue checkbox) | No |
| Sub-task | `sub-task.svg` | Excluded by default |
| QA Bug | `qa-bug.svg` | Yes — `BAU-740`, `BAU-741` |
| Production Incident | `production-incident.svg` (red flame) | Yes — `BAU-750` |
| Change Request | `change-request.svg` | No |
| Business Gap | `business-gap.svg` | No |
| Backend / Frontend / Integration | `backend.svg` etc. | Excluded by default |

## 2. Hierarchy (from `CLAUDE.md` canonical map, 2026-06-12)

```
Business Request  ← root (ProductHub)
  └─ Epic
       ├─ Feature → Story
       ├─ Story → [subtask-family]
       ├─ Task → [subtask-family]
       ├─ QA Bug / Defect
       ├─ Production Incident
       ├─ Change Request
       └─ Business Gap
```

`TheatreCharacter.hierarchyLevel` encodes this:
- `0` = Business Request (root)
- `1` = Epic
- `2` = Story / Feature / QA Bug / Incident / CR / Business Gap
- `3` = Subtask-family (excluded from Theatre by default)

## 3. Dashboard integration points

| Hub | Component | Mount point |
|---|---|---|
| Product Hub | `ReplayDashboardWidget mode="product"` | Business Request detail view sidebar or dashboard card |
| Project Hub | `ReplayDashboardWidget mode="project"` | Epic detail view or project dashboard |
| Release Hub | `ReplayDashboardWidget mode="release"` | Release detail view header area |

The widget renders a white ADS card with a Live chip, item stats, description, and an `@atlaskit/button appearance="primary"` "Open Replay" CTA that opens `ReplayTheatreOverlay` in a portal.

## 4. Modal integration points

| Surface | Component | Usage |
|---|---|---|
| Business Request title | `ReplayTitleChip mode="product-br"` | Hover-reveal chip next to the BR title — requires `.replay-title-hover-zone` wrapper class on the title container |
| Epic title | `ReplayTitleChip mode="project-epic"` | Same pattern for Epic titles in the project hub |
| Any button | `ReplayOverlay` | Wraps `ReplayTheatreOverlay` with `SEED_BR_SCRIPT`; kept for backwards compat with callers that pass only `rootKey` |

`REPLAY_CHIP_CSS` (exported from `ReplayTitleChip.tsx`) must be injected once — e.g. in `index.html` or a global CSS file — for the hover-reveal to work.

## 5. Admin integration point

Route: `/admin/replay` → `src/pages/admin/ReplayAdminPage.tsx`

The page has two sections:
1. **Backfill operations** (existing) — DB stats + `wh-jira-changelog-backfill` trigger
2. **Theatre settings** (new, local state only) — toggles for hub visibility, eligibility thresholds, playback speed, narrative elements, excluded work item types, and a "Preview Replay" button that opens the demo seed script

No DB persistence is wired for Theatre settings — state is local React. Wire to Supabase config table when ready.

## 6. Gaps / assumptions for demo seed data

1. **`events` array is empty** in all three seed scripts — `ReplayTheatreOverlay` calls `buildTheatreEvents(script)` from `src/lib/replay/theatre/eventEngine.ts` to synthesise events from `characters`. If `eventEngine.ts` does not exist or `buildTheatreEvents` returns `[]`, the "story" phase will show an empty rail.
2. **`contributions` array is empty** — credits phase will render a blank screen until `TheatreContribution` objects are populated.
3. **`SEED_RELEASE_SCRIPT.rootType`** is `'Epic'` (not `'Release'`) because `TheatreItemType` has no `'Release'` variant. A future `release-bundle` mode should add `'Release'` to the union if needed.
4. **`ReplayBranchCanvas` and `ReplayCredits`** are imported by `ReplayTheatreOverlay` but not included in this report's file list — they must exist at `src/components/replay/theatre/`.
5. **The `rootKey` prop on `ReplayOverlay`** is accepted for API compatibility but ignored — the overlay always renders `SEED_BR_SCRIPT`. Live data wiring requires a `buildScriptFromJiraData(rootKey)` async factory.

## 7. New files written

| Path | Purpose |
|---|---|
| `src/components/replay/theatre/ReplayDashboardWidget.tsx` | White ADS card widget for Product / Project / Release hub dashboards |
| `src/components/replay/theatre/ReplayTitleChip.tsx` | Hover-reveal `▶ Replay` chip for BR and Epic titles; exports `REPLAY_CHIP_CSS` |
| `src/components/replay/ReplayOverlay.tsx` | **Updated** — now delegates to `ReplayTheatreOverlay` with `SEED_BR_SCRIPT` |
| `src/pages/admin/ReplayAdminPage.tsx` | **Updated** — Theatre settings section added below existing backfill section |
| `REPLAY_DISCOVERY_REPORT.md` | This file |
