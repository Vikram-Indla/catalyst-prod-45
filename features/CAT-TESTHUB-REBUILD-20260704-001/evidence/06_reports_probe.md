# Evidence — Reports Subsystem Probe (VERIFIED 2026-07-04/05)

## Architecture
26 registry entries (report-registry.ts), ALL status 'wired', ZERO fake/placeholder. 16 via shared adapter (WiredReportBody → useRealTestReportData [10 queries/project] → lab ReportCanvas); 10 dedicated bodies with own hooks. **Zero RPC usage — all client-side JS joins over raw selects** (87 tm_ RPCs incl. tm_compare_cycles, tm_get_cycle_*×9, tm_get_traceability_matrix, v_tm_requirement_coverage all UNUSED).

## Verdict totals
~18 keep, 7 refactor, 1 merge. 0 fake.

## Refactor list (specific defects)
- execution-burndown: ideal line indexes days-with-runs not calendar days (reportData.ts:163-175) — slope wrong with gaps.
- execution-distribution: identical selector to execution-overview → merge.
- defect-summary: `isOpen = c !== 'Done'` CAPITALIZED vs sibling hooks' lowercase 'done' — casing split-brain; tmDefects count error unchecked.
- product-status: **hardcoded {qaBugs:0, incidents:0, tmDefects:0}** — factually-false 0-defect cards (zero-assumption violation); case_key = truncated UUID slice(0,8).
- tester-performance + team-performance: execution attributed to case ASSIGNEE not executed_by — misstates who ran what.
- traceability-summary: coveragePct = linked÷totalCases (share-of-all-cases, not requirement coverage); v_tm_requirement_coverage unused.

## TOP ISSUES (ranked)
1. **P1 — all 10 dedicated bodies swallow errors into infinite spinner** (`isLoading || !data ? Spinner` with no isError branch; boundary never reached). Only WiredReportBody correct (rethrows line 144). One-line fix each.
2. **P1 — banned {data}-only destructures** in picker hooks: GovernanceBody:27, DefectClosureTrendBody:30, TeamPerformanceBody:31, DefectSummaryBody:40, SprintTestingStatusBody:44, PointsBurndownBody:41 + unchecked tmDef.error useDefectsIncidents:47.
3. **P1 — status_category casing split-brain** ('Done' vs 'done' vs toLowerCase across hooks) — needs one live probe + normalization helper.
4. **P2 — zero RPC/analytics use**; sprint reports 3× full paged ph_issues scans (~2400 rows)/render. Won't scale.
5. **P2 — saved views broken for sprint/tester/epic params** (only project+range persisted) — INCLUDING default report sprint-testing-status.
6. P3 — 4 orphaned lab defs (project-overview/metrics/activity, lab-defect-summary) unreachable; export missing on 5 dedicated bodies (Governance, ProductStatus, ProjectTestingStatus, Team/TesterPerformance); export try/finally no catch; execution-history 100-row cap.

## Hub UX
/testhub/reports/:reportSlug, default sprint-testing-status. ReportNavigator (9 categories) + Saved section. tm_saved_reports (parameters JSONB {projectId,range}, is_shared, RLS owner+shared). Deep-link ?project=&range=. Picker defaults exemplary (useReportPickerDefault — no alphabetical-first lies).

## Charting/Export/Lab
- ReportChart token-pure (adsChartTheme, zero hardcoded). Nit: ReportNavigator hand-rolled status pill.
- Export: 16 lab slugs CSV+PDF (table-only, no charts); deriveWiredAggregates → report-insights edge fn (Caty narrative on all 26).
- lab/ = chassis library, not routed; demo generator deleted.

## Missing vs canon (feasibility)
- Pass/fail RATE trend: easy (data fetched already).
- Defect leakage (test-found vs prod-found): feasible now (tm_defects vs ph_issues Production Incident via parent_key).
- Release readiness report: feasible (tm_release_signoffs + readiness RPCs exist).
- Flaky cases: feasible (status flips across tm_test_runs per scope) — no flaky code in testhub reports (note: useFlakyTestDetection.ts exists in test-management hooks).
- Requirement coverage: swap to v_tm_requirement_coverage / tm_get_traceability_matrix.
- Defect MTTR: intentionally in Incident Hub.

## Preserve in rebuild
Registry+renderer+boundary pattern, fetchAllPages, useReportPickerDefault, adsChartTheme, honest undatedClosed/unplottedDone, pure-selector reportData.ts shared by canvas+export, governance/mismatch category (differentiator).
