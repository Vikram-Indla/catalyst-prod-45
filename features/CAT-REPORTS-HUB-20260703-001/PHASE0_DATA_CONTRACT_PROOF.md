# PHASE 0 — DATA CONTRACT PROOF (S0.1 + S0.2 + S0.3)

**Executed:** 2026-07-03, read-only SQL against staging `cyijbdeuehohvhnsywig` (verified via MCP get_project_url before queries).
**Rule:** a date/field is PROVEN only if the column exists AND is populated. Column-exists-but-empty = WIRED-EMPTY (usable for wiring, renders sparse). No column or no data path = MISSING (report cut or degraded; zero-assumption law — render nothing, never fake).

## S0.1 — DATE_SOURCES closure

Measured volumes: ph_issues 2,365 (791 QA Bug/Defect, 152 Production Incident, 813 sprint-tagged, 58 distinct sprint/release names); ph_jira_sprints 4 (3 dated); releases 0 rows; rh_releases 1; incidents (native) 0 rows; tm_test_cases 41, tm_test_cycles 3, tm_test_runs 13 (1 completed), tm_defects 4; tm_requirement_links 20; ph_issue_links 23; ph_workflow_statuses 44 (categories exactly `todo, in_progress, done`).

| Date concept | Source | State | Evidence |
|---|---|---|---|
| Sprint start | `ph_jira_sprints.start_date` | **PROVEN** | 3/4 sprints populated |
| Sprint end | `ph_jira_sprints.end_date` (also target_date) | **PROVEN** | 3/4 populated |
| Release start | `releases.start_date` | **WIRED-EMPTY** | column exists, 0 rows in `releases`; `rh_releases` has 1 row — release reports degrade to rh_* or hide |
| Release end/planned | `releases.release_date` / `rh_releases` | **WIRED-EMPTY** | as above |
| Release actual | `releases.actual_release_date` | **WIRED-EMPTY** | as above |
| Test case created | `tm_test_cases.created_at` | **PROVEN** | 41/41 |
| Test case approved | — no `approved_at`; status enum only | **MISSING** | cut "approval age"; coverage readiness uses current status only |
| Test execution date | `tm_test_runs.started_at`/`completed_at` | **PROVEN (sparse)** | 13 runs, 1 completed — wiring valid, data thin |
| Defect created | `tm_defects.created_at` (4) + `ph_issues.jira_created_at` for QA Bugs (791) | **PROVEN** | ph-side is the volume source |
| Defect closed | `tm_defects.resolved_at` (0 populated); ph side: `resolution` only 86/2365, **no resolved-date column, changelog empty 0/2365** | **MISSING (ph) / WIRED-EMPTY (tm)** | closure-rate trend cut or tm-only; `jira_updated_at` is NOT a closure date — do not fake |
| Incident reported | `ph_issues.jira_created_at` WHERE issue_type='Production Incident' | **PROVEN** | 152 rows. Native `incidents` table = 0 rows → all incident reporting runs on ph_issues for now |
| Incident resolved | — | **MISSING** | no transition dates (changelog empty); MTTR cut until status-history capture exists |
| Story → QA date | `ph_issues.changelog` | **MISSING** | changelog empty on all 2,365 rows |
| Story → Done date | `ph_issues.changelog` | **MISSING** | same |
| Retest date | `tm_test_runs.run_number > 1` + started_at | **PROVEN (derivable)** | schema supports; sparse |

**Additional proofs:**
- Sprint membership: `ph_issues.sprint_release` JSONB — PROVEN (813 rows, 58 names). Burndown **by count only**: `story_points` populated on **0 rows** — no points-based burnup/burndown; render count-based, label accordingly.
- Status canonicality: `status_category` ∈ {todo, in_progress, done} on ph_issues + 44 `ph_workflow_statuses` — PROVEN. UI maps category→Lozenge; never the hex `color` column.
- Assignee: staging ph_issues has **only** `assignee_account_id` + `assignee_display_name` (no `assignee_user_id` FK — types file drift vs staging). People reports: tm_* side joins `assigned_to`→profiles (avatars OK); ph-side people views get display-name + CatalystAvatar initials fallback only.

## S0.2 — Gap verdicts

