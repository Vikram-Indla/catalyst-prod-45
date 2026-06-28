# B1 — Report Taxonomy

> STATUS: 🟢 DRAFT for review. Grounded in proven model (D-001 tm_*, D-002 ph_issues, D-006 stories, D-005 hybrid defects).
> 11 management groups. Legacy 22 reports preserved but subordinated. Every report names scope + data source + key metric + drill-down.

## Entry model
Reports are entered by **SCOPE first**, then group. Scope = Project / Release / Sprint / Product(Business Request) / Tester / Team / Work item. (See B2.)

## The 11 groups

### 1. Project Testing Status
- Scope: project. Source: ph_issues (project_name) + tm_* (project_id mirror).
- Metrics: coverage%, exec%, open defects, prod incidents, governance flags. Drill: → release / sprint / story.

### 2. Release Testing Status
- Scope: release (ph_releases). Source: stories whose sprint_release JSONB contains the release name → their tm_* links.
- Metrics: coverage%, exec%, open defects, readiness flag. Drill: → sprint → story → case → run.

### 3. Sprint / Iteration Testing Status
- Scope: sprint (ph_jira_sprints). Source: stories whose sprint_release JSONB contains the sprint name.
- Metrics: coverage%, exec completion%, pass/fail/block, pending, sprint-end risk. Drill: → story → case → run → defect.

### 4. Product / Business Request Testing Status
- Scope: Business Request (epic/theme in ph_issues, hierarchy via parent_key/theme_id).
- Metrics: rolled-up coverage/exec/defects across child stories. Drill: → release/sprint/story.

### 5. Coverage & Traceability
- Story coverage (D-006), Trace-To, Trace-From, uncovered-story list, coverage gaps. (B3, B4.)

### 6. Defects & Incidents (HYBRID, D-005)
- Defects: ph_issues 'QA Bug'/'Defect' (volume/trend) + tm_defects (test-linked).
- Incidents: ph_issues 'Production Incident'. Metrics: open by severity, defect↔failed-test, incident↔missing-coverage.

### 7. Execution & Cycles
- Source: tm_test_cycles + tm_cycle_scope + tm_test_runs. Metrics: exec%, pass/fail/block, burndown/burnup (needs DATE_SOURCES), multi-cycle compare. Absorbs legacy Execution + Multi-Cycle families.

### 8. Tester Performance
- Scope: tester (profiles). Source: tm_test_cases.assigned_to + tm_cycle_scope.assigned_to + tm_test_runs.executed_by.
- Metrics: assigned vs executed vs blocked vs failed; defects raised. (D13 derivation pending.)

### 9. Team Performance
- Scope: QA team (derivation = U-009, pending). Metrics: load balance, completion, team risk.

### 10. Governance & Mismatch (B5)
- Proven rule: story Done + failing/absent test. Plus In-QA-no-case, Done-not_run, release-ready-open-defects.

### 11. AI Quality Insights (B6)
- Factual, evidence-cited, missing-data-aware verdicts per scope.

## Legacy → group mapping (preserve, subordinate)
| Legacy family | New home |
|---|---|
| Execution Overview/Summary/Burndown/Burnup/Distribution/History | Group 7 (+ scope 1-3) |
| Case Distribution/Usage | Group 5 / 7 |
| Defect Summary/Impact/Trend | Group 6 |
| Multi-Cycle Comparison/Summary/Detail/Distribution | Group 7 |
| Project Overview/Metrics/Activity | Group 1 |
| Traceability Summary/Detail | Group 5 |
