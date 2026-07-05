# STRATA — Phase 1 Discovery Report
**Feature Work ID:** CAT-STRATA-20260705-001 · **Date:** 2026-07-05 · **Phase:** 1 of 3 (Discovery only — nothing implemented)
**Evidence basis:** 10 parallel read-only discovery agents (full outputs in `12_AGENT_OUTPUTS.md`); blueprint + 3-phase contract mirrored in `blueprint/`.

---

## 1. Executive summary

Catalyst can host STRATA as a greenfield module with high reuse of *infrastructure* and near-zero reuse of *old strategy code*. The repo has: a mature routing/hub registration system (one `HUBS[]` entry + `FullAppRoutes` block), a locked design system with canonical components (JiraTable, StatusLozenge, EmptyState, PageContainer, pragmatic-DnD) and two unused dependencies that fit STRATA's hardest UI needs (`@xyflow/react` for the strategy map canvas, `react-resizable-panels` for split panes). The Supabase layer has strong conventions (UUID PKs, slug contract, RLS patterns, immutable-snapshot and audit-trigger precedents) but **none of the STRATA domain tables exist** — no scorecard models, KPI targets/actuals, value gates, decision register, upload runs, or versioned governed config.

The old strategy surface (`/strategyhub` → dormant `StrategyRoom`, `es_*` tables, `okr-v2`) is prototype residue: routed but dormant. Verdict: **replace, do not patch** — reuse only its RBAC-scoping pattern and selected visualization widget ideas.

Three systemic risks demand architectural counters (all with cited evidence in §8): (1) business calculations currently drift client-side in hooks — STRATA must centralize in versioned RPCs; (2) ~40% of sampled RLS is weak (`USING(true)` / bare auth checks) and segregation of duties is enforced nowhere — STRATA must be RLS-strict with server-side approval RPCs; (3) the Jira pipeline is tightly coupled (UI reads `ph_issues` directly) — STRATA's ProjectCard must sit behind a mapping/normalization seam and never adopt Jira's schema.

---

## 2. Existing-state inventory & reuse/replace/delete verdicts

