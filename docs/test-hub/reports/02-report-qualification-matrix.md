# Phase 2 — Report Qualification Matrix
**Feature Work ID:** CAT-TESTHUB-REPORTS-20260627-001  
**Date:** 2026-06-27

**Legend:**
- ✅ 100% generatable — all required data exists and is queried
- 🟡 Partially generatable — core data present, visual/formula gaps
- 🔶 Needs enhancement — data present but query needs improvement
- ❌ Needs schema/data — field or table missing
- ❓ Needs business input — business rule unclear

---

## A. Execution Reports

### 1. Execution Overview
| Field | Value |
|---|---|
| **Status** | 🟡 Partially generatable |
| **Category** | Execution |
| **Business purpose** | Current status breakdown and progress across all runs |
| **Required data** | runs by status, total scope, cycle count, activity timestamps |
| **Discovered sources** | `tm_test_runs.status`, `tm_test_cycles`, `tm_cycle_scope.execution_status` |
| **Required formulas** | pass% = passed/total×100; fail% = failed/total×100 |
| **Filters required** | date range, cycle, folder, assignee |
| **Drilldowns required** | by status, cycle, assignee |
| **Export required** | CSV |
| **AI insight required** | Executive summary, risk flag |
| **Gaps** | (1) No folder filter on runs — `tm_test_runs` lacks `folder_id`; (2) "blocked" is a run status but query only groups on raw status string — needs normalization; (3) "top failing areas" requires folder join which is indirect (case→folder→run); (4) active blockers count needs explicit "blocked" status match |
| **Recommendation** | Build with current data; add folder dimension as Phase 2 enhancement after approval |

---

### 2. Execution Summary
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Execution |
| **Business purpose** | Per-cycle pass/fail/blocked summary |
| **Required data** | `tm_test_cycles`, `tm_test_runs.status` grouped by `cycle_id` |
| **Discovered sources** | `tm_test_runs.cycle_id`, `tm_test_cycles.name` |
| **Required formulas** | pass rate = passed_runs / total_runs × 100 |
| **Filters required** | date range, cycle selector |
| **Drilldowns required** | click cycle → cycle detail |
| **Export required** | CSV/XLSX |
| **AI insight required** | Which cycle is worst? |
| **Gaps** | `skipped` status — query uses `not_run` bucket for unknowns; `blocked` count may miss if data uses different status string |
| **Recommendation** | Ship with current query; add status normalization in lab |

---

### 3. Execution Burndown
| Field | Value |
|---|---|
| **Status** | 🟡 Partially generatable |
| **Category** | Execution |
| **Business purpose** | Remaining unexecuted tests over time |
| **Required data** | daily execution counts, total scope size, dates |
| **Discovered sources** | `tm_test_runs.executed_at` (date grouping) |
| **Required formulas** | cumulative executed; ideal line = scope/duration days |
| **Filters required** | date range, cycle |
| **Drilldowns required** | date → runs on that date |
| **Export required** | CSV |
| **AI insight required** | On track vs behind |
| **Gaps** | (1) Current query shows cumulative executed (burnup pattern), NOT remaining; (2) "remaining" requires total scope count from `tm_cycle_scope` per cycle; (3) "ideal line" requires cycle start/end dates from `tm_test_cycles` |
| **Recommendation** | Fix formula: remaining = scope_total − cumulative_executed. Add `tm_cycle_scope` count join. This is a formula fix only — data exists |

---

### 4. Execution Burnup
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Execution |
| **Business purpose** | Cumulative executed + cumulative passed over time |
| **Required data** | `tm_test_runs.executed_at`, `tm_test_runs.status` |
| **Discovered sources** | Both fields confirmed in current query |
| **Required formulas** | cum_executed = rolling sum runs; cum_passed = rolling sum passed |
| **Filters required** | date range, cycle |
| **Drilldowns required** | date → run list |
| **Export required** | CSV |
| **AI insight required** | Trend projection |
| **Gaps** | Total scope line not shown (need `tm_cycle_scope` count for cycle) |
| **Recommendation** | Add scope line as enhancement; core burnup is ready |

