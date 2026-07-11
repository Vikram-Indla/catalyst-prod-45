# Session 006 — Sector/CXO scorecard seed + charter owner backfill (2026-07-09)

## Delivered (migration 20260709190000, applied to staging, exact-version ledger row)
1. **REQ-012 visual + REQ-013 remaining leg closed**: seeded `B2B Sector Scorecard` model (`owner_scope_type='sector'`, weighted_average, threshold `…0201`), model perspective weights (Financial 40 / Customer 35 / Digital 25), live Q2 FY2026 instance (`b2b-sector-scorecard-q2-fy2026`), 4 lines reusing existing demo KPIs.
2. **Calc-engine gap found+fixed during verification**: `strata_calc_scorecard_instance` scored all lines but returned total `has_data:false` because `strata_scorecard_model_perspectives` rows were missing — the weighted rollup iterates model perspective weights. Added to the migration before commit (file = exactly what was applied under that version).
3. **Charter truthfulness repair**: backfilled `owner_id` (from the ZZTEST charter's owner) on `status='complete'` charters that had owner NULL → 0 stale charters remain.

## DOM verification (:8081, rq-cache cleared each time)
- Scorecards landing: "Sector / CXO Scorecards" group renders with the new model, labeled "Sector / CXO Scorecard" (locked combined concept); Instances 3, sector instance LIVE (score dash before calc — zero-assumption).
- Sector detail (slug route): total 100 ON TRACK after Recalculate/calc, 3 perspective tiles at 40/35/25, 4 grouped lines. Full drilldown now possible: CEO Scorecard → Sector/CXO Scorecard → measure → Project Cards.
- Strategy Room: exactly 1 CHARTER INCOMPLETE remains — Digital Market Leadership (truthful: no charter row). B2B Growth Engine + Network Excellence now complete.

## Notes
- Recalculate button UX: no flag/toast observed on click and stale total persisted until reload (rq-cache) — AC6 candidate follow-up alongside AC8 tooltips.