### 2.1 Strategy residue (all currently routed unless noted)
| Asset | Path | Verdict | Rationale |
|---|---|---|---|
| Strategy Room page | src/modules-dormant/strategy/StrategyRoom.tsx | **REPLACE** | Dormant prototype; not config-first; violates blueprint Appendix E ("treat Astryx/StrategyHub as residue") |
| ComingSoon stubs | src/modules-dormant/strategy/StrategyComingSoon.tsx | **DELETE** (at Phase 3 cutover) | Placeholder; anti-pattern for executive product |
| Themes/Goals pages | src/modules-dormant/strategyhub/*.tsx | **REPLACE** (mine for patterns only) | Screen-led, not domain-led |
| Strategy types | src/types/strategy/index.ts | **REFERENCE ONLY** | es_* shapes are not STRATA's model; useful naming reference |
| Strategy RBAC context | src/contexts/strategy/RoleContext.tsx | **REUSE PATTERN** | scoped-role pattern (owner/contributor/viewer + scope_type/scope_entity_id) matches STRATA persona model |
| Strategy viz widgets | src/components/strategy/widgets/ (ExecutionDials, OkrTree, StrategyPyramid, OkrHeatmap) | **SELECTIVE REUSE** | Visual ideas only; must be re-based on domain services + ADS tokens |
| Strategy hooks | src/hooks/strategy/useStrategyData.ts etc. | **REFERENCE ONLY** | Query/mutation shape reference; bound to es_* tables |
| okr-v2 module | src/modules/okr-v2/ (@ /enterprise/okr) | **COEXIST — decision needed (Q2)** | Live OKR surface; STRATA has its own OKR domain per blueprint §8 |
| es_* tables | es_initiatives, es_snapshots, es_strategy_roles, es_goal_initiatives, es_kr_initiatives (bootstrap dump) | **LEAVE UNTOUCHED** | Referenced by live code; STRATA uses new `strata_*` namespace; decommission decision deferred (Q2) |
| Dormant tables | strategy_missions/visions/values, snapshot_configurations, epic_benefits, epic_scorecard_responses | **LEAVE UNTOUCHED** | Unreferenced; no collision with strata_* |
| Hub registry entry | src/lib/hubs.ts `{ id: 'enterprise', label: 'Strategy Hub', path: '/strategyhub' }` | **REPURPOSE — decision needed (Q1)** | STRATA should own the strategy tile |

### 2.2 Reusable infrastructure (verdict: REUSE)
| Need | Asset | Path |
|---|---|---|
| Hub/route registration | HUBS[] + FullAppRoutes MG pattern + routes.ts builders | src/lib/hubs.ts, src/routes/FullAppRoutes.tsx, src/lib/routes.ts |
| Module gating | ModuleGate (feature_flags) + ModuleGuard (admin_role_module_permissions) + MG_ROLE_KEY | src/routes/FullAppRoutes.tsx:371–388 |
| Tables | JiraTable + inline editor suite | src/components/shared/JiraTable/ |
| Status pills | StatusLozenge + statusPalette (LOCKED) | src/components/shared/StatusLozenge/, .../statusPalette.ts |
| Modals / empty / layout | DangerConfirmModal, EmptyState, PageContainer | src/components/shared/, src/components/ads/ |
| DnD | @atlaskit/pragmatic-drag-and-drop (PragmaticBoard + ProjectDashboardPage edit mode) | src/components/kanban/PragmaticBoard.tsx |
| Canvas / split panes | @xyflow/react ^12.10.2, react-resizable-panels ^2.1.9 (in deps, unused) | package.json |
| Charts | recharts ^3.5.1, framer-motion, date-fns | package.json |
| DB conventions | UUID PK, timestamps+trigger, slug contract (catalyst_slugify + generate_slug), org_id scoping, RLS patterns | supabase/migrations/20260701000006_slug_infrastructure.sql et al. |
| Immutable snapshot pattern | tm_step_results denormalization | 20260703100001_tm_step_results_immutable_snapshot.sql |
| Audit patterns | activity_logs (before/after JSONB), work_item_changelogs + SECURITY DEFINER triggers, ph_initiative_audit_log (gold standard) | 20260703180000, 20260218204811 |
| Version pinning | tm versions + locked_version | 20260703100623_tm_cycle_scope_locked_version.sql |
| Approval seed pattern | ph_release_approvers / ph_sprint_approvers + RLS hardening | 20260625000000, 20260703260000 |
| Run tracking | ph_sync_log counters, mock_runs status machine + file retention | 20251227091608 |
| Staging/validation shape | injira_import_jobs/manifests/diff_reports/mappings (built, unwired) | migrations (injira_*) |
| Source-agnostic sync plumbing | sync_events, sync_entity_map, sync_status_map, sync_user_map, sync_cooldowns | 20260402164315 |
| Server calc precedents | get_command_center_kpis, get_cc_team_performance, calculate_objective_score RPCs; WSJF triggers | 20260211144932, 20251211141446 |
| Upload UX | useStagedAttachments flow, ph_attachments, xlsx dep | src/features/chat-v2/hooks/, package.json |
| RBAC core | product_roles + user_product_roles + useProductRoles/useUserRole + admin_permission_audit | src/hooks/useProductRoles.ts, useUserRole.ts |

### 2.3 What does NOT exist (build new — DB gaps)
Scorecard models/instances/lines · perspectives (governed) · KPI definitions/formula versions/targets/actuals · OKR/KR (STRATA-domain) · strategy cycles/periods · strategy elements/map edges (config-typed) · initiatives/project cards/milestones/dependencies/execution links (source-agnostic) · portfolios/memberships · benefits (baseline/target/actual/assumptions/attribution) · gate models/instances · snapshots/calculated values · decisions/actions/board packs · data sources/upload templates/upload runs/staging rows/validation results/lineage records · threshold schemes/value categories · versioned-config change requests + approvals · STRATA audit events · AI advisory outputs with provenance.

---

## 3. Proposed architecture (PROPOSAL ONLY — nothing applied)

### 3.1 Domain modules (mirrors blueprint §23)
All STRATA tables namespaced **`strata_`** (avoids es_*/ph_* collision). All org-scoped via `organization_id`, RLS-strict, UUID PKs, slugs/display-keys per slug contract (no :id routes).