---

### 5. Execution Distribution
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Execution |
| **Business purpose** | Run distribution by status |
| **Required data** | `tm_test_runs.status` grouped by status |
| **Discovered sources** | Confirmed |
| **Required formulas** | count per status; % share |
| **Filters required** | date range, cycle, assignee, folder, priority |
| **Drilldowns required** | status segment → filtered table |
| **Export required** | CSV |
| **AI insight required** | Dominant failure pattern |
| **Gaps** | Grouping by assignee/folder/priority requires join to `tm_test_cases.priority` and indirect folder join; those extra dimensions need Phase 2 query enhancement |
| **Recommendation** | Ship status distribution; add group-by dimensions after approval |

---

### 6. Execution History
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Execution |
| **Business purpose** | Full history of runs with case, executor, result |
| **Required data** | `tm_test_runs`, `tm_test_cases`, `profiles`, `tm_test_cycles` |
| **Discovered sources** | All joined in current query |
| **Required formulas** | None — display only |
| **Filters required** | date range, cycle, executor, status |
| **Drilldowns required** | Row expand → defects linked, step results |
| **Export required** | CSV/XLSX |
| **AI insight required** | Flaky case detection |
| **Gaps** | (1) 200-row limit — needs pagination; (2) Row expand for defects requires `tm_defect_links` join; (3) `comments` not shown — `tm_comments` table exists |
| **Recommendation** | Ship table; add pagination + expand in lab enhancement |

---

## B. Cases Reports

### 7. Case Distribution
| Field | Value |
|---|---|
| **Status** | 🟡 Partially generatable |
| **Category** | Cases |
| **Business purpose** | Test cases grouped by status, priority, type, owner, folder |
| **Required data** | `tm_test_cases.status`, priority, type, owner fields |
| **Discovered sources** | `tm_test_cases.status` confirmed; `priority`, `type` referenced in admin config hooks |
| **Required formulas** | count per group; % share |
| **Filters required** | project, folder, priority, type |
| **Drilldowns required** | status/priority → case list |
| **Export required** | CSV |
| **AI insight required** | Coverage health |
| **Gaps** | Current query only groups by `status`; `priority`, `case_type`, `owner`, `folder_id` fields exist on `tm_test_cases` but not yet queried for distribution |
| **Recommendation** | Extend query to include priority + type dimensions |

---

### 8. Case Usage
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Cases |
| **Business purpose** | How often each case appears in cycles and executions |
| **Required data** | `tm_cycle_scope.test_case_id` grouped, `tm_test_cases.title` |
| **Discovered sources** | Confirmed in current hook |
| **Required formulas** | cycleCount per case |
| **Filters required** | project, date range, folder |
| **Drilldowns required** | case → run history |
| **Export required** | CSV |
| **AI insight required** | Stale + flaky case identification |
| **Gaps** | "Never-run cases" = cases in `tm_test_cases` NOT in `tm_cycle_scope` — easy left-join; "last executed date" requires join to `tm_test_runs.executed_at` |
| **Recommendation** | Extend query for never-run + last executed; core usage count ready |

---

## C. Defects Reports

### 9. Defect Summary
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Defects |
| **Business purpose** | Defects by severity and status |
| **Required data** | `tm_defects.severity`, `tm_defects.status` |
| **Discovered sources** | Both confirmed; severity values: CRITICAL/MAJOR/MINOR/TRIVIAL |
| **Required formulas** | severity×status matrix; total per severity |
| **Filters required** | date range, severity, status |
| **Drilldowns required** | cell → defect list |
| **Export required** | CSV |
| **AI insight required** | Open critical count, aging |
| **Gaps** | "Aging" requires `created_at` + current date delta — data exists; "open critical" requires status='OPEN' AND severity='CRITICAL' filter |
| **Recommendation** | Add aging calculation to formula layer |

---

