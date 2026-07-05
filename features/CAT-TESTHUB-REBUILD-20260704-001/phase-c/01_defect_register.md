# TestHub Production Defect Register (74 catalogued, effective 300+ via recurring split)

## ROOT CAUSE (fix first — cascades)
**Seed-vs-real project split.** Operational surfaces (Dashboard, Repository, Cycles, My Work, Defects, Board) render a DEMO/seed project (12 TC-### cases, 1 DEMO CYC-001, 2 DEF-###) while Reports + Timeline read real "Senaei BAU" (703 BAU-#### defects, RVCYC-001/002/003). Mechanism: RepositoryPage:570-571 `useProjects()` then `projects[0]?.id` = first tm_projects row = demo. One wiring bug -> most "wrong data/empty/linkage" defects. Fixing project scoping cascades D001/D002/D003/D017/D031/D038/D051/D052/D057.

## P0 (blockers)
- D001 Dashboard "Active test cycles" infinite spinner.
- D002 dashboard_widget_config FK violation x2 (DashboardWidgetGrid:148; TestHub reuses ProjectDashboardPage w/ synthetic project id).
- D017 Cycles list hides real RVCYC-001/002/003 (wrong project scope).
- D038 Defects page reads seed tm_defects (2) not 703 real BAU defects.
- D051 Reports 703 vs Defects 2 - source split.
- D052 "703 OPEN" false - CLOSED/REJECTED counted open (DefectSummaryBody bucketing).

## P1 (major)
- D005 Command Center pulse widget floats center overlapping content on EVERY route (global overlay mount).
- D006 Repository hand-rolled native table not JiraTable. D007 status text spans not Lozenge.
- D008/D039 dual key formats TC-0001 vs TC-001, DEF-00001 vs DEF-002 (tm_next_entity_key padding).
- D018 Cycles table clipped. D019 native select Sprint/Owner, D020 native date inputs, D021 no sprints load, D023 hardcoded "TESTHUB" projectKey in route.
- D024 emoji buttons in cycle scope. D025 scope table clipped. D028 runner doesn't auto-load first case.
- D031 My Work dumps all 12 unassigned not user's items. D032 status vocab "IN REVIEW" vs "REVIEW".
- D034 emoji "Static" pin in Sets.
- D041 defect detail starred-items error x2 (useStarredItems:26). D043 no linkage back to originating case/run.
- D047 breadcrumb dup. D048 sprint picker stuck "Loading sprints". D049 execution-overview chart 0-size blank.
- D054 timeline empty-state overlays populated rows. D057 board empty despite data. D059 dependencies raw UUID as title.
- D063 admin priorities plain-text Edit/Delete. D065 case-types icon column prints icon NAME. D068 permissions matrix all-unchecked incl admin. D069 custom checkbox glyphs.
- D070 dark-mode pastel pills low contrast.

## P2 (polish)
D004,D009-D016,D022,D026,D027,D029,D030,D033,D035,D036,D037,D040,D042,D044,D045,D046,D050,D053,D055,D056,D058,D060,D061,D062,D064,D066,D067,D071,D072,D073,D074 (full text in task transcript).

## Per-surface counts
Dashboard 6, Repository 11, Cycles 6, CycleDetail 5, Runner 3, MyWork 3, Sets 4, Defects 7, Traceability 2, Reports 7, Timeline 3, Board 2, Dependencies 2, Filters 2, Admin(4) 7, Dark 3, Global 2.
