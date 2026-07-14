# 06 — Phase 3 Discovery (delivery & value · anchors 07·17·18·08·22·21)

> 6 Phase-3 anchors read IN FULL via DesignSync (parent, session 011). 4 parallel discovery agents
> (canonical / routes / integration / data-safety) ran read-only on the repo + staging. Digest below;
> agent ownership cautions are load-bearing for the Plan Lock.

## Headline: Phase 3 is REDESIGN-IN-PLACE, not greenfield
Every surface already has a mounted page. Only ONE net-new route.

| Anchor | Route | Existing page (LOC) | Redesign target |
|---|---|---|---|
| 17 Project Cards List | `/strata/execution` | `StrataExecutionPage.tsx` (1180) list mode | in place |
| 07 Project Card Detail | `/strata/execution/:slug` | `ProjectCardDetailView.tsx` (801) via same page | in place |
| 18 Import & Reconciliation | `/strata/execution/import` | `StrataExecutionImportPage.tsx` (1015) | in place |
| 22 Portfolio Index | `/strata/portfolio` | `StrataPortfolioVmoPage.tsx` (1142) — today a single-portfolio VMO at the index URL | split → real index |
| 08 Portfolio Detail | `/strata/portfolio/:slug` **← NEW ROUTE** | (VMO body exists, reached via `?portfolio=`) | promote body → `PortfolioDetailPage`; `usePortfolioBySlug` already exists, unused |
| 21 Benefit Detail | `/strata/portfolio/benefits/:slug` | `BenefitDetailSection` in VMO page | redesign in place |

- Only new route + builder: `portfolio/:slug` + `Routes.strata.portfolioDetail(slug)` (slot is FREE; static
  `portfolio/benefits/:slug` + `portfolio/:slug/evidence` keep priority — no shadow). Register before `*`.
- Slug contract SATISFIED: `strata_project_cards.slug`, `strata_portfolios.slug`, `strata_benefits.slug`
  all present with generate_slug triggers; `useProjectCardBySlug` / `usePortfolioBySlug` / `useBenefitBySlug`
  all exist. Sidebar IA (Delivery→Project Cards, Value→Portfolio & Benefits) done in Phase 0, `exact:false`.

## Canonical components (reuse-first — all in `shared.tsx` / `JiraTable/`)
- **JiraTable** — grouped rows (`groups:RowGroup[]`, `meta`=count, `labelNode`), `density="compact"`,
  `selectable`/`selection`/`onSelectionChange`, `onRowClick`, cell factories, sortable, `overflowX`.
  Grouped+selectable proven in `StrataExecutionPage` + KPI Library. BulkFooterBar separate component.
- **StrataValueBar** (`shared.tsx:170`) — `{planned,forecast,realized,validated}` nested magnitudes,
  leakage = planned−forecast in danger tone. **ONE variant only** — no hero/small-multiple/height prop.
  Only consumer `StrataPortfolioVmoPage:343`. → additive props needed (P3-D5), NOT a new component.
- **StrataChainStrip** (`shared.tsx:546`), **StrataStatStrip** (`:728`), **StrataSnapshotBand** (`:486`),
  **StrataPageShell→ProjectPageHeader(hubType="strata")→HubSurface** (`:423`, confirmed), **StrataDecisionModal**
  (`:611`, verdict+note+in-modal SoD error; attestation comparison goes in `description:ReactNode`),
  **StrataExecutionHealthLozenge** (`shared.tsx:91`, enum `on_track|minor_delay|major_delay|on_hold|
  not_started|not_available`), **fmtSarCompact** (`format.ts:32`), **StrataScoreRing/BandBar/TrendSpark**.
- **GAP — no STRATA overlay detail-router.** `CatalystViewBase`/`CatalystDetailRouter` are locked to
  `ph_issues`/`tasks`/`test_*` `entityKind` + `CatalystItemType` — no STRATA entity, confirms P2-D1.
  Anchor 17's "row-click→overlay preserving list" has no canonical host. Phase-1/2 pattern = full-page
  slug swap + `?from=` origin (D-2 deferred drawer-first drill). → P3-D1.