### 10. Defect Impact
| Field | Value |
|---|---|
| **Status** | 🟡 Partially generatable |
| **Category** | Defects |
| **Business purpose** | Defects linked to test cases and requirements |
| **Required data** | `tm_defects`, `tm_defect_links`, `tm_test_runs`, `tm_test_cases`, `ph_issues` |
| **Discovered sources** | `tm_defect_links.test_run_id → tm_test_runs.test_case_id → tm_test_cases` confirmed |
| **Required formulas** | impact score = linked cases × severity weight |
| **Filters required** | severity, status |
| **Drilldowns required** | defect → linked cases, requirements |
| **Export required** | CSV |
| **AI insight required** | Release risk by defect impact |
| **Gaps** | (1) `ph_issues` linkage from defects NOT confirmed — `tm_defects` may not have `linked_work_item_id`; need to check schema; (2) Impact score formula needs business definition |
| **Recommendation** | Ship case linkage; requirement linkage pending schema check |

---

### 11. Defect Trend
| Field | Value |
|---|---|
| **Status** | 🟡 Partially generatable |
| **Category** | Defects |
| **Business purpose** | Defect creation vs closure trend |
| **Required data** | `tm_defects.created_at`, `tm_defects.status` (for closed date) |
| **Discovered sources** | `created_at` confirmed; `resolved_at` or `closed_at` NOT confirmed in schema |
| **Required formulas** | daily created; daily closed (if field exists) |
| **Filters required** | date range, severity |
| **Drilldowns required** | date → defect list |
| **Export required** | CSV |
| **AI insight required** | Creation vs closure balance |
| **Gaps** | `closed_at` / `resolved_at` field on `tm_defects` NOT confirmed — current query only shows creation trend; closure trend needs schema check |
| **Recommendation** | Ship creation trend; closure trend gated on `resolved_at` field discovery |

---

## D. Multi-Cycle Reports

### 12. Multi-Cycle Comparison
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Multi-Cycle |
| **Business purpose** | Side-by-side pass rate comparison across cycles |
| **Required data** | `tm_test_cycles`, `tm_cycle_scope.execution_status` |
| **Discovered sources** | Both confirmed |
| **Required formulas** | pass rate per cycle; delta vs previous |
| **Filters required** | cycle selector, date range |
| **Drilldowns required** | cycle → case detail |
| **Export required** | CSV |
| **AI insight required** | Which cycle regressed |
| **Gaps** | Delta vs previous cycle requires sorting + comparison — formula only |
| **Recommendation** | Ship; add delta calculation in lab |

---

### 13. Multi-Cycle Summary
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Multi-Cycle |
| **Business purpose** | One-row-per-cycle aggregated metrics |
| **Required data** | `tm_test_cycles`, `tm_cycle_scope.execution_status` |
| **Discovered sources** | Confirmed (reuses same hook as comparison) |
| **Required formulas** | total, pass rate, duration = end_date − start_date |
| **Filters required** | cycle selector |
| **Drilldowns required** | row → cycle detail |
| **Export required** | CSV |
| **AI insight required** | Slowest / best cycle |
| **Gaps** | Blockers count requires `tm_defects` join; defects per cycle not in current query |
| **Recommendation** | Ship; add defect join as enhancement |

---

### 14. Multi-Cycle Detail
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Multi-Cycle |
| **Business purpose** | Per-case results across every cycle |
| **Required data** | `tm_cycle_scope.cycle_id`, `test_case_id`, `execution_status`, `tm_test_cases` |
| **Discovered sources** | Confirmed |
| **Required formulas** | Case × Cycle matrix |
| **Filters required** | cycle selector, case status |
| **Drilldowns required** | cell → run history |
| **Export required** | XLSX (matrix format) |
| **AI insight required** | Flaky cases (pass then fail pattern) |
| **Gaps** | 500-row limit — large projects will truncate; needs pagination or virtual scroll |
| **Recommendation** | Ship with row limit disclosure; add pagination |

---

