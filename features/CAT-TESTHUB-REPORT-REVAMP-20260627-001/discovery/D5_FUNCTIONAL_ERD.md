# D5 — Functional ERD (validated vs cyij data, 2026-06-27)

> STATUS: 🟢 FIRST PASS, evidence-validated. Reflects D-001 (tm_*) + D-002 (ph_issues).

## The real model (what data proves)

```
ph_projects (8)
   │ project_id
   ├──< ph_jira_sprints (26)      [sprint dimension: name, status, dates]
   ├──< ph_releases (59)          [release/version dimension: name, dates]
   └──< ph_issues (2381)  ◀── DELIVERY HUB (D-002 canonical work item)
           │  issue_key, issue_type, status, status_category, parent_key, hierarchy_level
           │  sprint_release  = JSONB [{id,name,releaseDate}]  ◀── REAL sprint+release link
           │  (sprint_name TEXT = near-dead, 2/2381 — DO NOT USE)
           │  (fix_versions = empty — DO NOT USE)
           │
           ├─ issue_type='Story' (683)            ── coverage targets
           ├─ issue_type='Epic' (107)             ── hierarchy via parent_key
           ├─ issue_type='QA Bug' (788)           ── DEFECTS live here
           ├─ issue_type='Production Incident'(152)── INCIDENTS live here
           └─ issue_type='Sub-task'/Backend/Frontend/Task/...

tm_projects (1 "Demo Project")  ◀── test data NOT under real projects (gap)
   └──< tm_test_cases (11)   [tm_* canonical test schema, D-001]
           │ project_id (→ Demo Project, NOT ph_projects), sprint_id, release_id (sparse)
           ├─ tm_requirement_links (0 rows!)  ── Trace-To story via external_key = ph_issues.issue_key
           ├─ tm_test_case_links (0 rows!)    ── generic polymorphic link
           ├──< tm_cycle_scope (3) → tm_test_cycles (1)   [case-in-cycle + status + tester]
           ├──< tm_test_runs (1)                          [execution]
           └──< tm_defects (1)  [source_test_case_id/run_id, sprint_id, epic_link]
```

## Sprint/Release resolution (CORRECTED — supersedes earlier sprint_name note)
- Each issue's sprint+release = parse `ph_issues.sprint_release` JSONB array → `{id,name,releaseDate}`.
- Match `name` → `ph_jira_sprints.name` (sprints) and/or `ph_releases.name` (releases). `id` may match `jira_sprint_id`.
- An issue can carry **multiple** sprint_release entries (saw arrays of 3). → many-to-many issue↔sprint/release.
- Release→Sprint (D-003) = derive by grouping issues' sprint_release entries; both live in the same JSONB. Confirm sprint-vs-release disambiguation rule with user.

## CRITICAL GAP — test↔delivery link is EMPTY
- `tm_requirement_links` = **0 rows**, `tm_test_case_links` = **0 rows**.
- → No test case is linked to any story today. Coverage + traceability are **structurally supported but have zero instances**.
- → Reporting on real coverage/traceability = impossible until links exist. This is what the seed plan (D-004/G-001) must create, using real ph_issues.issue_key values.

## tm vs ph project mismatch
- tm_test_cases live under `tm_projects` "Demo Project" (id 000..001), NOT real ph_projects (Senaei BAU 84f91caf…, etc.).
- → Seed plan must place test cases under a real project context and link to that project's real stories.