| Domain | Proposed tables (key fields elided; every governed record carries version, status, effective_from/to, approved_by, change_reason) |
|---|---|
| admin-config | strata_perspectives, strata_threshold_schemes, strata_value_categories, strata_gate_models (+criteria), strata_upload_templates (+columns/validations), strata_workflow_configs, strata_kpi_type_configs, strata_config_change_requests, strata_config_approvals |
| strategy | strata_cycles, strata_periods, strata_strategy_elements (typed via config: theme/play/objective/outcome; self-ref parent), strata_map_edges (from/to/relationship_type/confidence), strata_play_charters, strata_element_kpis (m2m + weight) |
| scorecard | strata_scorecard_models (+model_perspectives m2m w/ weight/order, rollup_method, threshold_scheme ref, version), strata_scorecard_instances (owner_scope, period, status live/locked), strata_scorecard_lines (typed polymorphic ref → KPI/objective/benefit, weight, perspective) |
| kpi/okr | strata_kpis (identity/ownership: accountable owner, data owner, reporter, validator, escalation owner; status draft→approved→retired), strata_kpi_formula_versions, strata_kpi_targets (per period, versioned), strata_kpi_actuals (period + source_run unique; validation_status; confidence), strata_okrs, strata_key_results (kpi_ref OR standalone), strata_commentary (polymorphic) |
| execution | strata_initiatives, strata_project_cards (source_system, source_key — never Jira-shaped), strata_milestones (baseline/forecast/actual), strata_dependencies, strata_execution_links (source obj, target obj, relationship_type, confidence, mapping_owner) |
| value/VMO | strata_portfolios, strata_portfolio_memberships (allocation %), strata_benefits (lifecycle stages), strata_benefit_baselines/targets/actuals, strata_assumptions, strata_attribution_rules, strata_gate_instances (+evidence, verdict) |
| data-lineage | strata_data_sources (registered before feeding approved KPIs), strata_upload_runs (run id, file hash, raw/valid/rejected counts, status machine), strata_staging_rows (raw JSONB + validation_status), strata_validation_results (row-level errors), strata_lineage_records (canonical write provenance) |
| governance | strata_snapshots (immutable; config versions + data-run versions frozen), strata_calculated_values (entity ref, period, value, score, status, formula_version, inputs, source versions, run id, confidence), strata_decisions (forum, snapshot_id), strata_actions, strata_board_packs, strata_audit_events |
| ai-advisory | strata_ai_outputs (use_case, snapshot/config refs, live-vs-locked flag, confidence, cited evidence refs, human_review_status) |
| rbac | Reuse product_roles/module permissions for module access + strata_role_assignments (scoped roles per es_strategy_roles pattern: role, scope_type, scope_entity_id) for persona separation (CEO/CXO consume; Strategy Office governs; KPI owner submits; VMO/Finance validates; admin configures). DB-enforced approver ≠ submitter. |

### 3.2 Calculation engine (blueprint §20)
**RPC functions + versioned formula metadata** (matches proven Catalyst RPC pattern; rejected: edge-function calc (latency, no batch), client-side calc (banned)). All scoring — KPI achievement, banded/lower-is-better normalization, weighted rollups, YTD aggregation, benefit realization index, value-at-risk, execution progress — computed server-side, returning value + score + RAG + formula_version + calculated_at + confidence atomically; results persisted to `strata_calculated_values` with full provenance. UI **never** computes scores; `statusPalette`-style lookups remain presentational only.

### 3.3 Lineage pipeline (blueprint §19 / Flow 1)
Source registration → upload run (raw file retained in storage bucket + hash + run ID) → staging rows → schema validation (row-level errors, quarantine) → business validation (owner attestation, validator sign-off — segregated) → canonical write (only accepted values; lineage record) → calculation (provenance) → snapshot lock → decision evidence. Reuses: mock_runs status-machine shape, ph_sync_log counters, injira manifest/diff patterns, staged-attachment upload flow. Sensitive transitions via SECURITY DEFINER RPCs, not client writes.

### 3.4 ProjectCard source abstraction (blueprint §9 / Flow 3)
STRATA never reads `ph_issues`/Jira-shaped rows in UI. A Jira **connector adapter** maps existing ph_* data into `strata_project_cards` + `strata_execution_links` (source_system='jira', source_key, confidence, mapping_owner) via config-driven field mappings; manual/Excel/API sources use the same seam. Reuse sync_entity_map/sync_events conventions.

