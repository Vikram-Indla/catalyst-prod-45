# STRATA — Traceability Matrix (blueprint + flowcharts → delivered artifacts)
**CAT-STRATA-20260705-001 · 2026-07-05 · Status legend:** ✅ delivered (staging + branch `worktree-strata-20260705`) · 🟡 delivered, UI evidence pending (DRIFT-001) · ⏸ approved-deferred (decision ref)

Migrations: M1=…100000_foundation_config_engine · M2=…100100_strategy_scorecard · M3=…100200_kpi_okr · M4=…100300_execution_value · M5=…100400_lineage_governance · M6=…100500_calc_engine · M7=…100600_seed_salam_demo. Pages under `src/modules/strata/pages/`.

| # | Contract item (source) | Delivered by | Status |
|---|---|---|---|
| 1 | Config-first: perspectives/thresholds/value categories/gates/KPI types/upload templates/workflows as versioned, effective-dated, approved metadata (§5, §12, App B, Flow 2) | M1 governed tables + envelope + submit/approve/retire RPCs (SoD) + AdminConfigPage control plane | ✅/🟡 |
| 2 | Config change requests w/ decider ≠ requester (§12) | M1 strata_config_change_requests + DB CHECK + admin change-log tab | ✅ |
| 3 | Audit: immutable ledger on all governed/domain writes (§21) | M1 strata_audit_events + generic trigger on every strata table (174 events verified) | ✅ |
| 4 | RBAC personas + segregation of duties (§4) | M1 strata_role_assignments (6 roles) + strata_is_admin/has_role; SoD CHECKs/RPC guards across M1–M5 | ✅ |
| 5 | Strategy cycles + periods + close discipline (§6, §15) | M2 cycles/periods + strata_close_period guard (blocked on pending attestations/errors unless overridden w/ reason) | ✅ |
| 6 | StrategyElement hierarchy + network (MapNode/MapEdge) (§6, §15, Flow 3) | M2 elements (typed, self-ref, map_position) + map_edges; StrategyRoomPage tree; StrategyMapPage @xyflow canvas (DnD, edge create, inspector) | 🟡 |
| 7 | Play promotion control (charter+owner+KPI set required) (§6) | M2 strata_promote_element RPC + play_charters; Promote button surfaces DB rejection verbatim | ✅ |
| 8 | Scorecard models/instances/lines; weighted; versioned; Σ=100 guard (§7, §15, §18) | M2 models(+perspectives m2m)/instances/lines (polymorphic CHECK); strata_approve_scorecard_model weight guard; Scorecards + ScorecardDetail pages | ✅/🟡 |
| 9 | Model-driven CEO scorecard drilldown to evidence (§7, App D) | ScorecardDetailPage: total → perspectives → lines → KPI detail → evidence drawer (formula version, inputs, runs, config, confidence) | 🟡 |
| 10 | KPI governed dictionary: 5 distinct ownership roles; approval gate (owner/source/formula/target/validator) (§8, §16) | M3 strata_kpis + strata_approve_kpi RPC; KpiLibraryPage (JiraTable) + KpiDetailPage ownership panel | ✅/🟡 |
| 11 | Formula versioning — no silent changes (§8, §21) | M3 kpi_formula_versions + approve RPC (auto-supersede + author ≠ approver); versions panel on KPI detail | ✅ |
| 12 | Targets versioned per period; actuals w/ period+run uniqueness, validation, confidence (§8, §16, §18) | M3 targets/actuals (UNIQUE NULLS NOT DISTINCT; validator ≠ submitter CHECK) + strata_attest_actual RPC | ✅ |
| 13 | OKR interop (KR uses KPI or standalone) (§8, §16) | M3 okrs/key_results; OKR panel in KPI library | ✅/🟡 |
| 14 | Commentary attached to entities (§16) | M3 strata_commentary + panels on scorecard/KPI detail | ✅ |
| 15 | Initiative registry linked to elements/KPIs (§9, §17, Flow 3) | M4 initiatives + m2m tables; ExecutionPage master-detail | 🟡 |
| 16 | Source-agnostic ProjectCard (source_system+source_key; Jira ≠ schema) (§9, §24) | M4 project_cards (jira/manual/upload/api; UNIQUE source pair); UI reads strata tables only (zero ph_* imports in module) | ✅ |
| 17 | Mapping confidence + owner on initiative↔project links (§9) | M4 initiative_projects (confidence, mapping_owner) + confidence captions in ExecutionPage | ✅ |
| 18 | Milestones baseline/forecast/actual + weighted progress (§9, §20) | M4 milestones + M6 strata_calc_execution_progress (writes progress + health band) | ✅ |
| 19 | Dependencies w/ SLA, blocker, impact (§9, §17) | M4 dependencies + ExecutionPage panel | ✅/🟡 |
| 20 | Generic ExecutionLink traceability bridge (§9) | M4 strata_execution_links (typed refs, confidence, mapping owner) | ✅ (no dedicated UI yet — surfaced via linkage panels) |
| 21 | Portfolios + memberships w/ allocation % (§10, §18) | M4 portfolios/portfolio_memberships; PortfolioVmoPage | ✅/🟡 |
| 22 | Benefit rigor: 9-stage lifecycle, baselines/planned/forecast/realized, assumptions, attribution, validator ≠ owner (§10, §17) | M4 benefits/benefit_values (SoD CHECK)/assumptions/attribution_rules + strata_validate_benefit_value RPC (finance validation advances lifecycle) | ✅ |
| 23 | Value gates: configured stages/criteria/decision options; verdict from config; approver roles; owner cannot decide own gate (§10, §12) | M1 gate models/stages + M4 gate_instances/evidence + M5 strata_decide_gate RPC (creates decision record) | ✅ |
| 24 | Source registration before feeding KPIs (§19, Flow 1) | M5 strata_data_sources + KPI approval RPC requires source for upload-fed KPIs; DataPipelinePage sources panel | ✅ |
| 25 | Upload runs: run ID, raw retention (path+hash), counts, status machine (§19, §22, Flow 1) | M5 upload_runs (RUN-keys) + DataPipelinePage runs table + run detail | ✅/🟡 |
| 26 | Staging + row-level validation errors + quarantine states (§19) | M5 staging_rows + validation_results; seeded rejected row w/ 2 errors rendered in run detail | ✅ |
| 27 | Canonical-write lineage: every accepted value → run + row + config context (§19) | M5 lineage_records (8 verified) + upload_run_id/staging_row_id on actuals; KPI detail lineage panel + evidence drawer | ✅ |
| 28 | Centralized calculation w/ full provenance; UI never calculates (§20, D-003/Q5) | M6 RPCs (achievement, rollup, YTD, realization, VaR, execution) + strata_calculated_values (70 rows verified); no client scoring path exists in the module | ✅ |
| 29 | RAG bands from governed threshold schemes (incl. lozenge appearance) — zero constants (§5, §20) | M1 threshold_schemes.bands (+appearance) + strata_band_from_score + useBandResolver | ✅ |
| 30 | Snapshots: locked, immutable, superseded-only-by-new; config+data-run versions frozen (§11, §21, Flow 1) | M5 snapshots (INSERT-only RLS) + snapshot_items + lock/supersede RPCs; SNAP-1001 seeded w/ 30 frozen items; locked scorecards read frozen payloads (never recalc) | ✅ |
| 31 | Live/draft/pending-validation/locked visible on every surface (§11, App E) | StrataDataStateLozenge + StrataConfigContextBar on all 12 pages | 🟡 |
| 32 | Decision records + action register (§11, Flow 1) | M5 decisions (DEC-keys)/actions (ACT-keys); ReviewsPage cockpit + Command Center decision queue | ✅/🟡 |
| 33 | Board packs reconcile to snapshot; PDF + PPTX (Q7) | M5 board_packs (format CHECK pdf/pptx) + ReviewsPage panel; generation service = follow-up slice (rows seeded 'pending', honest UI) | ⏸ generation engine (next slice) |
| 34 | AI advisory-only w/ provenance, live/locked flag, human review, reviewer ≠ author (§13) | M5 ai_outputs (CHECKs) + Command Center advisory panel (no mutating controls); generation service = follow-up | ✅ schema+UI / ⏸ generation |
| 35 | Executive Command Center: health, exceptions, VaR, decision queue (contract §6.1) | StrataCommandCenterPage (6-tile hero + perspective health + exceptions + queue + advisory) | 🟡 |
| 36 | Admin Configuration Engine as control plane (versions/approvals visible; no hidden constants) (§12, App D, Flow 2) | StrataAdminConfigPage (10 sections, governance envelope on every record, lifecycle actions w/ verbatim DB errors) | 🟡 |
| 37 | Config context (model/cycle/period/version) visible on screens (§5) | StrataConfigContextBar (cycle+period pickers, model chip) on all pages | 🟡 |
| 38 | Salam as labeled demo seed only; no tenant terms in code (§1, App C/F, Q8) | M7 idempotent seed, every config row change_reason='DEMO SEED (Salam reference tenant)'; grep of src/modules/strata for tenant terms: none | ✅ |
| 39 | Hub placement: repurpose Strategy tile → /strata + legacy redirects (Q1/D-009) | hubs.ts, HubSwitcher (un-deprecated), FullAppRoutes, App.tsx outside-shell redirects, sidebars, routeRegistry, tests | ✅ |
| 40 | Decommission old strategy surfaces (Q2/D-009) | Unrouted + redirected (StrategyRoom, themes/goals pages); file deletion + es_* drops deferred | ✅ unroute / ⏸ deletion+drops (DRIFT-003) |
| 41 | Uploads + Jira adapter only; ERP/BI deferred (Q6) | Upload channel schema live; Excel upload UI + Jira→ProjectCard adapter service = next slices (seam + tables ready) | ⏸ adapter service + upload wizard (next slices) |
| 42 | Single tenant now, multi-tenant-ready (Q4) | organization_id nullable on all strata tables; no org enforcement active | ✅ |
| 43 | Slug contract on routed entities (CLAUDE.md) | strata_generate_slug trigger on 12 routed tables; Routes.strata.* builders; display keys RUN-/SNAP-/DEC-/ACT- | ✅ |
| 44 | Screenshot/DOM evidence per surface (CATALYST_UI_UX_ACCEPTANCE) | — | ⏸ first action of next interactive session (DRIFT-001) |

**Deferred summary (all logged with decision refs):** board-pack generation engine (33) · AI generation service (34) · Excel upload wizard + Jira adapter service (41) · physical file deletion + es_* table drops (40/DRIFT-003) · UI screenshot/DOM evidence (44/DRIFT-001) · profile-name resolution for owner UUIDs (foundation note, next slice).
