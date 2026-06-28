# D9 — Test Artifact Link Audit (cyij, tm_* schema)

> STATUS: 🟢 FIRST PASS — link columns probed. Data near-empty so links unexercised.

## tm_test_cases — link columns present
`project_id, folder_id, case_key, ..., release_version_id, parent_case_id, cloned_from_id,
release_id, sprint_id, source_ra_doc_id, assigned_to`
- → Test case CAN link directly to: project, release (release_id + release_version_id), **sprint_id**,
  parent case (parent_case_id), assignee.
- BUT only 11 rows exist; columns likely sparsely populated. Direct sprint/release linkage = optional, unproven in data.

## Traceability tables (test → work item)
- **`tm_requirement_links`**: `test_case_id, requirement_type, requirement_id, external_key,
  external_url, external_title, link_type, coverage_status`.
  → Polymorphic Trace-To spine. `external_key` likely = `ph_issues.issue_key`. Has `coverage_status` already.
- **`tm_test_case_links`**: `test_case_id, linked_item_type, linked_item_id` → generic polymorphic link.

## Execution / cycle linkage
- **`tm_cycle_scope`**: `cycle_id, test_case_id, assigned_to, current_status, due_date` → case-in-cycle membership + per-case status + tester.
- `tm_test_runs` (1 row), `tm_step_results` (3) → execution records.

## Defect linkage
- **`tm_defects`**: `project_id, ..., sprint, sprint_id, epic_link, fix_version, affects_version,
  source_test_run_id, source_test_case_id, source_test_plan_id, auto_created`.
  → Defect↔test (source_test_*), defect↔sprint (sprint_id), defect↔epic (epic_link) all modeled. 1 row only.

## Verdict
The tm_* MODEL supports coverage + traceability (polymorphic requirement links, cycle scope,
defect→test). The DATA does not exist yet (demo only). Trace-To/Trace-From feasible structurally;
unproven at runtime. Which linkage is AUTHORITATIVE (direct sprint_id/release_id on case vs
requirement_links external_key vs via story) = USER DECISION (U-003/U-008).
