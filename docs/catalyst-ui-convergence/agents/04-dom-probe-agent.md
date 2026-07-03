# Agent 04 — DOM Probe Agent Report

**Date:** 2026-07-03
**App:** http://localhost:8080 (logged in, project BAU)
**Method:** Chrome MCP `javascript_tool` — one consolidated DOM probe per route (selector + tagName + role + getBoundingClientRect), executed on the live SPA after 5–7 s render waits. All measurements are real rendered pixels at 1512×805 viewport (device-independent CSS px, page canvas 1668 wide with sidebar).

---

## Scope covered

- 7 canonical Project Hub routes (BAU)
- 6 Release Hub routes
- 6 Test Hub routes
- 5 Incident Hub routes
- Structural comparison: header/breadcrumb/toolbar/table-or-board skeleton, row structure, row heights, portal roots, JiraTable authenticity (data-testid `jira-table.*`, role=grid/row/gridcell vs bare `<table>`/div-grid).

## Files inspected

None (live-DOM probe agent — no source files read; this report + screenshots are the only artifacts).

## Routes inspected (24)

| # | Route | HTTP/render state |
|---|---|---|
| 1 | /project-hub/BAU/backlog | OK (slow ~5s first load) |
| 2 | /project-hub/BAU/dashboard | OK |
| 3 | /project-hub/BAU/allwork | OK but issue dialog auto-open (see High-risk #6) |
| 4 | /project-hub/BAU/timeline | OK |
| 5 | /project-hub/BAU/sprints | OK |
| 6 | /project-hub/BAU/dependencies | OK |
| 7 | /project-hub/BAU/filters | OK |
| 8 | /release-hub/overview | OK |
| 9 | /release-hub/releases-management | OK (3 rows data) |
| 10 | /release-hub/release-kanban | OK — empty board state |
| 11 | /release-hub/work | OK — empty state |
| 12 | /release-hub/timeline | OK — renders but no grid structure found |
| 13 | /release-hub/changes | OK — empty state |
| 14 | /testhub/dashboard | OK |
| 15 | /testhub/repository | OK (11 rows) |
| 16 | /testhub/cycles | OK (1 row) |
| 17 | /testhub/defects | OK (2 rows) |
| 18 | /testhub/board | OK — empty board state |
| 19 | /testhub/reports | Redirects to /testhub/reports/sprint-testing-status — OK |
| 20 | /incident-hub/dashboard | OK |
| 21 | /incident-hub/all-incidents | OK (14+ rows) |
| 22 | /incident-hub/board | OK (5 columns, populated) |
| 23 | /incident-hub/work | OK (populated list) |
| 24 | /incident-hub/timeline | OK — empty state ("Nothing scheduled yet") |

No 404s.

## Screenshots captured

One per hub via `computer screenshot save_to_disk:true`. **Caveat:** the Chrome MCP stores saved screenshots inside the browser-extension host; a full-disk search on this machine found no corresponding files, so they could not be copied into `docs/catalyst-ui-convergence/screenshots/`. The capture IDs below are the in-session evidence references (images were visually inspected during the probe):

| Hub | Capture ID | Content |
|---|---|---|
| Project Hub | `ss_5368oekzv` | /project-hub/BAU/backlog (caught in loading-spinner state; shell + sidebar visible) |
| Release Hub | `ss_58154x8k8` | /release-hub/overview — custom KPI dashboard, "Releases / Dashboard" breadcrumb |
| Test Hub | `ss_0869uz4eh` | /testhub/dashboard — project-dashboard-shell with widgets |
| Incident Hub | `ss_6710ndyfa` | /incident-hub/dashboard — project-dashboard-shell with widgets |
| (extra) | `ss_3283p1fwn` | /incident-hub/timeline empty state |

A re-capture pass with a screenshot tool that writes to the repo path is recommended (see Open questions).

## Findings count

**19 findings** (7 canonical baselines, 8 structural divergences, 4 structural matches/reuse wins).

---

## Canonical Project Hub baseline (measured)

Global shell — identical on every route in every hub:
- `header` (top bar): 1668×56 px at (0,0)
- Breadcrumb `nav[aria-label*="Breadcrumb"]`: h=21 px, y≈66–94 (varies with page-header composition)
- Portal roots always present: `.atlaskit-portal-container` + 2–4 `.atlaskit-portal` (0-height when idle), at document end

Per-surface skeletons:

| Surface | Structure | Key measurements |
|---|---|---|
| backlog | **Real JiraTable**: native `<TABLE>`, `data-testid="jira-table.row.expand-button"` on rows, `tbody tr` rows are drag targets (`[data-drop-target-for-element]` on TR) | TR 1337×**39 px**; 14 rows; table starts x=269 |
| dashboard | `[data-testid="project-dashboard-shell"]` | 1388×1450 at (244,80) |
| allwork | `[data-testid="catalyst-allwork-toolbar.bar"]` + `allwork-pagination-count`; list is div-based (no `<table>`, no role=grid) | toolbar 1448×53 at (220,116), 2 buttons + 1 input; pagination span at y=867 |
| timeline | Custom Gantt: right pane `[role="grid"]`, left lane column of `[role="rowheader"]` (drag targets), bottom-right `[role="toolbar"]` zoom cluster | grid 885×664 at (783,198); data rows **52 px**; header row 57 px; toolbar 429×41 at (1215,829); 24 role=rows |
| sprints | Native `<TABLE role="grid">`, **no** `jira-table.*` testids | 1351×270 at (269,192); TR **46 px**; 5 rows |
| dependencies | React Flow canvas: `rf__wrapper`, `rf__node-BAU-2221` … | graph nodes, no table/rows |
| filters | Native `<TABLE role="grid">`, no `jira-table.*` testids | 1399×94 at (245,215); TR **54 px** |

> Note: the canonical hub itself is not internally uniform — three different row heights (39 / 46 / 54 px) and only backlog carries genuine `jira-table.*` testids.

---

## Destination hubs — per-route structural summary & verdicts

### Release Hub

| Route | Skeleton found | Verdict vs Project Hub equivalent |
|---|---|---|
| /overview | KPI-card dashboard; `testidCount=1` (only `catalyst-theme-toggle`); **no** `project-dashboard-shell` | **DIVERGES** from PH dashboard — hand-rolled dashboard layout (Test Hub and Incident Hub both reuse the shell; Release Hub does not) |
| /releases-management | Native `<TABLE>` **role=null** (not grid), rows **52 px, 52 px, 66 px** (mixed), zero testids, no `jira-table.*` | **DIVERGES** — custom table: missing grid role, 52/66 px rows vs canonical 39 px, inconsistent row heights within one table |
| /release-kanban | Shared board shell, empty state text "Your board is empty \| Create an issue to get started", h2 "Release board"; no columns render when empty | **MATCHES** shared board component (identical empty-state DOM/text as /testhub/board) — cannot compare column/card anatomy while empty |
| /work | `catalyst-allwork-toolbar.bar` 1388×53 at (244,**80**) + `allwork-empty-state` + `releases-work-layout` | **MATCHES** PH allwork skeleton (same toolbar component). Divergence: toolbar sits at y=80 vs 116 (no breadcrumb row above it — breadcrumb element absent on this route) |
| /timeline | No `[role=grid]`, no rowheaders, no toolbar, testidCount=1 | **DIVERGES** — the PH timeline Gantt structure (role=grid + rowheader lanes) is entirely absent; page renders nav shell only |
| /changes | Div list: container 1400×408 at (244,80), 4 children ≈**36 px** each (filter-chip row + empty state); headings "Changes"/"No change records yet"; no table semantics | **DIVERGES** — hand-rolled list surface, no table/grid role, no toolbar testid |

### Test Hub

| Route | Skeleton found | Verdict |
|---|---|---|
| /dashboard | `project-dashboard-shell` + `dashboard-fullscreen` + `dashboard-edit-layout` | **MATCHES** PH dashboard — same canonical shell |
| /repository | Left tree panel (~x 220–460) + `<TABLE role="grid">` 1207×458 at (461,138); TR **38 px**; no `jira-table.*` testids | **NEAR-MATCH** — grid-role table, but 38 px vs 39 px canonical rows and missing JiraTable testids → different table component |
| /cycles | `<TABLE role="grid">` 1768×78 at (245,141) — note width 1768 > viewport (horizontal scroll); TR **38 px** | **NEAR-MATCH** — same family as repository; overflow-wide table diverges from canonical fixed-width 1337–1399 px tables |
| /defects | `<TABLE role="grid">` 1350×117 at (269,154); TR **39 px**; `status-lozenge-dropdown-trigger`, `work-type-icon--qa-bug` in rows | **MATCHES** canonical row anatomy most closely of all TestHub tables (exact 39 px + lozenge trigger) |
| /board | Shared board shell, empty ("Your board is empty") | **MATCHES** shared board component (same as release-kanban) |
| /reports | Redirect to sprint-testing-status; report layout with left report-nav (content x=465); `<TABLE role="grid">` 1360×164 at (465,732); first TR **124 px**, subsequent TRs **38 px** | **N/A** (no PH equivalent) — table family same as repository/cycles (38 px, no jira-table testids) |

### Incident Hub

| Route | Skeleton found | Verdict |
|---|---|---|
| /dashboard | `project-dashboard-shell` 1400×628 at (244,80) + fullscreen/edit-layout buttons | **MATCHES** PH dashboard shell |
| /all-incidents | `<TABLE role="grid">` 1289×**5701** at (293,178); TR **39 px** exactly; `status-lozenge-dropdown-trigger`, `work-type-icon--production-incident`; 107 buttons, 16 inputs on page | **MATCHES** canonical 39 px row anatomy; anomaly: table bounding height 5701 px vs only 14 `tbody tr` matched (grouped sections/virtualization suspected — see Open questions) |
| /board | 5-column kanban: container 976×718 at (244,168), headings TODO / BLOCKED / IN PROGRESS / ARCHIVED / +; droppable column `[data-drop-target-for-element][role="list"]` 272×621; cards are plain divs (0 `[data-rbd-draggable-id]`, 0 `[data-testid*="card"]`) | **PARTIAL** — uses pragmatic-dnd drop targets like PH backlog, but card elements carry no testids/draggable ids the way PH rows do |
| /work | `catalyst-allwork-toolbar.bar` 1388×53 at (244,116) + `allwork-pagination-count` + `incident-work-layout` + populated list (154 buttons) | **MATCHES** PH allwork — same shared component, same toolbar y=116 as PH |
| /timeline | Empty state "Nothing scheduled yet"; no role=grid / rowheader / toolbar in DOM | **UNVERIFIABLE while empty** — unlike release-hub/timeline it shows a proper empty state, but whether the populated state uses the PH Gantt grid could not be confirmed from DOM |

---

## High-risk findings

1. **`/release-hub/releases-management` custom table** — `<table>` with `role=null`, mixed 52/66 px row heights, zero data-testids. Only looks similar to canonical tables; structurally it is a different, semantics-poor implementation (evidence: table at (268,191) 1352×205; TRs 52, 52, 66 px).
2. **`/release-hub/overview` hand-rolled dashboard** — does not use `project-dashboard-shell` while both Test Hub and Incident Hub dashboards do. Release Hub is the only destination that forked the dashboard skeleton (`testidCount=1` vs 4 on the shell-based dashboards).
3. **`/release-hub/timeline` has no timeline structure at all** — PH timeline exposes `role=grid` (885×664) + 24 `role=row` + `role=rowheader` lanes; the release timeline page renders none of these.
4. **`/release-hub/changes` div-list surface** — 36 px div items, no table/grid role, no toolbar testid; structurally unrelated to any canonical list.
5. **TestHub table family (repository/cycles/reports) is a lookalike, not JiraTable** — role=grid but 38 px rows (canonical backlog = 39 px) and no `jira-table.*` testids; `/testhub/cycles` table additionally overflows the viewport (w=1768).
6. **Allwork issue dialog persistence** — navigating to `/project-hub/BAU/allwork` auto-opened the BAU-4771 issue `role=dialog` (1080×746 at (588,169)); it survived route changes and an Escape keypress. Blocked structural measurement of the PH allwork list body and is a likely UX bug (state restored from persisted modal state).
7. **Incident board cards lack identity attributes** — populated kanban cards have no `data-testid` and no draggable ids, unlike PH backlog rows which are drag targets with `jira-table.*` testids.

## Structural reuse wins (convergence already achieved)

- `catalyst-allwork-toolbar.bar` + `allwork-pagination-count` + `allwork-empty-state`: shared by PH /allwork, /release-hub/work, /incident-hub/work.
- `project-dashboard-shell` (+ `dashboard-fullscreen`, `dashboard-edit-layout`): shared by PH /dashboard, /testhub/dashboard, /incident-hub/dashboard.
- Board shell with identical empty-state DOM ("Your board is empty"): /testhub/board, /release-hub/release-kanban, (populated variant) /incident-hub/board.
- Global chrome (56 px header, breadcrumb nav, atlaskit portal roots) identical across all 24 routes.

## Evidence references

| Route | Selector | Measured value |
|---|---|---|
| /project-hub/BAU/backlog | `tbody tr` (drag target, `jira-table.row.expand-button` inside) | 1337×39 px, 14 rows |
| /project-hub/BAU/allwork | `[data-testid="catalyst-allwork-toolbar.bar"]` | 1448×53 at (220,116) |
| /project-hub/BAU/allwork | `[role="dialog"]` (BAU-4771, auto-open) | 1080×746 at (588,169) |
| /project-hub/BAU/timeline | `[role="grid"]` / `[role="row"]` / `[role="toolbar"]` | 885×664 at (783,198) / 52 px rows / 429×41 at (1215,829) |
| /project-hub/BAU/sprints | `table[role="grid"] tr` | 46 px |
| /project-hub/BAU/filters | `table[role="grid"] tr` | 54 px |
| /project-hub/BAU/dependencies | `[data-testid="rf__wrapper"]`, `rf__node-BAU-2221` | React Flow canvas |
| /release-hub/releases-management | `table` (role=null) `tr` | 52 / 52 / 66 px, testidCount=1 |
| /release-hub/work | `[data-testid="catalyst-allwork-toolbar.bar"]` | 1388×53 at (244,80) |
| /release-hub/changes | largest repeating div container | 1400×408 at (244,80), items 36 px |
| /testhub/repository | `table[role="grid"]` | 1207×458 at (461,138), TR 38 px |
| /testhub/cycles | `table[role="grid"]` | w=1768 (viewport overflow), TR 38 px |
| /testhub/defects | `table[role="grid"] tr` + `status-lozenge-dropdown-trigger` | 39 px |
| /testhub/reports/sprint-testing-status | `table[role="grid"] tr` | 124 px first row, 38 px rest |
| /incident-hub/all-incidents | `table[role="grid"]` | 1289×5701 at (293,178), TR 39 px |
| /incident-hub/board | column container / `[data-drop-target-for-element][role="list"]` | 976×718 at (244,168), 5 cols; column 272×621 |
| /incident-hub/work | `[data-testid="catalyst-allwork-toolbar.bar"]` | 1388×53 at (244,116) |
| all routes | `header` | 1668×56 at (0,0) |

## Confidence level

**Medium-high.** Measurements are from real rendered DOM (not source inference). Confidence reducers: (a) 4 destination surfaces were in empty-data states (release kanban/work/changes, testhub board, incident timeline) so populated-state anatomy is unverified; (b) PH allwork list body was occluded by the persistent issue dialog; (c) screenshots exist only as in-session capture IDs, not repo files.

## Open questions

1. Why does `/project-hub/BAU/allwork` auto-open the BAU-4771 dialog on plain navigation, and why does Escape not close it? (Persisted modal state? Route param restore?)
2. `/incident-hub/all-incidents` table bounding box is 5701 px tall but only 14 `tbody tr` matched — grouped multi-tbody sections or non-virtualized long list? Needs a targeted probe.
3. Do `/incident-hub/timeline` and `/release-hub/timeline` render the PH Gantt (`role=grid` + rowheaders) once data exists, or are they separate implementations? Requires seeded data.
4. Is the TestHub 38 px row (vs canonical 39 px) a `density` prop difference on the same component, or a fork? One-pixel delta suggests shared CSS with different border accounting — needs source-level confirmation (out of scope for this DOM-only probe).
5. Screenshot files: Chrome MCP `save_to_disk` output is not reachable from the host FS; re-capture via a host-side tool is needed to fill `docs/catalyst-ui-convergence/screenshots/`.