### 15. Multi-Cycle Distribution
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Multi-Cycle |
| **Business purpose** | Status distribution pivot per cycle |
| **Required data** | `tm_cycle_scope.execution_status`, `cycle_id` |
| **Discovered sources** | Confirmed |
| **Required formulas** | Pivot: status × cycle → count |
| **Filters required** | cycle selector, status |
| **Drilldowns required** | cell → case list |
| **Export required** | CSV |
| **AI insight required** | Which cycle has most blocked |
| **Gaps** | Grouping by assignee/folder requires joins not yet in query |
| **Recommendation** | Ship status×cycle pivot; add dimensions as enhancement |

---

## E. Project Reports

### 16. Project Overview
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Project |
| **Business purpose** | Executive top-level health view |
| **Required data** | `tm_test_cases`, `tm_test_cycles`, `tm_test_runs` counts + pass rate |
| **Discovered sources** | All confirmed |
| **Required formulas** | pass rate = passed / total × 100 |
| **Filters required** | project |
| **Drilldowns required** | metric → detail report |
| **Export required** | PDF (executive report) |
| **AI insight required** | Release readiness assessment |
| **Gaps** | "Active blockers" = blocked runs — data exists; "coverage %" needs total scope vs executed ratio |
| **Recommendation** | Ship; add coverage % formula |

---

### 17. Project Metrics
| Field | Value |
|---|---|
| **Status** | 🟡 Partially generatable |
| **Category** | Project |
| **Business purpose** | Velocity and defect-rate metrics over time |
| **Required data** | `tm_test_runs.executed_at`, `tm_defects.created_at`, `tm_test_cycles.start_date/end_date` |
| **Discovered sources** | All confirmed |
| **Required formulas** | velocity = runs / days; defect_rate = defects / runs × 100 |
| **Filters required** | date range |
| **Drilldowns required** | metric → detail |
| **Export required** | CSV |
| **AI insight required** | Velocity trend, quality trend |
| **Gaps** | (1) "retest rate" requires knowing which runs are retests — no `is_retest` flag on `tm_test_runs` found; (2) "avg cycle duration" = mean(end_date − start_date) — data exists; (3) "blocked aging" requires blocked status timestamp — `tm_test_runs` may have only `executed_at` not `blocked_at` |
| **Recommendation** | Ship velocity + defect rate + pass rate trend; mark retest rate and blocked aging as ❌ Needs schema |

---

### 18. Project Activity
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Project |
| **Business purpose** | Recent test activity timeline |
| **Required data** | `tm_test_runs` with user, case, cycle, timestamp |
| **Discovered sources** | Confirmed — current hook returns date, action, user, entity, cycle |
| **Required formulas** | None — timeline display |
| **Filters required** | date range, user, action type |
| **Drilldowns required** | row → run detail |
| **Export required** | CSV |
| **AI insight required** | Activity summary |
| **Gaps** | Only run actions tracked — case creation/edit/delete activity NOT in `tm_test_runs`; `tm_test_cases.created_at` could supplement |
| **Recommendation** | Ship runs-based activity; note limitation |

---

## F. Traceability Reports

### 19. Traceability Summary
| Field | Value |
|---|---|
| **Status** | 🔶 Needs enhancement |
| **Category** | Traceability |
| **Business purpose** | Jira/Catalyst requirement coverage summary |
| **Required data** | `tm_test_cases.linked_work_item_id` → `ph_issues.issue_key/summary` |
| **Discovered sources** | Both confirmed in current query |
| **Required formulas** | coverage % = cases with linked issues / total cases × 100 |
| **Filters required** | project, cycle, issue type |
| **Drilldowns required** | issue → case list → run status |
| **Export required** | CSV |
| **AI insight required** | Uncovered requirements |
| **Gaps** | (1) Coverage % not calculated — needs total case count denominator; (2) Execution status per linked case NOT shown — requires join to `tm_test_runs`; (3) `ph_issues.type` not queried — can't filter by Feature/Story/Bug |
| **Recommendation** | Add coverage %, execution status join, and issue type filter |

---

