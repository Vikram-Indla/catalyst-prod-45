# 06 — Test Reporting Inventory (CAT-TESTHUB-PROD-20260703-001)

Discovery agent output · 2026-07-03 · READ-ONLY inventory. Per Vikram: **reuse, don't refactor** — no refactor proposals here, only facts + gaps.

---

## 1. Architecture overview (the Reports Hub)

The TestHub Reports Hub (CAT-REPORTS-HUB-20260703-001, shipped 2026-07-03, closed per memory) is a **single registry-driven surface**:

| Piece | File | Evidence |
|---|---|---|
| Hub page (chassis) | `src/pages/testhub/reports/ReportsHubPage.tsx` | Left `ReportNavigator` + `:reportSlug` URL param; Save-view button (lines 41–201) |
| Registry (SSoT) | `src/components/testhub/reports/report-registry.ts` | **26 entries**, all `status: 'wired'` (lines 38–292); default report = `sprint-testing-status` (line 300) |
| Routes | `src/routes/FullAppRoutes.tsx:687–694` | `/testhub/reports`, `/testhub/reports/:reportSlug`, 5 legacy-URL redirects, `/testhub/reports-lab` → redirect |
| Route builders | `src/lib/routes.ts:125,127` | `testHub.reports()`, `testHub.report(slug)` |
| Renderer + error boundary | `src/components/testhub/reports/ReportRenderer.tsx` | Suspense (ReportSkeleton) + class error boundary → `SectionMessage` + Retry (lines 22–50) |
| Live-data adapter for 16 Lab reports | `src/components/testhub/reports/WiredReportBody.tsx` | picks project, applies client-side filters, `if (query.isError) throw query.error` (line 144) |
| Bulk data hook | `src/components/testhub/reports/hooks/useRealTestReportData.ts` | 10 tables in one queryFn; **every query throws on error** (header lines 13–14) |
| Canvas (Lab-derived visuals) | `src/pages/testhub/reports/lab/ReportCanvas.tsx` (32.8K) | 17 slug renderers (grep of `'<slug>':` keys) |
| Charts | `src/components/testhub/reports/charts/ReportChart.tsx` | **recharts** wrapped with ADS token theme (`adsChartTheme`) — header lines 1–17 |
| AI insight | `src/components/testhub/reports/ReportInsightCard.tsx` + `hooks/useReportInsights.ts` | "Caty Insight": aggregates-only payload → `report-insights` edge function; graceful `ai-unavailable` reason |
| CSV/PDF export | `src/components/testhub/reports/ReportExportMenu.tsx` | papaparse / jspdf+autotable lazy via `src/lib/exportLoaders`; **charts NOT embedded in PDF — table only** (header comment) |
| Saved views | `src/components/testhub/reports/hooks/useSavedReports.ts` | table `tm_saved_reports` (lines 37, 70, 87); shared vs owned views; deep-link `?project=&range=` |
| Lab defs/formulas | `src/pages/testhub/reports/lab/reportDefinitions.ts` | 20 `REPORT_DEFS` slugs + `FORMULA_EXPLANATIONS` map (lines 204–224) |

**AI insight coverage:** `ReportInsightCard` is imported by ALL 10 dedicated bodies **and** `WiredReportBody` (grep -rln, 12 files) → **all 26 reports have the Caty insight card.**

---

## 2. The 26 registry reports (route = `/testhub/reports/<id>`)

Body type: **W** = `wiredBody(slug)` → WiredReportBody → useRealTestReportData → ReportCanvas; **D** = dedicated body under `src/components/testhub/reports/bodies/`.