| Gap (from council) | Staging reality | Verdict |
|---|---|---|
| `ph_issue_links` missing | **EXISTS** (source_id, target_id, link_type; 23 rows) | NO DDL. Consume in UI; optional raw_json backfill = Phase 4 nice-to-have |
| `tm_test_cycles`↔sprint/release | **Columns EXIST** (`sprint_id`, `release_id`, 0 populated) + `rh_release_test_cycle_links` table exists | NO DDL. Populate on cycle create/edit (Phase 2 Lane B wiring task) |
| defect→release | `tm_defects.fix_version` + `sprint_id` exist; ph defects via `sprint_release` | DERIVE. No DDL |
| incident→root-cause work item | `incidents.root_cause`/`converted_to_*` exist but table empty; ph incidents have `parent_key` | Use `parent_key` on ph_issues now. Native incidents adoption = separate feature, out of scope |
| `tm_defects.linked_work_item_id` (Lab UNKNOWNS) | Does not exist; **`tm_defects.parent_key` exists** | Use `parent_key`. Lab defect-impact report unblocked |
| Transition dates (all) | changelog empty everywhere | **Only true DDL candidate:** status-history capture table (Phase 4 decision). Until then: cut MTTR/closure-trend/governance-timing |
| U-005 coverage denominator | stories = ph_issues issue_type='Story' per project (standalone reports already use this) | CLOSED — coverage = linked stories / total stories via tm_requirement_links.external_key |
| U-009 QA team derivation | tm assigned_to→profiles | CLOSED for tester/team reports |

**Data-volume caveat:** tm_* is near-empty (41/3/13/4). Wiring Lane B validates correctness, not visual richness. Demo richness → REVAMP-DEMO seed (exists per prior feature) on staging only, never prod.

## S0.3 — Report disposition matrix (survivors)

| # | Report (registry id) | From | Data source | Status |
|---|---|---|---|---|
| 1 | execution-overview | Lab | tm_test_runs + tm_cycle_scope | WIRE |
| 2 | execution-summary | Lab | tm_test_runs per cycle | WIRE |
| 3 | execution-burndown | Lab | tm_cycle_scope counts + runs over time | WIRE (count-based) |
| 4 | execution-burnup | Lab | same | WIRE |
| 5 | execution-distribution | Lab | tm_test_runs.status | WIRE |
| 6 | execution-history | Lab | tm_test_runs | WIRE |
| 7 | case-distribution | Lab | tm_test_cases × priority/type | WIRE |
| 8 | case-usage | Lab | tm_cycle_scope frequency | WIRE |
| 9 | defect-summary | Lab ⊕ standalone Defects | ph_issues QA Bugs (791) + tm_defects | MERGE+WIRE |
| 10 | defect-impact | Lab | tm_defects.parent_key → ph_issues | WIRE |
| 11 | defect-trend | Lab | jira_created_at trend only; closure line CUT (no closure date) | WIRE (degraded, labeled) |
| 12 | multi-cycle-comparison | Lab | tm cycles | WIRE |
| 13 | multi-cycle-summary | Lab | tm cycles | WIRE |
| 14 | multi-cycle-detail | Lab | tm_cycle_scope × cycles | WIRE |
| 15 | multi-cycle-distribution | Lab | same | WIRE |
| 16 | project-testing-status | standalone ⊕ Lab project-overview/metrics/activity | existing useProjectTestingStatus | PORT+MERGE (3 Lab reports fold in) |
| 17 | sprint-testing-status | standalone | useSprintTestingStatus (sprint_release JSONB + ph_jira_sprints dates) | PORT |
| 18 | tester-performance | standalone | useTesterPerformance | PORT |
| 19 | team-performance | standalone | useTeamPerformance | PORT |
| 20 | governance | standalone | useGovernance (status-based — no dates needed) | PORT |
| 21 | product-status | standalone | useProductStatus | PORT |
| 22 | traceability-summary | Lab | tm_requirement_links (20 rows) | WIRE |
| 23 | traceability-detail | Lab | req→case→run→defect chain | WIRE |
| — | defects-incidents (standalone) | — | — | **SPLIT**: defect half → #9; incident half → Incident Hub report (ph_issues type='Production Incident', 152 rows) |
| — | Lab project-overview/metrics/activity | — | — | MERGED into #16 |
| CUT | incident MTTR, closure-rate trend, approval-age, points burndown, any transition-date report | — | no data path | Revisit after Phase 4 status-history decision |

**Net: 23 registry entries + 1 Incident Hub report. ReportDetailPage's 22 types map onto these (no survivors outside the matrix).**
