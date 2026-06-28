# RELATIONSHIP MAP

> State: PROVEN (evidence) / ASSUMED (don't use) / ASKED / CONFIRMED (user decided).
> Updated from D8/D9 schema probe on cyij (2026-06-27).

| Rel ID | From → To | State | Evidence | Notes |
|--------|-----------|-------|----------|-------|
| R-01 | Project → Release | PROVEN | ph_releases.project_id | |
| R-02 | Project → Sprint | PROVEN | ph_jira_sprints.project_id | |
| R-04 | Release → Sprint | **ABSENT** | no FK either direction | Q-003 — derive or add |
| R-06 | Sprint → Story | PARTIAL | ph_work_items.sprint_id; ph_issues.sprint_name (text) | Q-002 which source |
| R-05 | Release → Story | PARTIAL | ph_work_items.release_id; ph_issues.fix_versions (text) | |
| R-09 | Work item → parent | PROVEN | ph_work_items.parent_id; ph_issues.parent_key | hierarchy_path/hierarchy_level |
| R-10 | Story → Test Case | PROVEN(model) | tm_requirement_links(test_case_id→external_key); tm_test_case_links(polymorphic) | data sparse |
| R-15 | Test Case → Execution | PROVEN(model) | tm_test_runs, tm_cycle_scope.test_case_id | 1 run only |
| R-16 | Execution → Cycle | PROVEN(model) | tm_cycle_scope.cycle_id | |
| R-12/13 | Defect → Test | PROVEN(model) | tm_defects.source_test_case_id / source_test_run_id | 1 defect |
| R-19/20 | Tester → Case/Exec | PROVEN(model) | tm_test_cases.assigned_to; tm_cycle_scope.assigned_to | |
| TC → Sprint (direct) | Test Case → Sprint | PROVEN(col) | tm_test_cases.sprint_id | optional, sparse |
| TC → Release (direct) | Test Case → Release | PROVEN(col) | tm_test_cases.release_id, release_version_id | optional, sparse |

> "PROVEN(model)" = columns/links exist but data near-empty; relationship structurally supported, unexercised.