| # | id | Category | Body | Data source | AI card | Stability risk |
|---|---|---|---|---|---|---|
| 1 | execution-overview | Execution | W | tm_test_runs via tm_cycle_scope (+9 tables in useRealTestReportData) | Yes | Low — hook throws on every error |
| 2 | execution-summary | Execution | W | same | Yes | Low |
| 3 | execution-burndown | Execution | W | same | Yes | Low |
| 4 | execution-burnup | Execution | W | same | Yes | Low |
| 5 | execution-distribution | Execution | W | same | Yes | Low |
| 6 | execution-history | Execution | W | same | Yes | Low |
| 7 | case-distribution | Cases | W | tm_test_cases + tm_case_priorities/types/folders | Yes | Low |
| 8 | case-usage | Cases | W | tm_cycle_scope counts | Yes | Low |
| 9 | defect-summary | Defects | **D** DefectSummaryBody | `useDefectsIncidents.ts`: tm_defects + ph_issues | Yes | **Silent error** — 1 `{data}`-only destructure, 0 throws |
| 10 | defect-impact | Defects | W | tm_defects (severity × linked cases) | Yes | Low |
| 11 | defect-trend | Defects | W | tm_defects.created_at | Yes | Low |
| 12 | defect-closure-trend | Defects | **D** DefectClosureTrendBody | `useDefectClosureTrend.ts`: tm_defects (closure capture from 2026-07-03, D-004) | Yes | Low (1 throw, 0 silent); data sparse until history accrues — no backfill by design |
| 13 | multi-cycle-comparison | Multi-Cycle | W | tm_test_cycles + tm_cycle_scope | Yes | Low |
| 14 | multi-cycle-summary | Multi-Cycle | W | same | Yes | Low |
| 15 | multi-cycle-detail | Multi-Cycle | W | same | Yes | Low |
| 16 | multi-cycle-distribution | Multi-Cycle | W | same | Yes | Low |
| 17 | project-testing-status | Project | **D** ProjectTestingStatusBody | `useProjectTestingStatus.ts`: ph_issues, tm_requirement_links, tm_cycle_scope, tm_defects | Yes | **Silent error** — 4 `{data}`-only, 0 throws |
| 18 | product-status | Project | **D** ProductStatusBody | `useProductStatus.ts`: ph_issues (epic proxy), tm_requirement_links, tm_cycle_scope | Yes | **Silent error** — 4 `{data}`-only, 0 throws |
| 19 | sprint-testing-status (DEFAULT report) | Sprint | **D** SprintTestingStatusBody | `useSprintTestingStatus.ts`: ph_issues **sprint_release JSONB, filtered client-side** + tm_requirement_links/tm_test_cases/tm_cycle_scope/tm_defects | Yes | **Silent error** — 6 `{data}`-only, 0 throws; **full-table scans** (all Stories, all QA Bugs, all Production Incidents org-wide, lines 49–129) |
| 20 | points-burndown | Sprint | **D** PointsBurndownBody | `usePointsBurndown.ts`: ph_jira_sprints + ph_issues.sprint_release JSONB + ph_issue_status_history | Yes | Low (3 throws, 0 silent); history-gated like #12 |
| 21 | tester-performance | People | **D** TesterPerformanceBody | `useTesterPerformance.ts` (reports dir, NOT the RPC hook): tm_test_cases, tm_cycle_scope, tm_defects, tm_requirement_links | Yes | **Silent error** — 3 `{data}`-only, 0 throws |
| 22 | team-performance | People | **D** TeamPerformanceBody | `useTeamPerformance.ts`: profiles, tm_test_cases, tm_cycle_scope, tm_defects | Yes | **Silent error** — 4 `{data}`-only, 0 throws |
| 23 | governance | Governance | **D** GovernanceBody | `useGovernance.ts`: ph_issues, tm_requirement_links, tm_cycle_scope | Yes | **Silent error** — 3 `{data}`-only, 0 throws |
| 24 | approval-age | Governance | **D** ApprovalAgeBody | `useApprovalAge.ts`: tm_plan_approvals, tm_release_signoffs, tm_test_plans | Yes | Partial — 2 throws but 1 silent `{data}`-only |
| 25 | traceability-summary | Traceability | W | tm_requirement_links → ph_issues (+ph_issue_links) | Yes | Low |
| 26 | traceability-detail | Traceability | W | requirement → case → run → defect chain | Yes | Low |

Shared presentation for status reports: `src/pages/testhub/reports/ReportStatusView.tsx` (metric ribbon + JiraTable + Lozenge; used by 10 bodies + `useProductStatus`).

### Silent-error verdict (evidence: grep counts per hook)
`useGovernance` 3/0, `useProductStatus` 4/0, `useProjectTestingStatus` 4/0, `useTeamPerformance` 4/0, `useTesterPerformance` 3/0, `useSprintTestingStatus` 6/0, `useDefectsIncidents` 1/0 (`{data}`-only destructures / throw count). A failed query in these 7 hooks renders **zeros/empty tables that look like real data** — the exact `{data}`-only landmine documented in memory (silent-query-error sweep did NOT cover these report hooks). WiredReportBody-path reports (16) and DefectClosureTrend/PointsBurndown are clean.

