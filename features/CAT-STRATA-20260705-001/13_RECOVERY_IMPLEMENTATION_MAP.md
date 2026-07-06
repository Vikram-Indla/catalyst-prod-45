# STRATA Functional Recovery — Implementation Map

**Feature:** CAT-STRATA-20260705-001 · Session 004 · Branch `feat/CAT-STRATA-RECOVERY-20260705`
**Controlling docs:** Recovery Ledger (§5–§17, App. B/F/G) + Functional Spec (F-STR/F-KPI/F-EXE/F-VAL/F-GOV/F-REP)
**DB:** staging `cyijbdeuehohvhnsywig` only. Prod untouched.

## Baseline inventory verdict (Phase 0 exit gate)

Matches the ledger. Confirmed on code + staging DB:
- 50 `strata_*` tables exist with RLS, audit triggers (`strata_audit()` → `strata_audit_events` with `actor_id = auth.uid()`), SoD CHECKs (`validated_by <> submitted_by`, validator≠owner, reviewer≠creator), calc engine RPCs, governance RPCs (submit/approve/retire, promote, attest, decide gate, lock snapshot, close period).
- Unwired-but-existing RPCs now applied to staging + ledger-recorded: `strata_validate_run`, `strata_promote_run` (20260705140000), `strata_create_kpi/strategy_element/okr/benefit` (20260705140100). Frontend references: **zero** (grep `.rpc(` = 18 wired RPCs, none of these six).
- **No create/update RPC and no UI** for: cycles, periods, element update/owner/perspective, charters, element_kpis, gate instances (schedule), initiatives (+all links), project cards (+links), milestones, dependencies, portfolios (+membership), benefit update/values/assumptions/attribution, KPI targets/formula versions/manual actuals, key results, decisions, actions, role assignment.
- `strata_promote_element` checks owner + charter-exists + ≥1 KPI, but NOT charter completeness (value thesis/hypothesis) and NOT gate schedule; `strata_gate_instances.subject_type` CHECK lacks `element` so play gates cannot even be stored.
- Frontend `domain/index.ts` has 0 authoring mutations beyond map-edge insert, upload staging insert, board-pack update. Pages are read/approve-only.

## New backend artifact

**Migration `20260705190000_strata_authoring_write_paths.sql`** (single file; SECURITY DEFINER RPCs; every RPC role-guarded to mirror RLS, validates enums/refs, writes `strata_audit_events` `RPC:*` rows; table triggers add before/after row audit; lineage rows for canonical data writes; staging-applied + ledger-recorded in same session).

## Map — Lane A: Strategy authoring & governance

