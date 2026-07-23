# PLAN LOCK — CAT-STRATA-KPI-OPMODEL-20260720-001

> **STATUS: APPROVED.** Original S0–S3 rulings approved 2026-07-20. Closure amendment S19 approved by J on 2026-07-22 via “lets proceed to closure, finish all the pending items.”
> Baseline: `main` @ `09444187f` (== `origin/main`). Two sibling worktrees untouched.

## Objective

Close the verified gap between STRATA's shipped strategic-measurement model and the 53-requirement operating model, by adding the **one missing governed spine** (KPI Assignment + Contribution Mapping + authoritative aggregation), the **classification layer** (usage class / KR-eligibility), and wiring the already-built-but-unwired governance — WITHOUT regressing shipped OKR/KR/scorecard behavior, and WITHOUT touching staging/prod or the two in-flight worktrees.

## Reality of scope (why this cannot be one slice)

- 20 MISSING + 24 PARTIAL rows. New tables, a new authoritative aggregation service, a shared validation boundary extension, ~6 lifecycle RPC families, multiple UI surfaces, deterministic backfill + exception reporting, and a large test matrix.
- CLAUDE.md **2-hour slice rule** forbids a single mega-change. This is decomposed into Plan-Locked slices below; **each slice is separately approved, built, validated, screenshot-signed, and committed** before the next.

## ⛔ Decisions required before ANY code (not routine — do not self-resolve)

**D-1 — KR↔Assignment architecture (rows 014 / 016 / 019 / 013).** The prompt's decision #14 requires the KR Measurement Contract to be *linked to an eligible Strategic KPI Assignment*, and #10 that standalone KRs are *unofficial by default*. The OKR/KR layer that shipped 15 commits ago deliberately went the **opposite** way: prospective KRs are *independent contracts* whose `kpi_id` is "LEGACY PROVENANCE ONLY," and standalone KRs currently count as **reportable by default**. Reconciling to the prompt **changes official OKR progress numbers already on staging** — a regression of shipped semantics.
  - *This is a genuine two-authoritative-requirements conflict (shipped design vs prompt ruling). Options:*
  - **(a) Additive bridge** — keep independent KR contracts; add an *optional* Strategic-KPI-Assignment linkage + KR-eligibility so a KR *may* be officially KPI-backed; flip standalone-default to unofficial behind a governed, versioned policy flag so historical/closed OKRs keep their frozen numbers. *(Recommended — no retroactive number change.)*
  - **(b) Full reconcile** — make Assignment-linkage the required contract for official KRs and re-derive progress; accept and document the staging number movement.
  - **(c) Defer 013/014/016/019** — build only the Project-KPI-Assignment + Contribution-Mapping + aggregation spine (024–031, 034/036/037/040, 044/047/048) and leave KR semantics as shipped.

**D-2 — 007/008 dependency on the unmerged `strata/theme-measurement-method` worktree.** The `measurement_method` mutual-exclusivity rule is not on main. I will **not** touch that worktree. Do we (i) treat 007/008 as BLOCKED-on-merge and exclude them here, or (ii) you land that branch first, then I re-baseline?

**D-3 — Feature Work ID + branch.** Proposed ID `CAT-STRATA-KPI-OPMODEL-20260720-001`, new branch `strata/kpi-operating-model` cut from `09444187f`. Confirm, or fold into an existing STRATA feature.

**D-4 — Slice authorization order** (see below). Confirm which slices to authorize now.

## Proposed slice plan (each ≤2h, DB→validator→RPC→UI→tests, screenshot-signed)

