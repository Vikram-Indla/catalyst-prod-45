# 11 — KARPATHY LOOP LOG

## Loop 1 — Is Test Hub greenfield? (2026-06-26)
- **Hypothesis:** "Build the whole test hub" implies greenfield.
- **Experiment:** Parallel codebase + DB discovery agents.
- **Measure:** Full `tm_*` schema (75 tables), routes, pages, hooks, rich cycle UI all already exist; 25 cases/13 folders/3 cycles seeded.
- **Keep/Discard:** DISCARD greenfield framing. KEEP "refactor/complete + prove wiring + reseed."

## Loop 2 — Is test execution actually missing? (2026-06-26)
- **Hypothesis (user):** Test execution is a clear miss.
- **Experiment:** Inspect execution tables/RPCs/pages + the uncommitted migration.
- **Measure:** `ExecutionPage.tsx` + `tm_test_runs`/`tm_step_results`/`tm_cycle_scope` exist but runs/step_results = 0 rows; phantom `tm_test_executions` scrubbed from 2 RPCs. Table naming fragmented across 4 names.
- **Keep/Discard:** KEEP "execution is built but UNPROVEN + naming fragmented." Phase 4 = exercise + consolidate, not build-from-zero.

## Loop 3 — Where do defects come from? (2026-06-26)
- **Hypothesis (user):** Defects = project QA bugs, shown in a Jira table filtered by project.
- **Experiment:** Search work-item tables for a QA-bug type.
- **Measure:** `ph_issues` has 788 `issue_type='qa bug'` rows, project-keyed. Native `tm_defects` (7 rows) + broken `sync_jira_bug_to_defect` trigger also exist.
- **Keep/Discard:** KEEP ph_issues as defect source candidate; trigger is broken (red flag). Confirm model with user (decision 1+2).
