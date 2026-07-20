# Session 001 — baseline, gap-map, S0

## Baseline
- Found HEAD 15 behind `origin/main`; fast-forwarded `main` → `09444187f` (lossless, 0 local commits). Cut `strata/kpi-operating-model`.
- Sibling worktrees `strata/theme-measurement-method`, `strata/sc-defect-pack` left untouched.

## Gap-map (read-only, 5 parallel sonnet investigators)
- Verified 53-row ledger → `02_GAP_MAP_LEDGER.md`. Tally 9 SATISFIED · 24 PARTIAL · 20 MISSING.
- Surfaced the KR↔Assignment design conflict (D-1) and the 007/008 worktree dependency (D-2).

## Decisions taken
- D-1 additive bridge; D-2 007/008 excluded; D-3 build S0→S1→S2+S3. See `09_DECISIONS.md`.

## S0 — OKR/KR governance wiring (no new schema)
Migration `supabase/migrations/20260720120000_strata_s0_okr_kr_governance_wiring.sql` (CREATE OR REPLACE, additive):
- **STRATA-KPI-010** PARTIAL→SATISFIED: `strata_okr_validate` now runs `strata_kr_validate_contract` for every non-retired KR at `approve` stage (`KR_CONTRACT_INVALID`); draft/submit unaffected.
- **STRATA-KPI-021** PARTIAL→SATISFIED: new `strata_kr_assert_editable`; `strata_configure_kr_source/formula/phasing` now block material edits once the parent OKR leaves draft/rejected.
- **STRATA-KPI-020** PARTIAL→SATISFIED: `strata_okr_official_progress_v2` honors versioned `weighting_policy` (null/'auto' = prior behavior → no existing number moves; 'equal'/'weighted' governed overrides); exposes `weighting_policy_mode`.
- **STRATA-KPI-011** PARTIAL→(mostly): `shared.tsx` wires **Withdraw** (draft/submitted) + **Cancel OKR** (active/closing_review, reason required) buttons via existing `withdrawOkr`/`cancelOkr`. NOTE: a distinct "request-changes" *state* (vs reject) needs an enum+column → deferred to a later schema slice; not done in S0.

## Verification (S0)
- `kpi-opmodel-s0-governance-wiring.guard.test.ts` — 7/7 PASS (Node 22).
- `npm run build` — green (typecheck + vite compile).
- `npm run lint:colors:changed:ci` — 0 hard-coded colours on changed files.
- `kodef003-okr-ui` lifecycle tests — PASS.
- Pre-existing/unrelated: `ac6-keyboard-weight-change.test.tsx` (2 fail) renders `ScorecardModelsSection`, imports nothing S0 touched — NOT an S0 regression.

## S1 — governed KPI classification (commit a12a81655)
Migration `20260720121000`. usage_class(5)/business_category(new dict+RLS+upsert)/official_scope/kr_eligible/aggregation_policy on strata_kpis; backfill usage_class from is_strategic (complements, not replaces); element_kpis.link_role='diagnostic' (KPI-006); validator requires usage_class + consistent kr_eligible (KPI-022); strata_classify_kpi write path. Domain: classifyKpi/kpiCategories/upsertKpiCategory. Verified: guard 7/7, build green, colour clean. 004/005/006/022 built*; 023 still partial.

## S2+S3 — assignment spine + aggregation (commit ed3ff6503)
Migrations `20260720122000` (S2), `20260720123000` (S3). strata_kpi_assignments (own numeric target, scope CHECK, lifecycle+SoD, KPI-025/027) + strata_kpi_assignment_observations (keyed assignment,period,as_of — KPI-026) + resolve/submit/validate (SoD). strata_kpi_contribution_mappings (direct_component|driver|supporting_evidence|none, KPI-028/030) + strata_contribution_validate (KPI-029) + strata_calc_assignment_rollup authoritative aggregation exposing num/den/weights/exclusions/overlaps/provenance (KPI-031). Domain methods added. Verified: guard 10/10, build green, colour clean. 025-031 built*.

`*` built = migration-guard + build + colour only. DB execution / RLS / maker-checker / aggregation ARITHMETIC unproven (no DB).

## Blocked / pre-merge gates
- No local DB (Docker down) → DB-execution / RLS / maker-checker / aggregation-math runtime proof externally blocked. Highest risk: S3 aggregation arithmetic.
- UI: withdraw/cancel buttons (S0) + classification/assignment surfaces (S1/S2/S3) need screenshot signoff (no browser this session).
- Not built (unauthorized): S4/S5/S6/S7/S8. Blocked: 007/008 (D-2).
- Nothing pushed. Local commits only: 7c160d34b, c2bef8e36, a12a81655, ed3ff6503.