### 3.5 Route map & IA (slug contract; no :id params)
```
/strata                          Command Center (executive landing)
/strata/strategy                 Strategy Room (cycle-aware)
/strata/strategy/map             Strategy Map Canvas (@xyflow)
/strata/scorecards               Scorecard index → /strata/scorecards/:slug (instance)
/strata/kpis                     KPI/OKR Library → /strata/kpis/:slug (KPI detail w/ lineage)
/strata/execution                Initiatives + Project Card linkage → /strata/initiatives/:slug
/strata/portfolio                Portfolio / VMO benefits → /strata/benefits/:slug
/strata/data                     Upload / Validation / Lineage pipeline → /strata/data/runs/:runKey
/strata/reviews                  Snapshot / Decision cockpit → /strata/reviews/:snapshotKey
/strata/admin                    Admin Configuration Engine (taxonomy, models, formulas,
                                 gates, uploads, workflows, RBAC, versions) — sub-tabs
```
Registered via: `HUBS[]` entry + feature flag (`strata`) + MG_ROLE_KEY role + `Routes.strata.*` builders + `routeRegistry` breadcrumbs. All redirects mounted in App.tsx OUTSIDE CatalystShell (known Navigate-swallowing trap).

### 3.6 Service/hook structure
```
src/modules/strata/
  domain/        typed domain services per domain (strategy, scorecard, kpi, execution,
                 value, lineage, governance, admin, ai) — the ONLY layer touching supabase
  hooks/         useStrataConfig(), useScorecardInstance(slug), useKpiBySlug(), useUploadRun(),
                 useSnapshot(), useStrataRole() — thin React Query wrappers over domain services
  components/    STRATA-specific composites built from canonical components
  pages/         route-level screens (query hooks only; zero business math)
supabase/functions/strata-*   only where RPCs can't serve (file parsing, board-pack export)
```
Screens read from selected **model + cycle + period + config version** context (visible on every screen per blueprint §5) and display live/draft/pending-validation/locked state labels.

---

## 4. UI/UX strategy & design benchmark (Phase 2 preparation — 80% weight)

- **Benchmarks (in-repo gold standards):** ReleaseHub CommandCenterPage (KPI stat cards + drilldowns), ProjectDashboardPage (12-col DnD widget grid, executive scan-order sections), ReleaseDetailPage (lifecycle tracker + tabbed detail shell).
- **Beyond benchmark:** STRATA must exceed these — evidence drawers on every metric (owner, formula version, source run, validation, snapshot), config-awareness header (model/cycle/period/config version), state lozenges (live/draft/pending/locked), strategy map canvas (@xyflow + ADS tokens), scenario panels, dense-but-usable hierarchy.
- **Anti-patterns to avoid (cited in repo):** ComingSoon placeholders, CRUD-grade admin (AdminAccessPage style) — the Admin Config Engine must be a control plane with versions/approvals/effective dates, not forms; self-rolled menus; Tailwind/ADS dark-mode mixing; modal-first drilldowns (route-first, bookmarkable).
- **Hard rules:** ADS tokens only (ratchet gates block violations), canonical components first, JiraTable for list surfaces, route-first drilldowns, dark mode verified via system reload, responsive at 768/1024/1440, keyboard a11y per JiraTable conventions, 7-PNG evidence set per surface.
- **Phase 2 output:** exactly 10 screenshots (list in 10_SCREENSHOT_CHECKLIST.md) then HARD STOP for approval.

---

## 5. Risk register