| Workstream | Ledger ref | Spec ref | Route | Component(s) | API/RPC | Table(s) | Validation | Lineage/audit | Test proof |
|---|---|---|---|---|---|---|---|---|---|
| Create cycle | §5.1, P0-01, WP "Cycle authoring" | F-STR-001 | /strata/strategy (+admin) | StrategyRoom header action → `CycleCreateModal` (new, canonical ads Modal) | NEW `strata_create_cycle` | strata_cycles | name req; ends>starts; granularity enum; no duplicate active cycle overlap warning | audit RPC row + trigger | create FY2027 via RPC as real user; appears in cycle ChipMenu |
| Edit cycle | §8 "Edit strategy cycle" | F-STR-001 | same | `CycleCreateModal` (edit mode) | NEW `strata_update_cycle` | strata_cycles + audit | status machine (draft→active→locked→closed); date checks | audit | edit dates; audit actor visible |
| Create periods | §5.2, P0-01 | F-STR-002 | /strata/strategy | `PeriodGenerateModal` (new) | NEW `strata_create_period`, `strata_generate_periods` | strata_periods | dates inside cycle; **no overlap within cycle (rejected)**; unique name | audit | create Q1–Q4; overlap attempt rejected with message |
| Create theme/play/objective | §5.3, P0-02 | F-STR-003 | /strata/strategy | `ElementCreateModal` (new; element_type from workflow config/known types, parent picker, perspective picker from config) | wire existing `strata_create_strategy_element` | strata_strategy_elements | cycle open; parent same cycle; perspective exists | audit RPC row | create all three; hierarchy reload persists |
| Assign owner/perspective + edit | §5.4, §8 | F-STR-004 | /strata/strategy | `ElementEditModal` (new) | NEW `strata_update_element` | strata_strategy_elements | parent-cycle check, no self/cycle parent loops; owner uuid; perspective from config | audit | owner renders via useProfileNames; promotion blocked w/o owner |
| Charter authoring | §5.5, P0-03 | F-STR-005 | /strata/strategy (element detail) | `CharterModal` (new; hypothesis/scope/value thesis/gate model/owner) | NEW `strata_upsert_play_charter` | strata_play_charters | element must be play-typed?—config-typed: allowed for any element; completeness = all core fields non-empty | audit | incomplete charter → promote fails w/ explicit missing list |
| Link KPI set | §5.6, P0-06 | F-STR-006 | /strata/strategy | `ElementKpiLinkModal` (new; approved-KPI picker + weight) | NEW `strata_link_element_kpi` / `strata_unlink_element_kpi` | strata_element_kpis | KPI approved; weight 0–100; unique pair | audit | KPI coverage panel updates from relation |
| Gate schedule for play | §5 "gate schedule", P1-02 | F-STR-007 | /strata/strategy | `GateScheduleModal` (new; gate model + stage + date) | NEW `strata_schedule_gate` (+CHECK extension: subject_type += 'element') | strata_gate_instances | approved gate model; stage belongs to model; subject exists | audit | gate appears; promotion checks it |
| Promotion guard | §5 "Promote element", P1-01/02 | F-STR-008 | /strata/strategy | Promote button reachable on draft rows; errors surfaced verbatim | REPLACE `strata_promote_element` (adds: charter completeness incl. value thesis + hypothesis, gate schedule exists; aggregates ALL missing prerequisites into one explicit exception) | strategy_elements, charters, element_kpis, gate_instances | server-side; lists every missing item | audit | 4 negative tests (no owner / no charter / no KPI / no gate) + 1 positive |
| Map edge authoring | §7 /strata/strategy/map | F-STR-009 | /strata/strategy/map | existing createEdge + NEW delete/edit edge actions | existing insert + RLS delete | strata_map_edges | no self edge; unique triple | trigger audit | edge persists after reload |

## Map — Lane B: KPI / OKR / actuals / upload

| Workstream | Ledger ref | Spec ref | Route | Component(s) | API/RPC | Table(s) | Validation | Lineage/audit | Test proof |
|---|---|---|---|---|---|---|---|---|---|
| Create KPI | §8 "Create KPI", P1-03 | F-KPI-001 | /strata/kpis | `KpiCreateModal` (new) | wire `strata_create_kpi` + NEW `strata_update_kpi` (owners/source/type/scheme/unit) | strata_kpis | name req; enums; approve gate needs owner+validator≠owner+formula+target (existing `strata_approve_kpi`) | audit | draft KPI → set owners → formula → target → approve |
| Formula version | §8, WP "Formula version creation" | F-KPI-002 | /strata/kpis/:slug | `FormulaVersionModal` (new) | NEW `strata_create_formula_version` (version=max+1, draft) | strata_kpi_formula_versions | expression req; unique (kpi,version); approval via existing RPC supersedes cleanly | audit | v2 created; v1 preserved; snapshot unaffected |
| Target/baseline | §8 "Create target" | F-KPI-003 | /strata/kpis/:slug | `TargetModal` (new) | NEW `strata_create_kpi_target` | strata_kpi_targets | period exists+open; numeric; version bump per (kpi,period) | audit | target used by `strata_calc_kpi_achievement` |
| Manual actual | §5.13, P1-05 → **P0** | F-KPI-004 | /strata/kpis/:slug | `SubmitActualModal` (new; value+commentary+confidence+evidence note) | NEW `strata_submit_kpi_actual` | strata_kpi_actuals + strata_lineage_records + strata_commentary | KPI approved; period open; pending validation; SoD attest via existing `strata_attest_actual` | manual-entry lineage row (channel=manual) + audit | actual pending → attest by different user → achievement recalc |
| Upload validate/promote | §5.13, P0-08 | F-KPI-005 | /strata/data, /strata/data/runs/:runKey | `RunActions` (new buttons: Validate / Promote; row-level error table from validation_results) | wire `strata_validate_run`, `strata_promote_run` (applied) | staging_rows, validation_results, kpi_actuals, lineage_records | template schema checks; kpi/period resolution; period open; idempotent promote | lineage per actual + audit RPC rows | invalid rows rejected w/ messages; valid rows → canonical actuals → scorecard recalc |
| OKR + KR | §8, P1-03 | F-KPI-006 | /strata/kpis | `OkrCreateModal`, `KeyResultModal` (new) | wire `strata_create_okr` + NEW `strata_create_key_result`, `strata_update_key_result` | strata_okrs, strata_key_results | name req; optional KPI ref exists; current_value updates | audit | OKR+KR created; KR progress renders |

