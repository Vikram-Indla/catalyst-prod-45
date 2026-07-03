# Validation Evidence — dark-mode screenshot pass (2026-07-03, session 004)

Method: reload-into-dark (localStorage flip alone insufficient — profile sync overrides;
used in-app toggle → data-color-mode=dark verified via JS before captures).

Reports captured in DARK on staging data (Senaei BAU):
- sprint-testing-status, execution-overview (8/3/1, 67%), execution-summary (stacked bars),
  execution-burndown (honest "No dated executions"), execution-burnup (empty-state),
  execution-distribution, execution-history (real runs, '—' dates), case-distribution
  (pie + priority bars), case-usage (STALE lozenges), defect-summary (704 defects, red bar),
  defect-impact, defect-trend (created-only + no-closure footnote), multi-cycle-comparison
  (pass-rate line), multi-cycle-summary, multi-cycle-detail (status pivot), multi-cycle-
  distribution (stacked), project-testing-status, product-status (epic empty-state),
  tester-performance (picker empty-state), team-performance (5 testers, 66.7%),
  governance (8 mismatches / 396 stories), traceability-detail (req→case→run→defect chain)
- /incident-hub/reports (152/15/151 + priority bars)

DEFECT FOUND + FIXED during pass: recharts entry animation froze bars at 0–5px height
(nondeterministic; incident priority, execution-distribution, multi-cycle-distribution).
Fix de2f8a2aa: isAnimationActive={false} across ReportChart wrappers + inline ComposedCharts.
Re-verified all three render fully in dark. tsc clean, color gate 0, ADS audit at baseline.

Known cosmetic leftovers (P2): execution-burnup shows empty chart frame above its
empty-state; theme persistence race (profile sync can override a just-toggled theme
on some loads) — pre-existing app-level behavior, not reports-specific.

Screenshots: session transcript 2026-07-03 (saved-to-disk ids ss_3803edb8f … ss_698218fxc).
