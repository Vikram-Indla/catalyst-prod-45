# PLAN LOCK — CAT-REPORTS-HUB-20260703-001 (Phase 1: Skeleton)

**Status:** APPROVED 2026-07-03 — Vikram: "make best of the decisions for me run all the phases with no interruption". Full-program autonomy; Phases 1–3 + light Phase 4 execute without per-phase signoff. Interactive screenshot signoff waived by Vikram; replaced by tsc + lint:colors:gate + audit:ads:gate per phase + end-of-run screenshot evidence.
**Basis:** COUNCIL_VERDICT_AND_PLAN.md §6 + PHASE0_DATA_CONTRACT_PROOF.md (Phase 0 complete).

## Objective
Single Reports hub at `/testhub/reports` using the Reports Lab shell as chassis, backed by a pluggable report registry, all canonical components, ADS tokens only. 23-report disposition matrix is the target catalog.

## Non-scope (Phase 1)
- No new DDL. No prod (lmqw) access of any kind.
- No AI narratives, no ECharts, no export work, no incident-hub mount (Phase 2 Lane C), no Lab report wiring (Phase 2 Lane B).
- Native `incidents` table adoption — out of scope entirely.

## Slices (2h each)
| Slice | Work | Done when |
|---|---|---|
| S1.1 | `src/components/testhub/reports/report-registry.ts` + types (`ReportDefinition {id,label,category,module,dataFetcher,calculator,component,defaultSpan,usesDateRange,usesFilters,status}`) generalizing widget-registry pattern; `ReportRenderer` (Suspense, error → SectionMessage+Retry, @atlaskit/empty-state). Sprint-testing-status rendered through it as proof | tsc clean; sprint report renders via registry on staging data |
| S1.2 | Mount Lab shell (ReportNavigator/MetricRibbon/FilterBar) at `/testhub/reports` with `:reportSlug` param; sidebar → single "Reports" item (✦ deleted); 9 old routes → redirects; DEMO-DATA SectionMessage banner on every unwired report | screenshot signoff light+dark; all old URLs redirect |
| S1.3 | Canonical sweep inside chassis: JiraTable + makeKeyCell/makeSummaryCell (Grid H typography), StatusPill(cells), JiraIssueTypeIcon, ProjectIcon, CatalystAvatar; fix TicketKeyChip rgba fallbacks | zero `<table>` in reports tree; lint:colors:gate + audit:ads:gate clean |
| S1.4 | `src/lib/charts/adsChartTheme.ts` — ADS_SERIES from `--ds-chart-categorical-1…8`; shared ReportChart wrappers (Line/Bar/Area/Pie over recharts) with token axis/grid/tooltip | one chart verified reload-into-dark; gates clean |
| S1.5 | Default project = active project context; empty-state when none (kill alphabetical default) | verified behavior + screenshot |

## Files to modify
`src/routes/FullAppRoutes.tsx`, `src/components/layout/TestHubSidebar.tsx`, `src/pages/testhub/reports/lab/*` (chassis promotion), new `src/components/testhub/reports/*`, new `src/lib/charts/adsChartTheme.ts`, `src/components/.../TicketKeyChip` (fallback fix), `src/lib/routes.ts` (testHubRoutes.report(slug)).

## Files forbidden
`supabase/migrations/*` (no DDL), `src/pages/testhub/reports/ReportDetailPage.tsx` deletion deferred to Phase 2 Lane A completion (redirect first, delete after ports), anything under `src/modules/incidents/*` (Lane C), prod config.

## Rules in force
ADS tokens only (no hex fallbacks); JiraTable mandatory; CRE Grid E layout (CatalystListPageLayout/AtlaskitPageShell + ProjectPageHeader trail); Slug Contract (`:reportSlug`, no ids); zero-assumption rendering (unwired report = DEMO banner or hidden, never silent fake); category→Lozenge for status (never ph_workflow_statuses.color hex); screenshot signoff per UI slice; stage explicit files only; move-not-copy when porting.

## Validation commands
`npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · dev server localhost:8080 screenshots (light + reload-into-dark).

## Stop conditions
Any regression on existing 7 standalone reports before their Lane-A port → RED FLAG protocol. Any slice exceeding 2h → split. Drift from disposition matrix → log to 08_DRIFT_LOG.md and ask.
