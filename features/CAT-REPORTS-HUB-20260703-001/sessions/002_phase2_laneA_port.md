# Session 002 — Phase 2 Lane A: port bodies, delete legacy (2026-07-03)

**Feature:** CAT-REPORTS-HUB-20260703-001 · **Scope:** Lane A move-not-copy port.

## Done
- Convention chosen: hooks move too → `src/components/testhub/reports/hooks/` (git mv, 7 hooks).
- 7 Bodies relocated to `src/components/testhub/reports/bodies/` (default-exported); registry lazy-imports repointed at `./bodies/*`.
- Deleted (git rm): 7 standalone report pages, `ReportDetailPage.tsx` (1366 LOC legacy), `ReportsPage.tsx` (old tile catalog), `lab/ReportsCommandCenterPage.tsx` (zero importers each — verified by grep before deletion).
- `ReportStatusView.tsx` stays in `src/pages/testhub/reports/` (used by bodies); its type import repointed to the moved hook.
- defect-summary: body renamed `DefectSummaryBody`, incident sections kept with `// LANE-C: incident section moves to /incident-hub/reports` comments; registry label set to "Defects & Incidents" until Lane C.
- product-status picker parity: `useReportPickerDefault` with new `REPORTS_LAST_EPIC_KEY` (`catalyst.reports.lastEpic`); killed BAU-4466/first-epic auto-default; "Select an epic" empty state.
- Charts (ReportChart wrappers, tokens only, zero-assumption — hidden when all counts zero):
  - SprintTestingStatusBody: ReportPieChart of scope status_category counts; `useSprintTestingStatus` minimally extended with `storyStatusCounts` (count-based only).
  - DefectSummaryBody: ReportBarChart open-vs-closed defects (counts already fetched).

## Validation (raw)
- `npx tsc --noEmit` → no errors.
- `npm run lint:colors:gate` → ✅ 0 = baseline 0.
- `npm run audit:ads:gate` → ✅ under baseline; ratcheted down tokens 27350→27345, typography 1663→1660 (`audit-baseline.json` updated).
- grep: no live references to any deleted file (only stale entries in generated `usage-map.generated.ts` and port-origin comments).

## Next
- Lane B (wire Lab demo reports), Lane C (incident half → /incident-hub/reports, retitle defect-summary).