### Stub-data check
No seeded/stub data remains in the hub: the seeded generator "was deleted in Lane B" (ReportsHubPage.tsx:7–8; report-registry.ts:10–11). The `demo` flag path in ReportNavigator still exists (ReportsHubPage.tsx:117) but no registry entry has `status: 'demo'`.

### Lab dead entries
`reportDefinitions.ts` lists 20 slugs but `project-overview`, `project-metrics`, `project-activity` have **no renderer case in ReportCanvas** (17 slug keys found) and **no registry entry** → unreachable dead defs. `defect-summary` lab renderer exists but registry routes the dedicated body instead.

---

## 3. Reporting surfaces OUTSIDE the hub

### TestHub-adjacent (test data, different surface)
| Surface | Route | Data | Notes |
|---|---|---|---|
| Cycle Command Center analytics | (releases module) `src/components/releases/cycle-command-center/**` | **DB RPCs**: `tm_get_cycle_quality_trends`, `tm_get_cycle_defect_trends`, `tm_get_tester_performance`, `tm_compare_cycles`, `tm_get_plan_analytics`, `tm_get_cycle_execution_velocity` via `src/hooks/test-cycles/useCycleAnalytics.ts` (all throw on error) + `useExecutionProgress.ts` (direct tm_test_runs), `useCycleExecutionVelocity.ts` | Consumers: ExecutionProgressChart, DefectTrendChart, VelocityChart, QualityTrendChart, TesterPerformanceTable. **Server-side RPC analytics exist here but the Reports hub computes everything client-side** — two parallel calculation stacks for pass rate / tester performance / cycle comparison. RPCs expose `defectDensity`, `healthScore`, `avgExecutionTime`, `productivityScore` (useCycleAnalytics.ts:157–162) — none surfaced in the hub. |
| Evidence reports | `src/components/evidence/reports/` (ExecutionSummary, EvidenceStats, ExportButtons) | UNKNOWN wiring | Only referenced by `src/registry/usage-map.generated.ts` — apparently **orphaned** |

### Project/other-module reports (NOT TestHub)
| Surface | Route | Notes |
|---|---|---|
| Incident Hub report (Production Incident + MTTR) | `/incident-hub/reports` → `src/modules/incidents/analytics/pages/IncidentReportPage.tsx` (231 lines) | Split out of old TestHub defects-incidents report (Phase 2 Lane C); ph_issues `issue_type='Production Incident'` + ph_issue_status_history MTTR; has SectionMessage error handling |
| Release incident reports (legacy hub) | `/release/incidents/reports` → `src/pages/release/IncidentReportsPage.tsx` (609 lines) | Tabs: sla-breach/aging/conversion/distribution; `incidents` table (0 rows per IncidentReportPage header) — **likely dead-data surface**; sole consumer of legacy `src/components/reports/{ExecutiveInsightStrip,ReportTable}` |
| Epic reports | `/items/epics/:epicId/status-report`, `/trace`, requirement-hierarchy, responsibility-matrix, planning (`src/pages/items/reports/*`, FullAppRoutes.tsx:820–821) | Project reporting, includes an Epic **trace report** distinct from TestHub traceability |
| Dependency maps | `/reports/dependencies/maps` (FullAppRoutes.tsx:834) | Project |
| Risk ROAM report | `/risk-roam-report` (FullAppRoutes.tsx:844) | Project |
| Project-hub reports | `/project-hub/:key/reports` = **placeholder** "Phase 4" (FullAppRoutes.tsx:1071); `/projects/:projectId/reports` = ComingSoon (line 874) | Empty slots |

### Legacy orphans in `src/components/reports/`
`ReportBuilder`, `SavedReportsList`, `KPICard`, `ExecutionTrendChart`, `ResultsPieChart`, `ModuleBarChart`, `TesterLeaderboard`, `ReportFilters`, `ExportModal` — **zero consumers outside the folder** (per-component grep). Only `ExecutiveInsightStrip` + `ReportTable` are used (by the release IncidentReportsPage). A whole custom report-builder UI sits dead.

---

## 4. Enterprise-tool gap list (reports we LACK)

Compared against typical Zephyr/qTest/TestRail/Xray report catalogs. "Partial" = adjacent capability exists.

