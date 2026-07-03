# DATE SOURCES

> No date is assumed. Every date used in any trend/burndown/aging/SLA/readiness/risk calc must name
> its exact source column. If source missing/ambiguous → STOP, ask, do not calculate.

**CLOSED 2026-07-03** by CAT-REPORTS-HUB-20260703-001 Phase 0 — real queries against staging cyij.
Full evidence + volumes: `features/CAT-REPORTS-HUB-20260703-001/PHASE0_DATA_CONTRACT_PROOF.md`.

| Date concept | Used by report | Source table.column | State |
|--------------|----------------|---------------------|-------|
| Sprint start | sprint burndown, sprint health | ph_jira_sprints.start_date | PROVEN (3/4) |
| Sprint end | sprint risk | ph_jira_sprints.end_date | PROVEN (3/4) |
| Release start | release timeline | releases.start_date | WIRED-EMPTY (0 rows; rh_releases=1) |
| Release end / planned | release readiness | releases.release_date | WIRED-EMPTY |
| Release actual | post-release | releases.actual_release_date | WIRED-EMPTY |
| Test case created | case usage/age | tm_test_cases.created_at | PROVEN (41/41) |
| Test case approved | coverage readiness | — (no approved_at) | MISSING → cut approval-age |
| Test execution date | execution trend/history | tm_test_runs.started_at / completed_at | PROVEN (sparse: 13 runs) |
| Defect created | defect trend, aging | ph_issues.jira_created_at (QA Bug, 791) + tm_defects.created_at | PROVEN |
| Defect closed | closure rate | tm_defects.resolved_at (0 pop.); ph: none (changelog empty) | MISSING → closure trend cut/tm-only |
| Incident reported | incident trend | ph_issues.jira_created_at (Production Incident, 152) | PROVEN |
| Incident resolved | incident MTTR | — (changelog empty, incidents table 0 rows) | MISSING → MTTR cut |
| Story → QA date | governance mismatch | ph_issues.changelog | MISSING (0/2365 have changelog) |
| Story → Done date | governance mismatch | ph_issues.changelog | MISSING |
| Retest date | verification gap | tm_test_runs.run_number>1 + started_at | PROVEN (derivable) |

Extra proofs: sprint membership = sprint_release JSONB (813 tagged, 58 names); story_points = 0 populated → count-based burndown only; status_category = todo/in_progress/done PROVEN; staging ph_issues has NO assignee_user_id (account_id + display_name only).

_No trend/aging report may be built on a MISSING row. MISSING rows revisit only after a status-history capture decision (Phase 4)._
