# SEED PLAN (D-004 / CONSENT_GATE G-001) — DRAFT, WRITE ON HOLD

> dev cyij ONLY. Never prod. All seeded rows tagged for clean rollback. HOLD until reviewed + G-001 consent.

## Goal
Make coverage/traceability/execution reports demonstrable on REAL delivery context by seeding tm_*
test data that LINKS to real ph_issues stories — closing the empty-link gap (D5: tm_requirement_links=0).

## Anchor to real data (no invented work items)
- Pick a real project, e.g. **Senaei BAU** (ph_projects.id 84f91caf-7511-470a-9a26-3e52e66258bf).
- Use its real Stories from ph_issues (issue_type='Story', ~683 total across projects).
- Use its real sprints (ph_jira_sprints.name) + releases (ph_releases.name) from those stories' sprint_release JSONB.

## What to seed (tagged batch, e.g. custom_fields.seed_batch='REVAMP-DEMO-2026-06-27')
1. tm_test_cases under the real project_id — N cases, varied priority/type/status, assigned to real testers (profiles).
2. tm_requirement_links — link each case to a real ph_issues.issue_key (requirement_type='story', external_key=issue_key, coverage_status set).
3. tm_test_cycles — 2-3 cycles named after real sprints.
4. tm_cycle_scope + tm_test_runs — executions with realistic pass/fail/blocked spread + tester + date.
5. tm_defects — a few, source_test_run_id linked + optionally epic_link to real epic key.
6. Leave some stories UNCOVERED + some executions PENDING + 1 governance mismatch (Done story w/ failing test).

## Rollback
`delete from tm_* where <seed_batch tag>` per table, reverse FK order.

## Approval needed before any write
- Confirm anchor project (Senaei BAU?).
- Confirm volumes (how many cases/cycles/runs).
- Confirm defect/incident source decision (Q-007) so seeded defects match the chosen reporting source.
- Then flip G-001 consent → APPROVED and execute.
