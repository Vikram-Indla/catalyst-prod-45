# Phase 3 — Package Decision
**Feature Work ID:** CAT-TESTHUB-REPORTS-20260627-001  
**Date:** 2026-06-27

---

## Existing packages confirmed
| Package | Version | Purpose |
|---|---|---|
| `recharts` | installed | Chart library — line, bar, area, pie, composed |
| `d3` + `@types/d3` | installed | Underlying math; recharts uses it internally |
| `xlsx` | installed | Excel export — already used in `exportDefects.ts` |
| `@tanstack/react-query` | installed | Data fetching, caching |
| `@atlaskit/*` | installed | ADS components — Spinner, Button, Lozenge, Badge, etc. |
| `react-router-dom` | installed | Routing |

## Decision: NO NEW PACKAGES REQUIRED

All charting, table, export, and UI primitives needed for the Reporting Command Center are already installed.

## How each is used

| Package | Lab phase usage | Real data phase usage |
|---|---|---|
| `recharts` | LineChart (burndown/burnup/trend), BarChart (distribution, summary), AreaChart (history), PieChart (distribution overview), ComposedChart (multi-line+bar) | Same |
| `xlsx` | Not used in lab (export disabled with tooltip) | Export XLSX via existing exportDefects.ts pattern |
| `@atlaskit/lozenge` | Status lozenges (passed/failed/blocked/not-run) | Same |
| `@atlaskit/badge` | KPI ribbon counts | Same |
| `@atlaskit/spinner` | Fallback only (skeletons primary) | Same |
| `@atlaskit/button` | Actions bar, filter buttons | Same |
| `@atlaskit/tooltip` | "Show calculation" tooltip, disabled action tooltips | Same |

## Bundle / performance risk
- recharts: already in bundle — ZERO additional cost
- d3: already in bundle — ZERO additional cost
- Lab route is lazy-loaded (will verify route setup) — no impact on initial bundle

## Accessibility risk
- recharts charts: need `role="img"` + `aria-label` on SVG wrappers — will implement
- Tables: need proper `<th scope>` + `caption` — existing ReportTable pattern already correct

## Lab-only vs real implementation

| Feature | Lab phase | Real phase |
|---|---|---|
| Charts | recharts + seeded data | recharts + real query data |
| Export | Buttons visible, disabled with tooltip | xlsx export wired |
| Save/Share | Buttons visible, disabled with tooltip | tm_saved_reports write |
| AI summary | Deterministic seeded text | Gemini Gateway call |
| Pagination | Client-side on seeded data | Server-side cursor pagination |
