# D1 — Report Inventory

> STATUS: 🟢 FIRST PASS (Explore agent + code). 2026-06-27. Cite file:line.

## Test Hub report routes
| Report surface | Route | Component | Data |
|---|---|---|---|
| Reports Gallery | `/testhub/reports` | `src/pages/testhub/reports/ReportsPage.tsx` | REAL (useActiveProject, useKpiData) |
| Report Detail | `/testhub/reports/:type` | `src/pages/testhub/reports/ReportDetailPage.tsx` | REAL (tm_test_runs, tm_test_cases, tm_defects, tm_cycle_scope) |
| Reports Command Center (LAB) | `/testhub/reports-lab` | `src/pages/testhub/reports/lab/ReportsCommandCenterPage.tsx` | **MOCK** (`useSeededTestReportData`) |

## 22 report types (ReportsPage.tsx:26-49, detail in ReportDetailPage.tsx)
Execution: Overview, Summary, Burndown, Burnup, Distribution, History ·
Cases: Distribution, Usage · Defects: Summary, Impact, Trend ·
Multi-Cycle: Comparison, Summary, Detail, Distribution ·
Project: Overview, Metrics, Activity · Traceability: Summary, Detail · Run Distribution · User Activity.
- Maturity flags in lab reportDefinitions.ts: 13 ready / 8 partial / 1 needs-data.

## Real tm_* tables the reports read
tm_test_cases, tm_test_cycles, tm_test_runs, tm_cycle_scope, tm_defects, tm_defect_links, ph_issues (traceability), profiles.

## ⚠️ Cross-check with D3
Reports query tm_* which on cyij holds 11 cases / 1 run / 1 cycle / 1 defect. "REAL" = wired, but
near-zero data → reports render almost empty against live data. Lab is the only fully-populated surface (seeded).

## Other (non-TestHub) report surfaces (real)
Dependency Maps `/reports/dependencies/maps`; Epic Status/Trace/Requirement-Hierarchy/Responsibility-Matrix/Planning under `/items/epics/...`; Risk ROAM `/risk-roam-report`; Incident Reports `/release/incidents/reports`.

## Lab component set (src/pages/testhub/reports/lab/, 13 files)
ReportsCommandCenterPage, ReportCanvas, ReportNavigator, ReportMetricRibbon, ReportFilterBar,
ReportInsightPanel, ReportFormulaDrawer, ReportExportMenu(stub), ReportSkeleton, ReportEmptyState,
reportDefinitions.ts, reportCalculations.ts, useSeededTestReportData.ts.