## Map — Lane C: Initiative registry & linkage

| Workstream | Ledger ref | Spec ref | Route | Component(s) | API/RPC | Table(s) | Validation | Lineage/audit | Test proof |
|---|---|---|---|---|---|---|---|---|---|
| Create/edit/archive initiative | §5.7, P0-04 | F-EXE-001/002 | /strata/execution | `InitiativeCreateModal`, edit variant (new) | NEW `strata_create_initiative`, `strata_update_initiative`, `strata_archive_initiative` | strata_initiatives (+audit) | name req; cycle open; stage/status enums; archive requires reason | audit w/ reason | initiative appears in registry; archive excludes from active |
| Initiative detail surface | §8 "Initiative detail" | F-EXE-003 | /strata/execution (tabbed full-screen modal) | `InitiativeDetailModal` (new; tabs: Summary, Strategy, KPIs, Projects, Benefits, Portfolio, Audit) | read APIs + link RPCs below | initiative + junctions | — | — | relationships manageable from tabs, both sides visible |
| Link initiative↔element | P0-06 | F-EXE-004 | detail modal | `LinkPickerRow` (new shared) | NEW `strata_link_initiative_element` / unlink | strata_initiative_elements | element exists+not retired; weight 0–100; unique | audit | objective drilldown shows initiative |
| Link initiative↔KPI | P0-06 | F-EXE-005 | detail modal | same | NEW `strata_link_initiative_kpi` / unlink | strata_initiative_kpis | KPI approved; unique | audit | KPI evidence shows initiative |
| Link initiative↔benefit | P0-06 | F-VAL-005 | detail modal + benefit detail | same | NEW `strata_link_benefit_initiative` / unlink | strata_benefit_initiatives | attribution_share 0–1; unique | audit | benefit drilldown shows initiative |
| Link initiative↔portfolio | P0-06 | F-VAL-002 | detail modal + portfolio page | `PortfolioMembershipModal` | NEW `strata_add_portfolio_member` / remove | strata_portfolio_memberships | member exists; allocation 0–100; unique | audit | portfolio rollup includes member |

## Map — Lane D: Project Card, milestones, dependencies

| Workstream | Ledger ref | Spec ref | Route | Component(s) | API/RPC | Table(s) | Validation | Lineage/audit | Test proof |
|---|---|---|---|---|---|---|---|---|---|
| Create/edit/archive Project Card | §5.9, P0-05 | F-EXE-006/007 | /strata/execution | `ProjectCardCreateModal` (new; source_system default **manual**, source key optional, PM, dates, budget, health, stage, mapping confidence) | NEW `strata_create_project_card`, `strata_update_project_card`, `strata_archive_project_card` | strata_project_cards | source_system enum (manual/upload/api/jira); unique (source_system, source_key); dates coherent | audit | manual card without Jira; persists reload |
| Project detail surface | §8 "Project detail page" | F-EXE-008 | /strata/execution (tabbed full-screen modal) | `ProjectDetailModal` (new; tabs: Summary, Milestones, Dependencies, Links, Evidence, Audit) | reads + RPCs below | project + children | — | — | manage milestones/dependencies from detail |
| Link project→initiative | P0-06 | F-EXE-009 | detail modals | link picker | NEW `strata_link_initiative_project` / unlink | strata_initiative_projects | confidence 0–1; unique | audit | bidirectional visibility |
| Link project→KPI/objective/benefit | P0-06 | F-EXE-010 | detail modal | relationship rows | NEW `strata_link_execution` / unlink | strata_execution_links | from/to types whitelisted; relationship enum; unique 5-tuple | audit | scorecard evidence reaches project |
| Milestones CRUD + weighted progress | §5.11, P1-04 | F-EXE-011/012 | project detail | `MilestoneModal` (new) | NEW `strata_create_milestone`, `strata_update_milestone` (both re-run `strata_calc_execution_progress`) | strata_milestones, strata_calculated_values, project_cards.actual_progress | dates; progress 0–100; weight>0; status enum | calc provenance row + audit | milestone change → project progress recalculates (before/after) |
| Dependencies CRUD + blockers | §5.12, P1-04 | F-EXE-013 | project detail + execution page | `DependencyModal` (new) | NEW `strata_create_dependency`, `strata_update_dependency` | strata_dependencies | requesting/serving types; due date; SLA≥0; blocker bool; status enum | audit | blocked count on Command Center updates; drill to project |

