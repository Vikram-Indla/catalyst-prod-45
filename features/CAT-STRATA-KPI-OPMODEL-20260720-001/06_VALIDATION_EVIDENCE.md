# Validation Evidence — CAT-STRATA-KPI-OPMODEL-20260720-001

## Environment
- **catalyst-staging** `cyijbdeuehohvhnsywig` ONLY (via Supabase MCP, which cannot see prod). Prod `lmqwtldpfacrrlvdnmld` untouched — not in MCP scope.
- All 8 migrations applied via `execute_sql` with explicit versioned ledger rows → `schema_migrations` 1:1 with committed files (versions 20260720120000–127000).

## Pre-apply safety
- Confirmed staging had all prerequisites (OKR observation layer 20260719171205–195500) + the 3 unpushed theme-method migrations (staging is ahead of origin/main).
- Verified the 9 functions I `CREATE OR REPLACE` do NOT contain `measurement_method` logic → no clobber of the theme-method worktree's work.
- Formula EXCLUDE pre-check: 0 KPIs with >1 approved formula version on staging (constraint applied clean).

## Object verification (post-apply)
8 ledger rows · 5 new tables · 8 new functions · formula EXCLUDE constraint present · 3 classification columns · **RLS enabled + 2 policies on every new table**.

## Execution proofs (self-contained, rolled back via RAISE — zero test rows persisted)
| Claim | Rows | Result |
|---|---|---|
| Aggregation average, driver ignored, incompatible-unit excluded | 029/030/031 | `included_count=2, method=average, result=70.0000` (=(80+60)/2); driver(20) not in arithmetic; count-unit child excluded `INCOMPATIBLE_UNIT`; `has_overlap=false` (distinct scopes) |
| Aggregation weighted + overlap detection | 031 | `method=weighted_average, result=75.0000` (=(3·80+1·60)/4), `weighted_denominator=4`, `has_overlap=true` (shared scope) |
| KR bridge: manual cannot override assignment-backed | 014/017/018 | `source=assignment_observation, actual=90` (NOT manual 30), `progress=0.9000`, `reportable=true, kind=assignment_backed` |

## No-regression (D-1) proof on live staging data
- 6/6 existing OKRs backfilled `standalone_kr_policy='legacy'` (0 flipped to unofficial) → official numbers frozen.
- 20/20 existing KPIs classified (0 `usage_class` NULL); 0 `element_kpis` non-diagnostic.

## Defects caught by execution (fixed + committed 90bca17b)
1. `overlaps` is a reserved SQL keyword → renamed plpgsql var to `v_overlaps` (function would not compile). Text-only guards missed it.
2. Formula EXCLUDE would fail where a KPI has ≥2 approved formula versions → hardened backfill with `lead()` to close superseded windows.

## Not done
- Maker-checker SoD runtime proof via JWT impersonation (pattern identical to shipped OKR/scorecard SoD; deferred).
- S7 downstream UI (041/042/044/046) + browser screenshot signoff — not built.
- Nothing pushed; no PR; prod untouched.
