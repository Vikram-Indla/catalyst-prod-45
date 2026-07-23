# S19 + S20 staging runtime evidence (developer evidence)

Date: 2026-07-22 · Environment: staging `cyijbdeuehohvhnsywig` via Supabase MCP (DB-level auth).
**This is DEVELOPER evidence, not independent acceptance.** Browser-navigation acceptance and
independent checker-action replay remain for Aiden. No production action; no push/merge/PR.

## Migrations applied to staging (forward-only; ledger 1:1 with committed files)
| Version | Name | How | Notes |
|---|---|---|---|
| 20260722080416 | strata_okr_validate_reconcile_objective_and_kr_contract | (pre-applied) | E13 reconciliation — restores S0 approve-stage KR-contract gate my S16 dropped. Verified in ledger. |
| **20260722100000** | strata_s19_project_kpi_trace_truth | MCP `execute_sql` (CREATE OR REPLACE) + ledger insert at file version | S9 untouched. Function-only replacement. |
| **20260722110000** | strata_s20_executive_governed_rollup | same | New read model (additive). |

Ledger recorded at the file's exact version (not an MCP-stamped timestamp) to keep file↔ledger 1:1.

## Two-identity maker-checker actor chain (impersonated via request.jwt.claims; SoD enforced by auth.uid())
- **Maker** = `strata.qa.strategy-maker` `86d65bbf-f70d-488f-b3c0-22cdadb3fd78` (strategy_office, non-admin)
- **Checker** = `strata.qa.framework-approver` `8ba95bb6-4aab-45a0-ae5c-f7c6980d22a9` (strategy_office, non-admin)

Child assignment `94fd86dd` persisted `submitted_by=86d65bbf`, `approved_by=8ba95bb6`, `status=approved`
— distinct identities; the shared-identity path would raise `OWNER_SOD_CONFLICT`.

## Governed fixture created (Project execution + Contribution chain — Engines 3-4)
- Card `bbc2963d` (Excel Import Test Project) · Project Objective `49aa8c58` (E8 Auto-Return Test Objective)
- Parent Strategic KPI Assignment `d0d522d2` (KA-D0D522D2F4, approved, KR-linked to `80ce8318` E2E onboarding rate)
- Child project assignment A `94fd86dd` (KA-94FD86DD25, KPI cb9e7bd3) — approved (maker→checker)
- Child project assignment B `5bf83c25` (KPI NPS a5a1…1203) — approved (maker→checker)
- Contribution mapping `a770ef28` `direct_component` — approved (maker→checker)
- Contribution mapping `39ae4dd3` `driver` — approved (maker→checker)
- Constraint proven: `(parent_assignment_id, child_assignment_id)` is UNIQUE (one mapping per pair).

## S19 runtime (`strata_project_kpi_trace('bbc2963d')`) — PASS (developer runtime)
| mapping | type | status | aggregates | linked KRs |
|---|---|---|---|---|
| a770ef28 | direct_component | approved | **true** | 1 (E2E onboarding rate → OKR fe80d747) |
| 39ae4dd3 | driver | approved | **false** | 1 |
- Real KR join via `strata_key_results.strategic_assignment_id = parent_assignment_id` — CONFIRMED.
- Approved `driver` does NOT aggregate — refutes the old S9 basis (registry reuse never rolls up).
- `basis.registry_reuse_creates_rollup=false`, `historical_rows_rewritten=false`.
- Full negative matrix (supporting_evidence/none/draft/retired/future/expired) asserted statically by
  the guard against the deployed CASE; runtime-proven pair (direct_component=true vs driver=false).

## S20 runtime (`strata_executive_governed_rollup(NULL)`) — PASS (developer runtime)
Single set-based query (no per-card N+1). Parent `d0d522d2`: `aggregating_contributions=1`,
`non_aggregating_contributions=1`, `contributing_project_cards=[bbc2963d]`, `linked_key_results=[80ce8318]`.

## Tests / build
- Focused guards: **28/28** (s20 ×5, s9s11 lifecycle-downstream/S19, execmodel s16/s17/s18).
- Production build: `npm run build` **exit 0** (reconciled checkout; SQL/test-only changes, only pre-existing warnings).

## BLOCKED / follow-on (not accepted here)
- **Browser navigation** (refresh/breadcrumbs/Back-Forward/deep-link/return-to-origin/unauthorized role):
  BLOCKED — no browser login session available to this agent (DB/MCP only).
- **Command Center UI consumer** of `strata_executive_governed_rollup`: reviewed follow-on (UI not
  browser-verifiable here). Read model is applied + runtime-verified.
- **Independent checker-action replay**: Aiden, second authenticated session.
- **Fixture cleanup**: approved governed mappings/assignments are version-governed (retire needs
  review evidence); the above IDs are intentional S19/S20 runtime fixtures left on staging, enumerated
  here rather than force-deleted.
