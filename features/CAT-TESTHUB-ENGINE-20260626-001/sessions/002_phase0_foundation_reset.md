# Session 002 — Phase 0 Foundation Reset

**Date:** 2026-06-26 · **Branch:** main · **DB:** cyij

## Done
- Verified DB target = cyij (MCP fingerprint 25/3/7; `supabase projects list` cyij linked=true). Migrations via MCP only (config.toml=prod).
- D5 → ph_issues is defect source (791 bugs / 11 projects).
- Applied guard migration 20260626100000 (drop broken sync_jira_bug_to_defect; was absent).
- Wiped tm_* content (kept project/priorities/types); reseeded 6 folders / 10 cases / 28 steps.
- Confirmed RLS permissive (tm_user_has_access).
- Wired /testhub/defects route → canonical DefectsPage.

## Wipe DO-block (record)
DO block iterates an array of tm_* content tables, deletes where to_regclass not null:
tm_step_results, tm_test_runs, tm_defect_links, tm_cycle_scope, tm_cycle_assignments, tm_run_case_assignments,
tm_requirement_links, tm_requirement_tests, tm_test_case_links, tm_set_cases, tm_test_set_cases, tm_case_labels,
tm_test_plan_cases, tm_plan_scope, tm_comments, tm_attachments, tm_defects, tm_test_steps, tm_test_case_versions,
tm_test_cases, tm_test_cycles, tm_test_plans, tm_test_sets, tm_folders, tm_activity_log.

## Next
User sign-in → screenshot repository + defects → P0 sign-off → Phase 1.
