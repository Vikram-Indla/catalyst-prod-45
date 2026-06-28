# B5 — Governance Mismatch Model

> STATUS: 🟢 DRAFT. One rule PROVEN; others ready pending STATUS_MAPPING.

## Rule engine (delivery status vs test status)
| ID | Mismatch | Detection | State |
|----|----------|-----------|-------|
| G-M1 | Story Done but test failing | ph_issues.status_category='Done' + linked run='failed' | **PROVEN** (BAU-6018/6075/6003) |
| G-M2 | Story In-QA, no test case | status='In QA' + 0 links | ready (needs status map for "In QA") |
| G-M3 | Story Done, test not_run/blocked | status_category='Done' + run in (not_run,blocked) | ready |
| G-M4 | Story Backlog/To-Do but testing complete | status_category='To Do' + run passed | ready |
| G-M5 | Release ready, open critical defects | release status='ready' + open critical defect in scope | needs release status map |
| G-M6 | Sprint ending, executions pending | sprint near end_date + not_run in scope | needs DATE_SOURCES |
| G-M7 | Prod incident, no regression test | Production Incident with 0 linked tests | ready |
| G-M8 | Closed defect, no retest | defect closed + no retest run | ready |

## Surfacing
- Elevate as a "Governance" report group (B1 #10) + inline warning chips on scope headers.
- Never hide mismatches; count + list with drill-down to evidence.

## Status mapping dependency
G-M2/M4/M5 need contract/STATUS_MAPPING.md confirmed (which raw statuses = In QA / Done / Ready). ph_issues has status + status_category (Done/In Progress/To Do) — category usable now; fine-grained status needs user map.
