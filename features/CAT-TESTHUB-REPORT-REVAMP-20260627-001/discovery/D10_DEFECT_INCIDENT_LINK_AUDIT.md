# D10 — Defect & Incident Link Audit (cyij)

> STATUS: 🟢 FIRST PASS. Surprise: defects + incidents are primarily ISSUE TYPES in ph_issues, not the tm_/standalone tables.

## Where defects actually live
| Source | Count | Notes |
|---|---|---|
| ph_issues issue_type='QA Bug' | **788** | the real defect population |
| ph_issues issue_type='Defect' | 3 | |
| tm_defects | 1 | rich model (source_test_case_id, sprint_id, epic_link) but demo-only |
| ph_defects / th_defects / defects (standalone) | 0 | dead |

## Where incidents actually live
| Source | Count | Notes |
|---|---|---|
| ph_issues issue_type='Production Incident' | **152** | the real incident population |
| incidents / ph_incidents (+ incident_* family) | 0 | dead/empty |

## Consequence (NEW QUESTION)
The revamp's "defects" + "production incidents" reports realistically read from **ph_issues** (QA Bug,
Production Incident), NOT tm_defects. But D-001 set tm_* as the test schema, and tm_defects links to
test runs. → Need decision: defect/incident reporting source = ph_issues (volume, real) vs tm_defects
(test-linked) vs both. Logged as Q-007.

## Defect↔test link
- tm_defects.source_test_case_id / source_test_run_id exist (test-linked defects) — but 1 row.
- ph_issues QA Bugs have NO structural link to tm test cases today (would need tm_requirement_links or a new link, both empty).
- Incident→regression-test link: none in data.
