# Phase 0 — Preflight: Test Hub Reporting Command Center
**Feature Work ID:** CAT-TESTHUB-REPORTS-20260627-001  
**Date:** 2026-06-27

---

## Branch
`main`

## Modified files before starting
- `bun.lock` (minor dependency lock update from prior unrelated work)

## Package manager
**bun** (bun.lock present; `packageManager` field not set in package.json)

## Detected Test Hub routes
| Route | Component |
|---|---|
| `/testhub` | redirect → `/testhub/dashboard` |
| `/testhub/dashboard` | DashboardPage |
| `/testhub/board` | BoardPage |
| `/testhub/my-work` | MyWorkPage |
| `/testhub/filters` | FiltersListPage |
| `/testhub/repository` | RepositoryPage |
| `/testhub/sets` | TestSetsPage |
| `/testhub/cycles` | CyclesPage |
| `/testhub/cycles/:id` | CycleDetailPage |
| `/testhub/cycles/:id/execute` | ExecutionPage |
| `/testhub/defects` | DefectsPage |
| `/testhub/traceability` | TraceabilityPage |
| `/testhub/reports` | **ReportsPage** (tile grid — existing) |
| `/testhub/reports/:type` | **ReportDetailPage** (individual reports — existing, real data) |
| `/testhub/filters/create` | FilterPreviewPage |
| `/testhub/filters/:filterId` | FilterDetailPage |
| `/testhub/reports-lab` | **ReportsCommandCenterPage** ← TO BUILD |

## Detected Supabase environment
| Env file | Project | Purpose |
|---|---|---|
| `.env.local` | `cyijbdeuehohvhnsywig` (cyij) | **DEV/TEST — used by dev server** |
| `.env.staging` | `cyijbdeuehohvhnsywig` (cyij) | Same project |
| `.env.local.prod-backup` | `lmqwxxxxxx` | Production (backup reference only) |

**Conclusion:** Dev server connects to `cyij` (non-production). Safe for lab and real-data wiring.

## Existing charting libraries
- **recharts** — installed (confirmed in package.json)
- **d3** + **@types/d3** — installed
- No charts currently in testhub pages

## Existing export utilities
- `src/utils/exportDefects.ts` — CSV + XLSX export via `xlsx` library (already installed)

## Risks
1. `tm_saved_reports` table referenced in ReportDetailPage — must confirm it exists before real wiring
2. `ph_issues` used for traceability — needs RLS check
3. `tm_defect_links` join depth — could be slow without index
4. recharts bundle size — already installed, no additional risk
5. Color compliance — must run ADS token grep before every styled commit

## Safety Statement
> **No real data wiring or schema changes will happen before UI/UX lab approval.**
> 
> The lab route (`/testhub/reports-lab`) uses seeded deterministic data only.
> No Supabase reads or writes occur in the lab phase.
> Production Supabase (lmqw project) is not referenced anywhere in this work.