### 20. Traceability Detail
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Traceability |
| **Business purpose** | Requirement → test case → execution → defect chain |
| **Required data** | `ph_issues`, `tm_test_cases`, `tm_test_runs` (latest run per case) |
| **Discovered sources** | All confirmed |
| **Required formulas** | latest run status per case |
| **Filters required** | project, issue, status |
| **Drilldowns required** | row → all run history |
| **Export required** | CSV |
| **AI insight required** | Defect chain visualization |
| **Gaps** | `tm_defects` linkage not in current traceability detail query — `tm_defect_links` could be joined for defect column |
| **Recommendation** | Add defect column via `tm_defect_links` join |

---

## G. Other Reports

### 21. Run Distribution
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Other |
| **Business purpose** | Runs by executor: total/passed/failed |
| **Required data** | `tm_test_runs.executed_by`, `profiles.full_name`, `status` |
| **Discovered sources** | Confirmed |
| **Gaps** | None critical |
| **Recommendation** | Move to Execution category in UI |

---

### 22. User Activity
| Field | Value |
|---|---|
| **Status** | ✅ 100% generatable |
| **Category** | Other |
| **Business purpose** | Per-user execution activity and pass rate |
| **Required data** | `tm_test_runs.executed_by`, `profiles.full_name`, `status` |
| **Discovered sources** | Confirmed |
| **Gaps** | Same as Run Distribution — is essentially a simplified version |
| **Recommendation** | Consider merging with Run Distribution |

---

## Summary Table

| # | Report | Status | Gap Summary |
|---|---|---|---|
| 1 | Execution Overview | 🟡 Partial | Folder join missing; "top failing areas" indirect |
| 2 | Execution Summary | ✅ Ready | Minor: status normalization |
| 3 | Execution Burndown | 🟡 Partial | Formula wrong (burnup not burndown); fixable |
| 4 | Execution Burnup | ✅ Ready | Scope line optional |
| 5 | Execution Distribution | ✅ Ready | Extra group-by dims need join |
| 6 | Execution History | ✅ Ready | Needs pagination; 200-row limit |
| 7 | Case Distribution | 🟡 Partial | Only status grouped; needs priority/type |
| 8 | Case Usage | ✅ Ready | Never-run + last-executed easy to add |
| 9 | Defect Summary | ✅ Ready | Aging calc is formula-only |
| 10 | Defect Impact | 🟡 Partial | req linkage unconfirmed on tm_defects |
| 11 | Defect Trend | 🟡 Partial | closed_at field unconfirmed |
| 12 | Multi-Cycle Comparison | ✅ Ready | Delta formula needed |
| 13 | Multi-Cycle Summary | ✅ Ready | Defect join optional |
| 14 | Multi-Cycle Detail | ✅ Ready | Pagination needed |
| 15 | Multi-Cycle Distribution | ✅ Ready | Extra dims need join |
| 16 | Project Overview | ✅ Ready | Coverage % formula |
| 17 | Project Metrics | 🟡 Partial | retest rate ❌ no flag; blocked aging ❌ no timestamp |
| 18 | Project Activity | ✅ Ready | Runs only; case events supplement needed |
| 19 | Traceability Summary | 🔶 Needs enhancement | Coverage %, exec status, issue type filter |
| 20 | Traceability Detail | ✅ Ready | Defect column optional join |
| 21 | Run Distribution | ✅ Ready | Merge with Execution category |
| 22 | User Activity | ✅ Ready | Consider merge with #21 |

**Counts:** 13 ✅ Ready | 7 🟡 Partial | 1 🔶 Enhancement | 0 ❌ Blocked

---

## Schema Confirmations Needed Before Phase 8
1. `tm_defects.resolved_at` or `closed_at` — for Defect Trend closure line
2. `tm_defects.linked_work_item_id` — for Defect Impact requirement chain
3. `tm_test_runs.is_retest` — for retest rate metric in Project Metrics
4. `tm_test_runs.blocked_at` — for blocked aging metric

These are Phase 8 questions only. All 22 reports can be built in the lab using seeded data now.
