# Plan Lock — CAT-TESTHUB-REPORTS-20260627-001
**Status: DRAFT — awaiting Vikram approval**

---

## Objective
Build a premium executive Reporting Command Center for Test Hub, replacing the tile grid + plain table pattern with a unified left-navigator + recharts-powered canvas.

## Non-scope
- No new Supabase tables or schema changes
- No production Supabase access
- No new npm/bun packages
- No changes to other Catalyst pages
- No Gemini Gateway changes in lab phase
- No real data wiring until lab is approved

## Timebox
2-hour implementation slices. Phase 4 (UI lab) = Slice 1.

---

## Files to create (Phase 4 — lab only)
```
src/pages/testhub/reports/lab/
  ReportsCommandCenterPage.tsx          — main page shell
  ReportNavigator.tsx                   — left nav, grouped list, status badges
  ReportFilterBar.tsx                   — persistent filter bar
  ReportMetricRibbon.tsx                — 8-metric top KPI ribbon
  ReportCanvas.tsx                      — main report display area
  ReportChartPanel.tsx                  — recharts-powered chart zone
  ReportDrilldownTable.tsx              — sortable/filterable table
  ReportInsightPanel.tsx                — AI insight + coverage gap panel
  ReportFormulaDrawer.tsx               — formula explanation drawer
  ReportExportMenu.tsx                  — export/share/save actions (lab-disabled)
  ReportEmptyState.tsx                  — premium empty states
  ReportSkeleton.tsx                    — skeleton loading
  useSeededTestReportData.ts            — deterministic seeded data hook
  reportDefinitions.ts                  — report catalogue, groupings, status
  reportCalculations.ts                 — all formulas (unit tested)
```

## Files to create (route)
- Add `/testhub/reports-lab` route to `src/routes/FullAppRoutes.tsx`
- Add sidebar link (hidden in prod, visible in dev/staging)

## Files forbidden from modification
- `src/pages/testhub/reports/ReportsPage.tsx` — DO NOT touch until lab approved
- `src/pages/testhub/reports/ReportDetailPage.tsx` — DO NOT touch until lab approved
- Any Supabase migration files
- Any other Catalyst pages

---

## Canonical components
1. `ProjectPageHeader` — breadcrumb + title
2. `@atlaskit/lozenge` — status pills
3. `@atlaskit/badge` — KPI counts
4. `@atlaskit/tooltip` — formula tooltips, disabled-action tooltips
5. `@atlaskit/button` — actions
6. `recharts` — LineChart, BarChart, AreaChart, PieChart (already installed)

## Hand-rolled components allowed (with justification)
- `ReportNavigator` — no Catalyst nav component matches left grouped list + status badges pattern
- `ReportMetricRibbon` — no Catalyst KPI ribbon component
- `ReportChartPanel` — recharts wrapper with ADS tokens
- `ReportSkeleton` — custom skeleton matching our layout

## UI/UX rules
- ADS tokens only — zero bare hex, rgb, Tailwind color utils
- Full Catalyst content width (max 1440px)
- Dark mode: test after building with `VITE_FORCE_DARK=true` or reload-into-dark
- Status lozenges use `@atlaskit/lozenge` with appearance mapping (not custom CSS)
- All disabled actions show tooltip explaining why

## Data rules (lab phase)
- Zero Supabase reads
- Seeded data: 50 cases, 5 cycles, 150+ runs, 20 defects, multiple statuses/priorities/owners
- Formula results from `reportCalculations.ts` applied to seeded data

## Screenshot checklist
1. Execution Overview — default load
2. Execution Burndown — chart visible
3. Multi-Cycle Detail — matrix table
4. Project Metrics — metric rows
5. Traceability Summary — coverage view
6. Traceability Detail — hierarchy table
7. Dark mode — reload into dark
8. Narrow viewport (1024px) — readability preserved

## Validation commands
```bash
bun run typecheck
bun run lint:colors
bun run lint:colors:gate
bun run audit:ads:gate
bun run build
```

## Stop conditions
- Stop after Phase 7 (evidence captured)
- Do NOT wire real data until Vikram approves lab

## Drift/rebaseline rule
Any scope change → update this Plan Lock + log to 08_DRIFT_LOG.md before proceeding.

---

## Approval required before Phase 8
After lab approval, Phase 8 will:
1. Extract report hooks to `src/services/testhub/reportService.ts`
2. Replace seeded data with real Supabase queries
3. Add pagination, server-side aggregation, RLS-safe patterns
4. Wire export via `exportDefects.ts` pattern
5. Confirm `tm_saved_reports` table exists before wiring Save
6. Add AI via Gemini Gateway (after gateway location confirmed)
