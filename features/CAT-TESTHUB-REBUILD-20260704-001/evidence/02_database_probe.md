# Evidence — Database Probe (staging cyijbdeuehohvhnsywig, VERIFIED 2026-07-04)

## Headline
- **55 tm_* base tables** (audit claimed 31). 22 have zero rows.
- 9 views, **87 tm_* RPCs**, 34 triggers, 8 enums. LTREE v1.3 live on tm_folders.path.
- Migration drift: 3 repo files NOT applied to staging (tm_defect_status_history, tm_coverage_history, tm_defect_key_normalize) + v_tm_requirement_coverage applied out-of-band (no ledger row).
- RLS in 3 inconsistent generations; tm_release_signoffs/tm_signoff_templates fully open; tm_permissions/tm_roles writable by any authed user.
- 28 th_* legacy tables remain (22 empty; 6 with residual seed rows).

## Key row counts
tm_test_cases 104 (46 cols) · tm_test_steps 88 · tm_cycle_scope 61 · tm_requirement_links 56 · tm_test_runs 54 · tm_defects 15 (50 cols) · tm_folders 6 · tm_test_cycles 4 (26 cols) · tm_test_plans 2 (39 cols)
Zero-row (22): tm_ai_usage_log, tm_attachments, tm_audit_logs, tm_case_labels, tm_comments, tm_cycle_assignments, tm_cycle_milestones, tm_environments, tm_gate_templates, tm_gherkin_steps, tm_labels, tm_plan_scope, tm_plan_team, tm_plan_versions, tm_run_case_assignments, tm_run_templates, tm_saved_reports, tm_signoff_templates, tm_step_definitions, tm_test_attachments, tm_test_case_versions, tm_test_plan_cases.

## Existence answers (master prompt §7)
- tm_case_versions: NO — real name is tm_test_case_versions (0 rows, triggers/RPCs exist, loop unproven)
- tm_saved_reports: YES (0 rows)
- tm_notification_settings: NO; no tm_notifications table; tm_notification_type enum orphaned
- tm_scenarios: NO — Gherkin cols on tm_test_cases + tm_gherkin_steps (empty)
- linked_work_item_id on tm_test_cases: NO — instead linked_story_key (text), tm_test_case_links (polymorphic, 1 row), tm_requirement_links (56 rows — live coverage mechanism), sprint_id, release_id
- tm_defects: parent_key YES; ADF cols YES (description/expected_result/actual_result_adf); sprint_id, workflow_status_key, epic_link, source_test_run_id/case_id/plan_id, auto_created
- tm_defect_links: FKs only to tm_ entities; loose polymorphic link_type/linked_id (no FK) added 20260703083947 — CAN address incidents/work items by convention only; incident side uses incident_work_items instead
- LTREE: YES, working (path ltree + depth + case_count + circular guard)
- Cascade: tm_step_results_percolate + cycle counter triggers + trg_tm_auto_create_defect (run failure → auto defect) + version pinning at scope-add + immutable step snapshots + cycle status transition validation

## Views
v_tm_cycle_progress, v_tm_execution_by_assignee, v_tm_my_work, v_tm_requirement_coverage, v_tm_test_cases_full, v_tm_test_cycle_list_metrics, v_tm_traceability_summary, tm_folders_with_counts, tm_users.

## RPC families (87)
Steps CRUD/reorder/clone · versioning (snapshot/restore/history) · cycles (bulk add, recalc counters, compare, 9 analytics) · plans (stats/burndown/analytics) · release gates (evaluate/waive/readiness/signoff) · requirements (tm_link_requirement, tm_get_traceability_matrix) · keys (tm_next_entity_key) · BDD (convert_to_bdd, save_gherkin_scenario, step suggestions) · auth (tm_user_has_access).

## Enums
tm_case_status(draft/ready/approved/deprecated) · tm_cycle_status(planned/active/completed/archived — note: 'active' not 'in_progress') · tm_defect_severity(blocker/critical/major/minor/trivial) · tm_defect_status(open/in_progress/resolved/closed/reopened) · tm_execution_status(not_run/in_progress/passed/failed/blocked/skipped) · tm_test_plan_status · tm_audit_action · tm_notification_type(orphaned).

## RLS generations
1. Proper: tm_user_has_access(auth.uid(), project_id) — tm_test_cases, tm_defects, tm_test_cycles, tm_cycle_scope, tm_test_runs, tm_step_results
2. Blanket authenticated-true: tm_test_plans, tm_plan_*, tm_cycle_assignments, tm_release_* gates/readiness, tm_permissions, tm_roles (any authed user can mutate roles/permissions)
3. current_user_is_approved() global: tm_test_sets, tm_gherkin_steps, tm_requirement_links, tm_run_templates
Open (public-true): tm_release_signoffs, tm_signoff_templates. Duplicate policy sets: tm_test_case_links.

## Integration tables
- ph_issues: 62 cols (issue_key, project_key, issue_type, status_category, parent_key, sprint_id, sprint_release JSONB, fix_versions, incident_key, workflow_status_key, sla_record_id, description_adf, deleted_at)
- ph_issue_status_history: EXISTS (delivery status capture live)
- incidents (46 cols, incident_key, severity, ph_issue_id, converted_to_*) + 14 incident_* satellites incl. incident_work_items; legacy ph_incidents AND production_incidents also exist (3 incident generations)
- releases: heavily test-aware (test_cases_total/passed/executed/failed/blocked/skipped, defects_open, blocker..minor_defects, coverage_percent, stories_with_tests, total_gates, passing_gates, health_score) — synced by tm_ triggers
- sprints: minimal (id, project_id, name, status, slug); iterations: separate PI/team model; business_request_links: polymorphic

## Duplicate/dead families
- tm_audit_log vs tm_audit_logs (both exist, different shapes)
- tm_attachments vs tm_test_attachments (both exist)
- th_*: 28 tables; only th_app_settings(7), th_environments(5), th_report_templates(5), th_tags(16), th_test_cycles(6), th_cycle_key_sequence(1) have rows

## Schema gaps (enterprise needs absent)
1. No notification infra (orphaned enum only)
2. No real shared-step library (cols exist, no entity; tm_step_definitions empty)
3. No automation-run bridge (cols dangle)
4. No tm_datasets despite tm_test_runs.dataset_id references (dangling design)
5. Defect→work-item/incident linkage convention-only (no FK, no usage)
6. Versioning half-wired (0 rows in both version tables)
7. RLS standardization needed on tm_user_has_access
8. Audit/attachment family consolidation needed
9. Status-history + coverage-history tables designed but unapplied (migration drift)
10. th_* retirement pending code-reference sweep
