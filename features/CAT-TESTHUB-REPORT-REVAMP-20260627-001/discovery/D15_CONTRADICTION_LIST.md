# D15 — Contradiction / Governance Mismatch List (PROVEN)

> STATUS: 🟢 PROVEN 2026-06-27. Detectable on real data by joining test status to ph_issues.status_category.

## Detection rule (demonstrated)
Story `status_category='Done'` (e.g. "In QA") with a linked test execution `current_status='failed'`
→ GOVERNANCE MISMATCH (story treated as done, but its test is failing).

## Live examples (Senaei BAU, seeded links to REAL stories)
| Story | Jira status | category | Test case | Test status |
|---|---|---|---|---|
| BAU-6018 | In QA | Done | RVTC-007 | failed |
| BAU-6075 | In QA | Done | RVTC-003 | failed |
| BAU-6003 | In QA | Done | RVTC-013 | failed |

## Other detectable contradictions (rules ready, data-dependent)
- Story 'In QA' with NO linked test case (uncovered-in-QA).
- Story 'Done' with test 'not_run'/'blocked'.
- Release marked ready with open defects (needs release status mapping U-006).
