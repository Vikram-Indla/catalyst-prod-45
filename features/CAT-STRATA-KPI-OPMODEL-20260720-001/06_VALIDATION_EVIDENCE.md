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

## Round 2 — S9/S10/S11 + full staging verification (2026-07-20)
Applied migrations 20260720130000/131000/132000 (11 opmodel migrations total, ledger 1:1).
- **S9** (011/009/012/023/041/042/044): changes_requested state; approve_okr approves KR versions atomically; version impact preview; usage-class assigned-approver enforcement; element OKR readiness / health-from-KR / project-KPI-trace reads.
- **S10** (050/052/046): immutable strata_governance_snapshots + RPC; notification rules + stale-measurement + retirement-impact notifiers; review_id provenance columns.
- **S11**: observation inherits the assignment period (fixes silent no-data on assignment-backed KRs).

### Authenticated E2E + SoD on staging (impersonation via request.jwt.claims; rolled back)
Maker `0fd5b151`, checker `6bbd0863` (distinct strategy_office users):
`create → submit → approve → observe → validate` all succeeded end-to-end.
- **SoD maker-checker BLOCKED_OK** on assignment approval (submitter ≠ approver) AND observation validation (submitter ≠ validator).
- Period-scoped resolution returns value=88 after the S11 fix.

### Defect #3 caught by E2E (fixed, S11): observation logged without a period never resolved against the assignment's period → assignment-backed KRs silently blank. Fixed by inheriting the assignment period.

### Regression (step 7) — full strata suite (627 tests), Node 22, sequential
- **Zero new failures from this work.** All non-opmodel failures are pre-existing on origin/main — proven by reverting ONLY shared.tsx+domain to base and re-running: the 7 scorecard/keyboard/decision UI files (ac6-*, p0-approved, phase5, rd-cycle4, scgov-*) fail identically on base.
- The 2 guard tests (kodef001, kodef003) that broke were MY legitimate supersession (S1/S5/S9 superseded the guarded functions); updated to verify the invariants against the new latest definitions. 49/49 opmodel guards + both updated guards green.

## Round 3 — partials (003/038/046/052) + UI (2026-07-20)
Migrations 20260720133000 (S12), 134000 (S13) applied + verified on staging:
- **003**: `strata_calc_kpi_achievement` now resolves the effective formula via `strata_resolve_kpi_formula`. No-regression PROVEN: 83.33 / 88.57 / 111.25 identical before/after on 3 live KPIs.
- **038**: governed alignment exception bypasses the contradiction hard-block — `exception_applied=true` proven (rolled back).
- **046**: retiring an approved contribution mapping without review → `REVIEW_REQUIRED` `BLOCKED_OK` proven (rolled back).
- **052**: approving a KPI assignment notifies the owner (wired into `strata_approve_kpi_assignment`).

### UI surface — `/strata/kpi-governance` (StrataKpiGovernancePage), ADS-only, colour gate clean
Browser screenshot acceptance against **staging** (dev server on :8080 = this checkout; app → cyijbdeuehohvhnsywig):
1. Empty state + "New KPI Assignment" create form (approved-KPI Select, scope, target, KR-eligible) + governance note.
2. Populated list (seeded `KA-DEMO00001`, then deleted): DynamicTable with Assignment / Scope / Target / **DRAFT lozenge** / **Submit + Retire** lifecycle actions, role-gated.
Covers assignment CRUD + lifecycle + scoped observation submit/validate + authoritative roll-up display. Build green; the RPCs it calls are the same ones proven in the authenticated E2E.

## Round 4 — all remaining UI surfaces + S14 (2026-07-20)
- **S14** (migration 20260720135000): browser testing of the roll-up UI revealed the frontend passes `p_as_of := null` → `as_of_date <= NULL` always false → `included 0`. COALESCE guard added to `strata_calc_assignment_rollup` + `strata_resolve_assignment_observation`. **Confirmed live in the browser: "Result: 72 · method average · included 1"** after the fix (same class as the shipped 195500 KR-calc guard).
- **UI surfaces (all built, ADS-only, colour gate clean, browser screenshot-accepted on staging):**
  1. **Contribution Mappings** (in assignment detail) — create direct_component|driver|supporting_evidence + weight → submit → approve; verified live with `KA-DEMO-CHILD · DIRECT COMPONENT · APPROVED` feeding the roll-up.
  2. **KPI Classification** — "Classify KPIs (10)": usage_class / aggregation_policy / kr_eligible → strata_classify_kpi; verified rendering the 10 draft/pending KPIs.
  3. **Project Objective Alignment** — create (project objective + strategic objective + primary/secondary + attribution) → submit → approve → grant governed exception; verified rendering.
  4. **KR → Assignment link** (KR detail page) — link/unlink an approved KR-eligible assignment (STRATA-KPI-014); verified rendering the standalone-state message + Select.
- **Bugs caught by execution/browser & fixed this feature: 4** — overlaps reserved-word (S3), formula-EXCLUDE backfill (S8), observation-period resolution (S11), null-as_of roll-up (S14). Text-only guards missed all four.

## Sole remaining blocker
- **007 / 008** — the Theme `measurement_method` mutual-exclusivity rule lives UNPUSHED in the sibling worktree `strata/theme-measurement-method` (D-2). Everything around it is prepared; the precise integration dependency is: once that branch lands on origin/main, add the objectives_kpis|okrs Theme-creation gate + reconcile `strata_okr_validate`/theme-creation. This feature never modifies that worktree.
- Nothing pushed; no PR; prod untouched. (UI surfaces + browser screenshot acceptance: DONE — see Round 4.)