| Slice | Rows | Core work |
|---|---|---|
| **S0** Quick wires (no new schema) | 010, 011, 020, 021 | Invoke `strata_kr_validate_contract` in submit/approve; add request-changes state + wire withdraw/cancel UI; read `weighting_policy`+tests; add OKR-status guard to KR config RPCs |
| **S1** Classification layer | 004, 005, 006, 022, 023 | Governed `usage_class` + `business_category` + `kr_eligible` + `aggregation_policy` on `strata_kpis` (forward-only, backfill from `is_strategic`); extend `strata_kpi_submission_blockers` + approver routing; reclassify `strata_element_kpis` as diagnostic |
| **S2** KPI Assignment entity | 025, 026, 027 | `strata_kpi_assignments` (strategic + project scope) with owner/target/period/class/status; scoped `strata_kpi_assignment_observations`; migrate `target_note` → real target with exception report |
| **S3** Contribution Mapping + aggregation | 028, 029, 030, 031 | Governed mapping table (`direct_component\|driver\|supporting_evidence\|none`, weight, dates, approval); roll-up validator; **one** authoritative aggregation service exposing num/denom/weights/exclusions/overlaps/provenance |
| **S4** Alignment governance | 034, 036, 037, 040 | Project Objective Alignment table (primary/secondary+attribution) replacing cross-context `parent_id`; server-side contradiction rejection; completion gate |
| **S5** KR reconciliation (gated on D-1) | 013, 014, 016, 019, 015, 017, 018 | Per D-1 ruling only |
| **S6** Retirement / audit / notify | 047, 048, 049, 050, 051, 052 | Extend dependency-impact + element-retirement guard + snapshot chain + audit + notifications to new entities |
| **S7** Downstream re-sourcing | 041, 042, 044, 046 | Strategy Room readiness from OKR chain; theme/element health from KR; Command Center chain; enforced review evidence |
| **S8** Formula date-scope + versioning polish | 003, 009, 012 | `effective_to`/EXCLUDE on formula_versions; KR-version approval; impact preview |

## Guardrails (binding on every slice)
- **Forward-only migrations**, unique 14-digit timestamps > `20260719195500` (and clear of the 3 worktree migrations `20260719223152/223304`, `20260720054214` — coordinate on D-2).
- **ADS tokens only**, no hand-rolled UI, JiraTable/ADS canonical first; run `npm run lint:colors:changed:ci` + `audit:ads:gate` + `build` before each commit.
- **Zero-assumption rendering**; **no destructive reconciliation** — legacy rows preserved + exception-reported, never fabricated approval.
- One authoritative server-side validation boundary; UI never the enforcer.
- Vitest via Node 22 (`PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test`), quiet/sequential.
- **No push / no PR / no deploy / no staging or prod writes.** Local commits only, on the new branch, one slice per commit, explicit file staging.

## Validation per slice
DB constraint + RLS + maker-checker + concurrency tests · calc/aggregation unit + property + negative (unit/scope/period/overlap) tests · migration/backfill tests · component + lifecycle tests · regression tests for every touched consumer · before/after calculation examples for locked scorecards + closed OKRs · `build` + color/audit gates.

## Stop conditions
- Any slice exceeding 2h → split.
- Any change that would move a **locked/closed** artifact's numbers → STOP, raise RED FLAG (regression banned).
- Migration timestamp collision risk with a worktree → STOP, coordinate.
- D-1/D-2 unresolved → S5 and S1's `is_strategic` interaction stay BLOCKED.

## Non-scope
Staging/prod changes; the two sibling worktrees; new `:id` routes (slug contract); any KPI registry other than `strata_kpis`; arbitrary user-defined KR weighting.

## Closure amendment — S19 project KPI trace truth (approved 2026-07-22)

Objective: replace the misleading read contract of `strata_project_kpi_trace` through a forward-only migration. The function must return the evidenced governed chain from Project Card through Project Objective alignment, Project KPI Assignment, typed contribution mapping, Strategic KPI Assignment, and linked KR/OKR.

Rules:
- Never edit the historical S9 migration.
- `aggregates=true` only when the mapping is `direct_component`, approved, effective at the function's as-of timestamp, and not expired.
- Driver, supporting-evidence, none, draft, submitted, rejected, retired, superseded, future and expired mappings remain traceable but never aggregate.
- Link KRs only through `strata_key_results.strategic_assignment_id = parent_assignment_id`.
- Registry/KPI-definition reuse alone never creates contribution or aggregation.
- Preserve every historical row, snapshot, calculation and report; S19 changes a read function only.

Authorized files:
- one new `supabase/migrations/*_strata_s19_project_kpi_trace_truth.sql` migration;
- `src/modules/strata/__tests__/kpi-opmodel-s9s11-lifecycle-downstream.guard.test.ts`;
- this feature's evidence, decision, loop and session artifacts.

Validation: focused guard tests, `git diff --check`, ADS gates, and production build. Staging application requires project-ref assertion and 1:1 migration-ledger verification. Command Center consumption remains a separately reviewed follow-on slice after the RPC response is proven.