| # | Risk | Severity | Evidence | Counter |
|---|---|---|---|---|
| R1 | Client-side score drift (hooks compute health/progress locally today) | HIGH | useBusinessRequestHealth.ts:92–94, useReleaseHealth.ts:71–72 | Calc engine RPC-only; lint rule/code-review gate: no arithmetic on scores in src/modules/strata UI |
| R2 | Weak RLS habits leak into STRATA | HIGH | USING(true) on tm_plan_approvals (20260211183753:145–150), transition_approvers | Every strata_ table ships with org+role policies; sensitive writes via SECURITY DEFINER RPC; security review before merge |
| R3 | No segregation-of-duties precedent | HIGH | No approver≠submitter constraint anywhere in repo | DB triggers enforcing approver ≠ submitter; validator/owner role separation in strata_role_assignments |
| R4 | Jira schema bleed into ProjectCard | HIGH | UI reads ph_issues in 20+ files (useKanbanData.ts:79); normalization duplicated | Mapping-layer seam (§3.4); STRATA UI forbidden from ph_* tables |
| R5 | Hard-coded config (perspectives/RAG/gates) — historic failure mode | HIGH | Blueprint §24; repo-wide constant arrays precedent | All business truth in strata_ config tables; seed = Salam demo data only; acceptance check greps for constants |
| R6 | CatalystShell Navigate trap breaks redirects | MEDIUM | App.tsx:134–138 precedent; FullAppRoutes swallows Navigate | All redirects in App.tsx outside shell; test day 1 of Phase 3 |
| R7 | Migration ledger drift (staging vs prod; prod missing tables) | HIGH | Known incident history (memory: staging-first); 1,165-file ledger | Staging-first; verify supabase/.temp/project-ref before any linked op; 1:1 ledger discipline |
| R8 | Scope explosion (STRATA becomes PM tool/BI warehouse) | MEDIUM | Blueprint §2 boundary table | Boundary table enforced in Plan Locks; release slicing R0→R5 |
| R9 | es_*/strategyhub collision or confusion | MEDIUM | /strategyhub routed; 'enterprise' hub tile exists | Q1/Q2 decisions before Phase 3; strata_ namespace guarantees no DB collision |
| R10 | Snapshot immutability bypass via direct updates | HIGH | Client-write precedents (FixCTCModal.tsx:194–197) | Snapshot tables: INSERT-only RLS + supersede-flow RPC; no UPDATE policy |
| R11 | Vitest/Node-20 uncertainty (agent says working; memory says broken) | LOW | vitest.config.ts present; 312 tests | Re-verify `npx vitest run` at Phase 3 start; fall back to Chrome MCP DOM probes |
| R12 | 2-hour slice rule vs module size | MEDIUM | Contract | Phase 3 sliced per release plan (§7); each slice its own Plan Lock scope |

---

## 6. Traceability matrix (blueprint + flowcharts → planned delivery)

| Contract item | Source | Planned delivery | Phase |
|---|---|---|---|
| Config-first product model; perspectives as records | Blueprint §5, §12, App B; Flow 2 | strata_ config tables + Admin Config Engine + versioning/approvals | 2 (design) / 3 (build) |
| Strategy cycles/periods/snapshot policy | §6, §15 | strata_cycles/periods; cycle manager in Strategy Room | 2/3 |
| Strategy hierarchy + map canvas (hierarchy + network) | §6, §15; Flow 3 | strata_strategy_elements + strata_map_edges; @xyflow canvas | 2/3 |
| Strategic plays w/ promotion control (charter+owner+KPI set+value thesis+stage required) | §6 | strata_play_charters + promotion validation RPC | 3 |
| Scorecard models/instances/lines, weighted, versioned, drillable | §7, §15; Flow 2 | scorecard domain + model builder + drilldown chain | 2/3 |
| KPI library: identity/ownership(5 roles)/measurement/targets/lineage/governance | §8, §16 | kpi domain + KPI detail w/ evidence drawer | 2/3 |
| OKR interop (KR uses KPI or standalone) | §8, §16 | strata_okrs/key_results | 3 |
| Initiative/ProjectCard/Milestone/Dependency/ExecutionLink, source-agnostic + confidence | §9, §17; Flow 3 | execution domain + mapping seam | 2/3 |
| Portfolio/VMO: benefit lifecycle, baselines, assumptions, attribution, gates, value-at-risk | §10, §17; Flow 3 | value domain + VMO screens | 2/3 |
| Live vs locked snapshots; decision records; action register; board pack | §11, §21; Flows 1&3 | governance domain + Snapshot/Decision cockpit | 2/3 |
| Admin control plane (taxonomy/scorecards/formulas/cycles/gates/uploads/RBAC/integrations) | §12; Flow 2 | /strata/admin engine | 2/3 |
| AI advisory-only w/ provenance + human review | §13; contract §6.11 | strata_ai_outputs + advisory UI markers; no mutation paths | 3 |
| Entity catalogue (§15–17 full list) | §15–17 | §3.1 table map (1:1 coverage) | 3 |
| Relationship/cardinality (m2m KPI↔objective, polymorphic scorecard lines, membership %) | §18 | m2m + typed-ref tables per §3.1 | 3 |
| Lineage pipeline 8 steps w/ failure handling | §19; Flow 1 | data-lineage domain (§3.3) | 2/3 |
| Formula/rollup/score logic centralized w/ provenance | §20 | calc engine (§3.2) | 3 |
| Versioning/audit model (7 versioned object classes) | §21 | governed-record pattern + audit events | 3 |
| Upload/integration channels (Excel, Jira, ERP, BI, manual, API) | §22 | R1: Excel/manual + registered sources; Jira adapter R2; ERP/BI deferred (Q6) | 3 (partial; deferred items listed) |
| Domain-led packages, no screen-led storage | §23 | §3.6 module structure | 3 |
| Architecture decisions (8) | §24 | adopted verbatim in 09_DECISIONS.md | — |
| Release slicing R0–R5 | §25 | Phase 3 slice plan (§7 below) | 3 |
| Acceptance criteria (App D) + feature-area criteria (contract §6) | App D | Phase 3 validation suite + final traceability matrix | 3 |
| 10 mandatory screenshots + hard stop | Contract Phase 2 | 10_SCREENSHOT_CHECKLIST.md | 2 |
| Salam as seed/demo tenant only | §1, App F | seed scripts labeled demo; no Salam constants | 3 |