## Backend / data reality (staging `cyijbdeuehohvhnsywig`, read-only)
**Delivery spine (17, 07) = FULLY BACKED.** `strata_project_cards` carries `calculated_health`
(governed band key, NO fixed enum — data-driven via threshold schemes), `forecast_variance_days`,
`baseline/system/final_forecast_end`, `actual_progress`, `variance_pct`, `source_system`
(`jira|manual|upload|api` — **no SAP**), `source_key`, `last_synced_at`, sponsor/lead/stage/budget,
`objective_element_id`. Milestones / dependencies (`is_blocker`) / risks all real tables. Missing:
`on_hold` boolean (derive from stage/health), `portfolio_id` on card (membership via
`strata_portfolio_memberships`), `schedule_impact_days` (threats ranking = client-derive from dates;
risks sort last), blocker age (derive from `due_date`).

**Value spine (22, 08, 21) = PARTLY BACKED.**
- Benefit Detail (21): well-backed — `strata_benefit_values` (period grain: baseline/planned/forecast/
  realized + `validation_status`), `strata_assumptions` (`open|holding|broken|retired` — **no "under strain"**),
  `strata_attribution_rules` (free jsonb, no typed driver-split), SoD attest via RPC
  `strata_validate_benefit_value` (submitter≠validator DB-enforced). "Attestation history" = the value rows
  (no per-attestation note log). No benefit-level `attestation_status` column — derive from values.
- Portfolio Index/Detail (22, 08): `strata_portfolios` has only `value_target` — **no planned/forecast/
  leakage/validated rollup, no weakest-link, no portfolio-value RPC.** Only `strata_calc_value_at_risk` +
  per-benefit `strata_calc_benefit_realization` (READ persisted via `lineageApi.latestCalc` — do NOT wire
  the recompute RPC into a render path, it writes provenance). → portfolio aggregates = client-derive over
  benefits, or new RPC (P3-D2).

**Import (18) = LARGELY UNBACKED — the danger.** Exists: RPC `strata_import_execution_batch`
(genuine dry-run vs apply; returns `{created,updated,rejected}` per row), `strata_upload_runs`/
`strata_lineage_records`/`strata_audit_events`, `strata_sync_jira`. MISSING: any three-way
**Matched/Conflict/Unmatched** reconciliation model; the RPC never echoes the existing card for a
**both-sides diff**; **NO import-run ledger and NO undo/revert RPC** — the anchor's "Apply = single
commitment with 24h undo" engine does not exist. → P3-D3 (scope decision).

## api-object ownership (verified — wire correctly)
- `importExecutionBatch` on **`importApi`** (NOT executionApi).
- VaR / realization DISPLAY reads **`lineageApi.latestCalc`**; `valueApi.valueAtRisk`/`benefitRealization`
  are recompute-with-write RPCs — never in render.
- `benefitProjectCards`, `linkBenefitProjectCard`, `validateBenefitValue`, `decideGate`, `assumptions`,
  `attributionRules`, `portfolioBySlug`, `benefitBySlug` all on **`valueApi`**.
- `projectCards`, `projectCardBySlug`, `milestones`, `dependencies`, `risks`, `syncJira` on **`executionApi`**.

## Thin additive hooks (no migration)
`useCardBenefitValue(cardId)` (client join benefit_project_cards⋈benefits⋈benefit_values → "benefit at
stake" / value contribution), portfolio aggregate wrapper (aggregate benefit_values across a portfolio's
benefits → planned/forecast/realized/validated/leakage/weakest-link), unified-threats merge+rank
(milestones/deps/risks client merge), attestation-history assembler (from benefit_values).

## OPEN DEBT (carried, unchanged)
Prod migrations `20260713100000` + `20260713110000` committed + in staging ledger, prod-parked (no prod
access). Backend defect `task_65642237` (strata_promote_element → dropped strata_play_charters).