## Map — Lane E: Portfolio / VMO / benefits / gates

| Workstream | Ledger ref | Spec ref | Route | Component(s) | API/RPC | Table(s) | Validation | Lineage/audit | Test proof |
|---|---|---|---|---|---|---|---|---|---|
| Create/edit portfolio | §5 "Portfolio CRUD", P0-07 | F-VAL-001 | /strata/portfolio | `PortfolioCreateModal` (new) | NEW `strata_create_portfolio`, `strata_update_portfolio` | strata_portfolios | name req; category from config; value_target numeric | audit | portfolio appears in VMO |
| Membership | P0-07 | F-VAL-002 | portfolio page | `PortfolioMembershipModal` | `strata_add_portfolio_member` (shared w/ Lane C) | strata_portfolio_memberships | as above | audit | rollup updates |
| Create/edit benefit | P0-07 | F-VAL-003 | portfolio page | `BenefitCreateModal` (wire) + `BenefitEditModal` | wire `strata_create_benefit` + NEW `strata_update_benefit` (owner, validator≠owner, unit, hypothesis, causal mechanism, confidence, lifecycle transition) | strata_benefits | SoD CHECK validator≠owner; lifecycle enum ordered transitions | audit | benefit created via UI, lifecycle=identified |
| Benefit values | P0-07 | F-VAL-004 | benefit detail | `BenefitValueModal` (new; kind × period × value) | NEW `strata_create_benefit_value` | strata_benefit_values (+lineage) | kind enum; period exists; unique (benefit,period,kind,run); pending validation; realized validated via existing `strata_validate_benefit_value` (SoD) | lineage (manual channel) + audit | realized value validated by different user → realization index updates |
| Assumptions | §8, P1 | F-VAL-006 | benefit detail | `AssumptionModal` (new) | NEW `strata_create_assumption`, `strata_update_assumption` | strata_assumptions | description req; confidence 0–1; status enum | audit | appears in value evidence |
| Attribution rules | §8, P1 | F-VAL-007 | benefit detail | `AttributionRuleModal` (new) | NEW `strata_create_attribution_rule` | strata_attribution_rules | rule_type enum (shared_benefit/counterfactual/double_counting); definition jsonb req | audit | rule visible in benefit evidence |
| Gate schedule + decide | §5 "Value Gates", P1 | F-VAL-008 | portfolio + strategy + execution | `GateScheduleModal` (shared w/ Lane A) + existing decide modal | `strata_schedule_gate` + existing `strata_decide_gate` | strata_gate_instances (+decisions) | model approved; stage in model; SoD owner≠decider (existing) | audit + decision row | schedule gate on user-created benefit; decide it |
| Value at risk from authored data | §11 | F-VAL-009 | command center / portfolio | recalc trigger after benefit/value/gate writes | existing `strata_calc_value_at_risk` | strata_calculated_values | — | calc provenance | new forecast/benefit changes VaR (before/after) |

## Map — Lane F: Command Center / Scorecards / evidence

| Workstream | Ledger ref | Spec ref | Route | Component(s) | API/RPC | Table(s) | Validation | Lineage/audit | Test proof |
|---|---|---|---|---|---|---|---|---|---|
| Needs Attention rule engine | §11 "Needs Attention", F-REP-004 | F-REP-004 | /strata | replace seeded exceptions w/ `useNeedsAttention` | NEW `strata_needs_attention(p_cycle,p_period)` (rule-driven: pending attestations, blocked deps, overdue actions, overdue gates, broken assumptions, missing actuals for open period, rejected upload rows, pending realized values, active plays w/ incomplete charters) | reads across domains | — | each row carries source entity refs | create a blocker → row appears; resolve → disappears |
| Blocked dependencies metric | §6 Command Center | F-REP-003 | /strata | metric derives from live dependency query (already live count? verify + drill) | reads | strata_dependencies | — | — | create blocker dep → count updates → drill to project+initiative |
| Pending attestations | §2 mandate | — | /strata | live count of pending kpi_actuals/benefit_values | reads | actuals/values | — | — | new manual actual increments count |
| Scorecard full drilldown chain | §7 scorecards, P1 | F-REP-005 | /strata/scorecards/:slug/evidence | `EvidenceChainPanel` (extend StrataEvidencePage: KPI → objective (element_kpis) → initiative (initiative_kpis/elements) → project (initiative_projects + execution_links) → milestones/deps → benefit (benefit_initiatives) → source run/manual lineage → formula version → target → validation → owner) | NEW `strata_kpi_evidence_chain(p_kpi,p_period)` returns jsonb chain (honest nulls for missing links) | all junctions | — | chain includes lineage + snapshot refs | one line proves complete chain on user-authored records |
| Enterprise score from authored data | §11 | F-REP-001 | /strata | post-write recalc invalidation (`strata_calc_period`) | existing calc RPCs | strata_calculated_values | — | provenance in calc rows | new validated actual changes score (before/after) |
| Benefits realization | §11 | F-REP-002 | /strata | existing metric; recalc after validation | existing `strata_calc_benefit_realization` | calc values | — | provenance | validated realized value moves index |

