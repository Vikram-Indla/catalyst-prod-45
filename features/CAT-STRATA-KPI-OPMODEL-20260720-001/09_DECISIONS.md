# Decisions — CAT-STRATA-KPI-OPMODEL-20260720-001

## D-1 — KR↔Assignment architecture (rows 013/014/016/019) — **ADDITIVE BRIDGE**
Approved 2026-07-20 (Vikram, via question). The shipped OKR model made prospective KRs independent contracts (kpi_id legacy-only) and standalone KRs reportable-by-default — opposite of prompt decisions #10/#14. Ruling: keep independent KR contracts; add an OPTIONAL Strategic-KPI-Assignment linkage + KR-eligibility so a KR MAY be officially KPI-backed; flip standalone-default to unofficial behind a governed, versioned policy flag so closed/historical OKRs keep frozen numbers. **No retroactive number movement.**

## D-2 — Theme measurement_method rule (rows 007/008) — **BLOCKED-ON-MERGE, EXCLUDED**
Approved 2026-07-20. The rule is unpushed in sibling worktree `strata/theme-measurement-method`, not on main. This feature will NOT touch that worktree and treats 007/008 as blocked pending that branch landing. Migration timestamps here stay clear of that branch's `20260719223152/223304`, `20260720054214`.

## D-3 — Slice authorization — **S0, S1, S2+S3**
Approved 2026-07-20. Build order: S0 quick-wires → S1 classification layer → S2+S3 assignment + contribution/aggregation spine. Each slice ≤2h, DB→validator→RPC→UI→tests, one commit each, on `strata/kpi-operating-model`.

## D-4 — Feature Work ID + branch
`CAT-STRATA-KPI-OPMODEL-20260720-001`, branch `strata/kpi-operating-model` cut from `09444187f`. Confirmed by D-3 authorization.

## Environmental constraint (not a decision, a fact)
No local Supabase (Docker daemon down); staging/prod writes forbidden. DB-execution / RLS / maker-checker RUNTIME proof is externally blocked. Slices are verified by forward-only migration + TS migration-guard tests + `build` + ADS color/audit gates. Runtime DB proof + UI screenshot signoff remain pre-merge gates for a human with a DB + browser.
