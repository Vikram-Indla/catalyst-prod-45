# UI Lab Evidence — CAT-TESTHUB-REPORTS-20260627-001

**Date**: 2026-06-27  
**Route**: `/testhub/reports-lab`  
**Data**: 100% seeded — zero Supabase reads  
**Gate status**: ALL PASS

---

## Build Gates

| Gate | Result |
|---|---|
| `bun run lint:colors:gate` | ✅ 713 = baseline 713 — no new hard-coded colors |
| `bun run audit:ads:gate` | ✅ no category above baseline — tokens dropped (can ratchet) |
| `npx tsc --noEmit` | ✅ 0 TypeScript errors |

---

## Browser Probe (DOM validation)

```
URL:       http://localhost:8080/testhub/reports-lab
Tab title: Reports Lab · Catalyst
divCount:  93 (healthy render, not 28 = crash)
h1:        "Execution Overview"
recharts:  true
tables:    1
```

**KPI Ribbon (verified live values from seeded data):**
- Total Cases: 50
- Total Cycles: 5
- Total Runs: 180
- Pass Rate: 57% (below 80% → danger highlight — correct)
- Failed: 35
- Blocked: 29
- Open Defects: 13 (>5 → danger highlight — correct)
- Coverage: 70% (below 80% → warning highlight — correct)

**Page structure verified:**
- Sidebar: "Reports Lab ✦" entry present and navigates correctly
- Breadcrumb: Home → Test Hub → Reports → Command Center
- Header badge: "STAGING UI LAB · SEEDED DATA" (warning tone)
- Export actions: all 4 present (CSV, XLSX, Share, Save view)

---

## Report Inventory (20 total)

### Execution (6)
| Slug | Status | Notes |
|---|---|---|
| execution-overview | ✅ PARTIAL | PieChart + table |
| execution-summary | ✅ READY | Stacked BarChart |
| execution-burndown | ✅ PARTIAL | ComposedChart ideal + actual |
| execution-burnup | ✅ PARTIAL | Dual area (total/passed) |
| execution-distribution | ✅ READY | Horizontal BarChart |
| execution-history | ✅ READY | Table with cycle rows |

### Test Cases (2)
| Slug | Status | Notes |
|---|---|---|
| case-distribution | ✅ READY | PieChart + BarChart dual |
| case-usage | ✅ READY | Table with run count, last used |

### Defects (3)
| Slug | Status | Notes |
|---|---|---|
| defect-summary | ✅ READY | BarChart by severity |
| defect-impact | ✅ READY | Sortable impact matrix |
| defect-trend | ✅ READY | AreaChart over time |

### Multi-Cycle (3)
| Slug | Status | Notes |
|---|---|---|
| multi-cycle-comparison | ✅ READY | LineChart pass rate trend |
| multi-cycle-summary | ✅ READY | Table delta vs previous |
| multi-cycle-detail | ✅ PARTIAL | Case×cycle matrix |
| multi-cycle-distribution | 🟡 PARTIAL | Stacked bar + pivot |

### Project (3)
| Slug | Status | Notes |
|---|---|---|
| project-overview | ✅ READY | Metric grid |
| project-metrics | ✅ READY | LineChart + metrics table |
| project-activity | ✅ READY | Activity log table |

### Traceability (2)
| Slug | Status | Notes |
|---|---|---|
| traceability-summary | 🟡 PARTIAL | BarChart + coverage % |
| traceability-detail | ✅ READY | Full case×requirement matrix |

---

## ADS Color Compliance

- All recharts SVG hex values isolated in named palette constant `P` in `ReportCanvas.tsx`
- Escape hatch documented: `// ads-scanner:ignore-next-line` + `// ads-scanner:ignore-line`
- Reason documented: SVG attributes cannot reference CSS variables (engine resolves before cascade)
- All JSX-rendered elements (non-SVG) use `var(--ds-*)` tokens exclusively
- Zero Tailwind color utilities in lab files

---

## Export Actions

All 4 export CTAs disabled via `isDisabled` with Tooltip:
> "Export available after lab approval and real data wiring."

No dead buttons — all give feedback.

---

## AI Insights Panel

- Shows 4 common insights for every report
- Shows 1–2 report-specific insights for: burndown, defect-impact, traceability-summary, case-usage, multi-cycle-comparison
- Badge: "LAB — SEEDED" (information tone)
- Footer note: explains Gemini Gateway wiring plan

---

## Hard Stops Respected

- ✅ No Supabase reads in any lab file
- ✅ No production project touched
- ✅ No migrations run
- ✅ No schema changes
- ✅ Route is `/testhub/reports-lab` (lab-only, not replacing existing `/testhub/reports`)
- ✅ "STAGING UI LAB · SEEDED DATA" badge visible on every load

---

## Next Step (Phase 8 — gated on explicit approval)

Real data wiring requires:
1. `tm_test_cases` + `tm_test_cycles` + `tm_test_runs` queries (cyij project)
2. `tm_defects` + `tm_defect_links` queries
3. `ph_issues` for traceability
4. Filter params passed to queries (dateRange → created_at filter, cycle → cycle_id filter)
5. Replace `useSeededTestReportData` with `useTestReportData` (real hook)

**Do not start Phase 8 until Vikram explicitly approves UI/UX lab.**