## Map — Lane G: Governance / audit / RBAC

| Workstream | Ledger ref | Spec ref | Route | Component(s) | API/RPC | Table(s) | Validation | Lineage/audit | Test proof |
|---|---|---|---|---|---|---|---|---|---|
| Create decision | §8 "Create decision", P1 | F-GOV-001 | /strata/reviews (+gates) | `DecisionCreateModal` (new) | NEW `strata_create_decision` (decision_key DEC-#### seq) | strata_decisions | title/forum/type req; owner; due date | audit | decision appears in reviews + command center count |
| Create action | §8, P1 | F-GOV-002 | /strata/reviews | `ActionCreateModal` (new) + status transitions | NEW `strata_create_action`, `strata_update_action_status` | strata_actions | decision exists; owner+due req; status enum | audit | action tracked to closure; Needs Attention rule picks overdue |
| Snapshot w/ authored data + names | §12, P2-04 | F-GOV-003/004 | /strata/reviews/:snapshotKey | evidence table shows entity names | REPLACE `strata_lock_snapshot` (payload += resolved entity_name) + NEW `strata_entity_name(type,id)` helper; backfill display via helper for old items | strata_snapshots/items | — | audit | lock snapshot after authoring; items show names; later edits don't change frozen items |
| Actor-aware audit | §10 AuditEvent, P2-03 | F-GOV-005 | /strata/admin (change log) | audit table gains Actor column (useProfileNames) | existing data (actor_id present) | strata_audit_events | — | — | change log answers "who" |
| Role assignment UI | §13 RBAC, P2-02 | F-GOV-006 | /strata/admin/roles | `RoleAssignModal` + roles JiraTable | NEW `strata_assign_role`, `strata_revoke_role` (admin-guarded) | strata_role_assignments | role enum; admin only; no dup | audit | assign second user; SoD flows pass |
| SoD proof | §12, P2 | F-GOV-007 | KPI detail / benefit detail | existing attest/validate modals | existing RPCs (SoD inside) | actuals/values | submitter≠validator enforced server-side | audit | same-user attest rejected; different user succeeds |
| Tenant isolation decision | §16 P2-01 | F-GOV-008 | — | documented single-tenant boundary (D-009 Q4) | — | — | — | 09_DECISIONS.md | decision record (already D-009/Q4) |

## Explicitly deferred (per ledger Phase 9 / spec Phase 5 — after core loop)
Live Jira connector (manual Project Card is the P0; Jira is one source enum value), ERP/BI connectors, AI advisory generation service, board-pack data-source extension beyond snapshot reconciliation, es_* cleanup (DRIFT-003).

## Risk register
- **Migration risk:** single additive migration; only two REPLACEs of existing functions (`strata_promote_element`, `strata_lock_snapshot`) — both strictly widen validation/payload; one CHECK constraint swap on `strata_gate_instances.subject_type` (additive value). Rollback = restore prior function bodies (kept in migration comments); constraint swap reversible.
- **Regression risk:** pages gain actions; read paths untouched. tsc baseline 183 must hold. Existing seeded reads must keep rendering (Appendix E regression list).
- **Data integrity:** all writes via role-guarded RPCs mirroring RLS; junction uniqueness enforced by DB.
- **RBAC/SoD:** rebuild proof uses two real staging users (submitter + validator) to exercise SoD.
- **Calculation:** milestone/dependency writes trigger execution recalc; actual attest triggers period recalc via UI invalidation + explicit calc RPC calls.
- **No-production:** all DDL through hook-verified `--linked` staging; prod ref never linked in this session.
