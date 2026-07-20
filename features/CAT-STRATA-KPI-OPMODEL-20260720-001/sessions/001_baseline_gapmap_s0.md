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

## Blocked / pre-merge gates
- No local DB (Docker down) → DB-execution / RLS / maker-checker runtime proof externally blocked.
- UI screenshot signoff deferred (no browser/dev server this session).
- Nothing pushed. Local commits only.
