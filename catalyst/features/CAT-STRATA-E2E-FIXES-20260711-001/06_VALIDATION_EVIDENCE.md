# 06 — VALIDATION EVIDENCE — Slice 1

Environment: `localhost:8080`, user Vikram Indla, after Vite dep-cache repair.
Method: DOM/URL/live probes via Chrome MCP (screenshots are corroboration, not proof).

## STRATA-E2E-002 — cycle persists on refresh ✅
- Selected `ZZTEST-STRATA-E2E-FY27-Cycle` → URL became `?cycle=zztest-strata-e2e-fy27-cycle`.
- Hard-reloaded that URL → Cycle selector stayed on the FY27 cycle, Period `Q1 ZZTEST-…-FY27-Cycle`,
  hierarchy showed FY27 records. (Previously reset to FY2026 / Q2 FY2026.)

## STRATA-E2E-001 — execution cycle filter leak ✅
- Execution page, FY27 cycle selected.
- Before fix (observed): Total Project Cards **29**, Unassigned **28** (FY2026 population leaked).
- After fix: Total Project Cards **1**, Unassigned **0**; "By Strategic Theme" shows only
  `ZZTEST-STRATA-E2E-Service-Excellence`. Roll-ups now cycle-pure.

## STRATA-E2E-005 — Project Card authoring fields ✅
- New project card modal now exposes: Leading Business Unit / Team, Delivery Team,
  Department / Sector, Portfolio (with value-rollup helper) — in addition to prior fields.
- Backed by existing columns/RPCs; Portfolio chained to `strata_add_portfolio_member`.

## STRATA-E2E-007 — 1993 date placeholder ✅
- New project card date fields (Baseline start/end, Forecast end) now show placeholder
  "Select date" instead of `2/18/1993`.

## Typecheck
- `npx tsc --noEmit -p tsconfig.json` → no errors (run after every edit + after 001 decision update).

## Notes carried to Slice 2
- 003 `ZZTEST-STRATA-E2E-Delivery-Objective` is present in the FY27 hierarchy — consistent with
  the boot-cache theory that the QA "silent failure" was environmental. Latent role-gate bug remains
  (button shown to 4 roles; RPC accepts `strategy_office`+admin only).
- 008 confirmed live: "B2B Growth Engine" (Theme) nested under "Digital Market Leadership" (Theme).

---

# Slice 2 — DB defects on staging (cyijbdeuehohvhnsywig; prod not MCP-reachable)

## STRATA-E2E-008 — theme-under-theme ✅ (applied + verified live)
- Before: 5 themes had a theme parent (B2B Growth Engine, Network Excellence, Investor
  Journey Transformation, Investment Operations Excellence, Enterprise Expansion Play).
- Migration `20260711182113_strata_flatten_theme_hierarchy_e2e.sql` set theme parent_id = NULL.
- After: `SELECT count(*) ... element_type='theme' AND parent_id IS NOT NULL` = **0**.
- Live: Strategy Room hierarchy now shows every Theme root-level; objectives stay under themes.
- Objective-under-objective trees left intact (intentional model, distinct from 008).

## STRATA-E2E-004 — milestone rollup ✅ (applied + verified on staging)
- Migration `20260711221000_strata_rollup_weight_fallback_e2e.sql`: weight-weighted actual-progress
  fallback when no milestone carries a baseline duration.
- Verified: recalc of ZZTEST-STRATA-E2E-Project-A (milestone weight 100, progress 70, no baseline
  dates) returned `actual_progress_pct: 70` (was NULL) and wrote actual_progress=70 to the card.
  Health stays `not_available` — correct: schedule variance/forecast need a baseline window.
- Frontend: milestone form surfaces baseline-date + weight helpers (ProjectCardDetailView.tsx).

## STRATA-E2E-003 — objective role gate ✅ (frontend)
- RPC `strata_create_project_objective` accepts strategy_office + admin only (verified via
  pg_get_functiondef on staging). Button now gated by OBJECTIVE_WRITE_ROLES to match — no more
  "button shown but RPC rejects" for vmo_validator / data_steward.

## Deferred
- 006 Risk/Blocker — a full feature (schema + RPC + RLS + UI); its own slice.
- 009 console warnings — minor cleanups.

## Environment note
The corrupt-Vite-dep-cache boot failure recurred after edits; fixed each time with
`rm -rf node_modules/.vite` + restart. Fragile re-optimize in this environment.