Every §15–17 entity and every Flow 1/2/3 node maps to a table or screen above; no contract item is unmapped. Deferred candidates (need approval): ERP/BI live connectors, board-pack export format (Q6, Q7).

## 7. Proposed Phase 3 slice plan (post-approval; blueprint §25)
R0 Foundation: config engine + RBAC + audit shell → R1 Strategy & Scorecard (+KPI library, uploads) → R2 Execution linkage (Jira adapter via seam) → R3 VMO/Portfolio → R4 Executive decision layer (command center, snapshots, board packs) → R5 AI advisory + remaining connectors. Each release = multiple ≤2h Plan-Locked slices with own validation evidence.

---

## 8. Questions requiring owner approval (blocking Phase 2 → 3 as noted)

- **Q1 (Phase 2 blocker):** Hub placement — repurpose the existing 'Strategy Hub' tile (`id: 'enterprise'`, `/strategyhub`) to STRATA at `/strata`, or add STRATA as a new 10th hub and leave /strategyhub untouched? Proposal: repurpose tile → /strata; /strategyhub redirects (from App.tsx).
- **Q2 (Phase 3 blocker):** Fate of es_* tables + okr-v2 module — freeze-and-ignore (proposed), or decommission after STRATA R1?
- **Q3 (Phase 2 input):** Screenshot list discrepancy — your prompt lists {Command Center; Strategy Room; Strategy Map Canvas; Admin Config; KPI/OKR Library; Scorecard; Initiative/Project linkage; Portfolio/VMO; Upload/Validation/Lineage; Snapshot/Decision}; the attachment md lists Strategy Room+Map combined and adds Taxonomy/Perspective Manager and Scorecard Model Builder as separate shots. Which set is canonical? Proposal: attachment md set (it's the "Mandatory 10" table).
- **Q4 (Phase 3 blocker):** Tenancy — Catalyst is single-org with organization_id columns; blueprint assumes Tenant entity. Confirm single-org deployment with org-scoped columns (multi-tenant-ready, not multi-tenant-active).
- **Q5:** Calc engine = RPC + versioned formula tables (recommendation §3.2) — confirm.
- **Q6:** Confirm deferral of live ERP/BI connectors to post-R5 (registered source + governed upload channels first).
- **Q7:** Board pack export format (PDF? PPTX?) — needed by Phase 2 design of the cockpit.
- **Q8:** Salam reference data — confirm it ships only as clearly-labeled demo seed for a demo org.

## 9. Assumptions blocked from implementation
1. No DB objects, migrations, or seeds until Phase 3 approval — the §3.1 schema is a proposal.
2. No route/nav changes (incl. Q1 repurposing) until Phase 2 approval.
3. No deletion of es_*/dormant strategy code until Q2 decided.
4. No AI features until governance guardrails (advisory-only, provenance) are implemented and reviewed.
5. Perspective/RAG/gate/workflow examples used in Phase 2 mocks are demo config, never constants.
6. All Phase 2 visuals are design artifacts only — no production wiring.