| Enterprise report | Status in Catalyst | Evidence / nearest asset |
|---|---|---|
| Flaky test report (status flip-flops across runs) | **Missing** | Run history exists per case (tm_test_runs) but no flakiness computation anywhere |
| Automation coverage / manual-vs-automated split | **Missing** | Schema HAS `automation_connectors`, `automation_results`, `automation_test_mappings` (types.ts:1328–1520) with **zero src consumers** — data model ready, no report |
| Requirement Traceability Matrix **export** (matrix grid, req × case) | **Partial** | traceability-summary/detail are list/chain views with CSV of the table; no matrix-format export (PDF export is table-only, ReportExportMenu header) |
| Test run comparison (same case across runs, diff view) | **Partial** | multi-cycle-detail pivots latest status per cycle; no run-level diff/re-run comparison |
| Defect density (defects per module/component/req) | **Partial** | RPC `tm_compare_cycles` returns `defect_density` per cycle (useCycleAnalytics.ts:157,190) — not in hub; no per-module density |
| Execution trend across projects / org roll-up | **Missing** | Every hub report is single-project (project picker); no cross-project/org dashboard |
| Escaped-defect / defect leakage report (found-in-prod vs found-in-test) | **Partial** | sprint-testing-status counts QA Bugs vs Production Incidents (useSprintTestingStatus.ts:126–129) but no leakage ratio/phase-containment report |
| Reopened-defect rate | **Missing** | Needs tm_defects status history; only closure capture (from 2026-07-03) exists |
| Test case aging / staleness (not executed in N days, last-updated) | **Missing** | case-usage counts cycles, not recency |
| Environment / platform coverage matrix | **Missing** | `environment` columns exist in schema (types.ts:9164,9632) — no report consumes them |
| Release readiness scorecard (go/no-go roll-up) | **Partial** | tm_release_signoffs feeds approval-age only; no readiness composite |
| Scheduled/emailed report subscriptions | **Missing** | Saved views exist (tm_saved_reports) but no scheduling/delivery |
| Custom report builder | **Missing (dead code)** | `src/components/reports/ReportBuilder.tsx` orphaned, never routed |
| Effort/estimation vs actual execution time | **Partial** | `avg_execution_time` in RPCs only; no planned-vs-actual |
| Test plan progress report (per-plan roll-up) | **Partial** | RPC `tm_get_plan_analytics` exists (useCycleAnalytics.ts:223–257) — not surfaced in the hub |
| Coverage report (req coverage %) | **Have** | project/sprint testing-status + traceability-summary compute coverage % |
| Execution burnup/burndown, velocity | **Have** | hub #3/#4 + Cycle Command Center velocity |

---

## 5. Key risks & facts for the Plan Lock

1. **Silent query errors in 7 of the 10 dedicated-body hooks** (§2) — the flagship default report (sprint-testing-status) is the worst offender (6 unchecked queries). Errors masquerade as "0 stories / 0 coverage". Fix pattern already established in memory (silent-query-error sweep).
2. **Sprint scoping is client-side JSONB scan**: useSprintTestingStatus/usePointsBurndown fetch ALL Stories / QA Bugs / Production Incidents org-wide and filter `sprint_release` in JS (comment: "PostgREST containment encoding is unreliable for names with spaces/commas"). Non-scalable at production data volumes.
3. **Two parallel analytics stacks**: hub = client-side aggregation over raw tables; Cycle Command Center = server-side `tm_*` RPCs computing overlapping metrics (tester performance appears in BOTH with different formulas). Divergent numbers between surfaces are likely.
4. **History-gated reports** (defect-closure-trend, points-burndown, incident MTTR) accrue from 2026-07-03 trigger; near-empty until data accumulates — by design, no backfill (zero-assumption law).
5. **Export limitation**: PDF is table-only, no chart images (ReportExportMenu.tsx header).
6. **Ready-made growth levers, no refactor needed**: unused `automation_*` tables (flaky/automation reports), un-surfaced `tm_get_plan_analytics` + `defect_density`/`health_score` RPC fields, `environment` columns, and the empty `/project-hub/:key/reports` slot.
7. Legacy dead weight (not to refactor, just to know): 9 orphaned components in `src/components/reports/`, 3 dead Lab report defs, orphaned `src/components/evidence/reports/`, and `/release/incidents/reports` reading the 0-row `incidents` table.
