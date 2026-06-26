# 09 — DECISIONS

| # | Decision | Choice | Date | By |
|---|---|---|---|---|
| D1 | Defects surface model | **QA-bug Jira view** — defects = project work items type=QA bug, JiraTable + project filter; raise/link from execution creates/links a project QA-bug; `tm_defects` demoted to link/association only | 2026-06-26 | Vikram |
| D2 | Broken `sync_jira_bug_to_defect` trigger | **Drop the trigger** (migration on cyij); project QA-bug work items are single source of truth for defects | 2026-06-26 | Vikram |
| D3 | Fresh seed shape | **Curated realistic** (~1-2 projects, ~6 folders, ~40 cases, 2 sets, 3 cycles fully scoped, real runs/step results/evidence, defects→real QA bugs, traceability→stories/epics). Wipe `tm_*` test data only; never `ph_issues`/`profiles`/`releases` | 2026-06-26 | Vikram |
| D4 | Detail UI standard | **Canonical CatalystViewBase** / CatalystDetailRouter; migrate CaseDrawer into it | 2026-06-26 | Vikram |
| D5 | Work-item / defect source table | **RESOLVED → `ph_issues`.** ph_issues = 2381 rows, **791 bug-type across 11 projects**, keyed by `project_key` (108 code refs). ph_work_items (1366) has 0 bug-type rows = wrong table. Defects view reads ph_issues filtered to bug/qa-bug/defect + project filter | 2026-06-26 | probe |
| D7 | Aiden Validation Block | **OFF for this feature** — do not append the Aiden Validation Block to responses in CAT-TESTHUB-ENGINE-20260626-001 (overrides CLAUDE.md) | 2026-06-26 | Vikram |
| D6 | Acceptance precedence | AioTests **product docs** are canonical; impl-spec embellishments (Skipped status, bare hex, cycle deps/milestones/scope-lock/templates/version-bump, first-class build/env) are NOT acceptance criteria unless re-approved | 2026-06-26 | derived |
