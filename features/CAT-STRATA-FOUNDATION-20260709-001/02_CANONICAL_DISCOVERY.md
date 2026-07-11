# 02 — CANONICAL DISCOVERY (as-is estate map)

> Evidence tier: repo system-evidence (highest authority for as-is claims). All rows `state: as-is` unless tagged.
> Sections B (scorecard/portfolio/governance estate) and C (module/nav/guardrail context) pending — agents running.

## EXECUTIVE FINDING

**The STRATA canonical model already exists and is production-wired.** `src/modules/strata/` is a complete, feature-flagged, routed module (built as `CAT-STRATA-20260705-001` + follow-ons through 2026-07-06) implementing **Strategy Cycle → Strategic Theme → Strategic Objective → OKR/Key Result → Project Card** end-to-end, backed by **60 `strata_*` Postgres tables**, write RPCs, RLS, a server-side calc engine, and an idempotent demo seed. It replaced a decommissioned legacy "StrategyHub". The locked-goal work is therefore a **gap-closure + consolidation refactor**, not a greenfield build.

---

## A. Strategy Execution estate (SRC-A, agent report 2026-07-09)

### A1. Route map (live)

Routes defined in `src/lib/routes.ts:252-284` (`strataRoutes`), mounted via `src/modules/strata/StrataRoutes.tsx`, wired at `src/routes/FullAppRoutes.tsx:614` behind feature flag `strategyhub` + role `enterprise` (`FullAppRoutes.tsx:383`).

| Path | Page |
|---|---|
| `/strata` | `pages/StrataCommandCenterPage.tsx` |
| `/strata/strategy` | `StrataStrategyRoomPage.tsx` |
| `/strata/strategy/elements/:slug` | `StrataStrategyElementDetailPage.tsx` |
| `/strata/strategy/map` | `StrataStrategyMapPage.tsx` |
| `/strata/scorecards`, `/:slug`, `/:slug/evidence` | `StrataScorecardsPage`, `StrataScorecardDetailPage`, `StrataEvidencePage` |
| `/strata/kpis`, `/:slug`, `/:slug/evidence` | `StrataKpiLibraryPage`, `StrataKpiDetailPage`, `StrataEvidencePage` |
| `/strata/execution`, `/import`, `/:slug` | `StrataExecutionPage`, `StrataExecutionImportPage` (`:slug` = **Project Card detail** — repointed from Initiative per Execution Reconciliation; "Project Card is the sole execution object", `routes.ts:266-270`) |
| `/strata/portfolio`, `/benefits/:slug`, `/:slug/evidence` | `StrataPortfolioVmoPage.tsx` |
| `/strata/data`, `/upload`, `/runs/:runKey` | `StrataDataPipelinePage`, `StrataUploadWizardPage` |
| `/strata/reviews`, `/:snapshotKey` | `StrataReviewsPage.tsx` |
| `/strata/admin`, `/:section` | `StrataAdminConfigPage.tsx` |

Legacy: `/strategyhub`, `/strategyhub/*`, `/strategy-room` → redirect-only to `/strata` (`src/App.tsx:141-245`). No `/strategy/*` or `/ideas` route exists anywhere.

### A2. Module inventory

- `src/modules/strata/types.ts` (776 lines) — typed mirrors of every `strata_*` table: `StrataCycle`, `StrataPeriod`, `StrataStrategyElement` (`element_type` + `context: 'theme'|'project'`), `StrataMapEdge`, `StrataPlayCharter`, scorecard types, `StrataKpi*`, `StrataOkr`, `StrataKeyResult`, `StrataInitiative`, `StrataProjectCard` (~55 fields), `StrataMilestone`, `StrataDependency`, Project-Card config-engine types, `StrataPortfolio`, `StrataBenefit*`, `StrataGateInstance`, lineage/governance types (`StrataSnapshot`, `StrataDecision`, `StrataAction`, `StrataBoardPack`, `StrataAiOutput`), import types.
- `domain/index.ts` (1004 lines) — sole Supabase access layer: `configApi`, `strategyApi`, `scorecardApi`, `kpiApi`, `executionApi`, `valueApi`, `lineageApi`, `governanceApi`. Rule at `domain/index.ts:1-6`: UI never computes calc numbers locally (server RPCs: `strata_calc_scorecard_instance`, `strata_calc_kpi_achievement`, `strata_calc_execution_progress`, `strata_calc_ytd`, `strata_calc_value_at_risk`, `strata_calc_benefit_realization`).
- `hooks/useStrata.tsx` (502 lines) — `StrataProvider` (active cycle/period, `?period=` bookmarkable), `useStrataRoles`, ~50 React Query hooks (`useStrategyElements`, `usePlayCharters`, `useOkrs`, `useProjectCards`, `useProjectObjectives`, `useProjectKpis`, `useMilestones`, `useDependencies`, `useBenefits`, `useGateInstances`, `useNeedsAttention`, …).
- `components/` — `ProjectCardDetailView.tsx` (config-engine-driven tabs/sections/fields), `InitiativeDetailModal.tsx`, `authoring.tsx`, `evidence.tsx`, `vmoAuthoring.tsx`, `shared.tsx`; `lib/boardPack.ts` (board-pack generation).

### A3. DB schema (60 `strata_*` tables; migrations 20260705100000 → 20260706231000)

Hierarchy mapping:

| STRATA concept | Table | Key columns |
|---|---|---|
| Strategy Cycle | `strata_cycles` | name, slug, starts/ends, period_granularity, status(draft/active/locked/closed) |
| Period | `strata_periods` | cycle_id, period_type, close_status |
| Strategic Theme | `strata_strategy_elements` (`element_type='theme'`, `context='theme'`) | cycle_id, name, slug, owner_id, parent_id, perspective_id, stage, status, map_position |
| Theme charter | `strata_play_charters` (**"play" name survives in DB/API**) | element_id, hypothesis, scope, value_thesis, gate_model_id, status |
| Strategic Objective | `strata_strategy_elements` (`element_type='objective'`) | DB trigger enforces parent = theme |
| Project Objective | `strata_strategy_elements` (`context='project'`) | exempt from 2-tier trigger; linked to Project Card via `strata_execution_links` |
| OKR | `strata_okrs` | objective_element_id FK, cycle_id, period_id, confidence, status |
| Key Result | `strata_key_results` | okr_id, kpi_id, baseline, target, current_value, direction |
| Project Card | `strata_project_cards` | reference_id (PRJ-00001), theme_id FK, card_type, pm_id, business_owner_id, budget, baseline/forecast dates, execution_health, calc_* health/forecast fields, optional_fields JSONB |
| Card config engine | `strata_project_card_{tab,section,field}_configs`, `_picklists` | per card_type rendering |
| Milestones | `strata_milestones` | project_card_id, baseline/forecast/actual, status, weight |

Other table groups: perspectives, threshold schemes, value categories, gate models/stages/instances/evidence, KPIs + formula versions/targets/actuals, scorecard models/instances/lines/model_perspectives, initiatives (+element/kpi/project junctions), portfolios + portfolio_memberships, benefits + benefit_values/initiatives/project_cards junctions, assumptions, attribution_rules, data sources, upload runs/templates/staging/validation, calculated_values, lineage_records, commentary, snapshots + snapshot_items, decisions, actions, board_packs, ai_outputs, audit_events, role_assignments, workflow_configs, config_change_requests, element_kpis, execution_links, map_edges.

**Key migration — `20260706230000_strata_theme_play_2tier_hierarchy.sql`:** product decision "Theme and Play are the same business concept"; relabelled all `element_type='play'` rows → `'theme'`; CHECK constraint now exactly `('theme','objective')` (`'play'` is an illegal value); trigger `strata_validate_element_parent_type` enforces the 2-tier Theme→Objective hierarchy (scoped to `context='theme'`); governance RPCs updated.

### A4. Legacy "Play" census (rename targets)

Only the **charter sub-object** still carries "Play" (no route, no enum value, no other table):

| Surface | Occurrence |
|---|---|
| DB table | `strata_play_charters` (5 migration files, 17 occurrences) |
| RPC | `strata_upsert_play_charter` |
| TS type | `StrataPlayCharter` (`types.ts:183-192`) |
| Domain API | `strategyApi.charters()` / `upsertCharter()` (`domain/index.ts:16,120-121,183`) |
| Hook | `usePlayCharters` (`useStrata.tsx:214-215`) |
| UI label | "Play charter" in `StrataStrategyRoomPage.tsx` (23,25,486,1092), `StrataStrategyMapPage.tsx` (25,162,551), `StrataStrategyElementDetailPage.tsx` (21,44) |

All other `Play` grep hits (~60) are the Atlaskit `Play`/`PlayCircle` **icon** or "Playwright" — out of scope.

### A5. Seed data

`supabase/migrations/20260705100600_strata_seed_salam_demo.sql` (418 lines, idempotent, keyed on demo cycle UUID `a5a1a000-…1001`): 5 perspectives (Financial, Customer, Digital, People, ESG), 1 threshold scheme (RAG), 5 value categories, demo cycle + elements + project cards ("Salam reference tenant"). No mock/fixture files under `modules/strata`.

### A6. Parallel/duplicate strategy stacks (consolidation decision points)

1. **`modules/objectives` + `modules/okr-v2`** — independent Objective/OKR implementation routed at `/enterprise/objectives` (`EnterpriseRoutesShell.tsx:11,39` → `src/pages/enterprise/EnterpriseObjectives.tsx`); own types/hooks/tables (non-`strata_*`). `okr-v2`'s `StrategyCockpit` is **dead code** (zero importers).
2. **`src/components/okr/`** (14 files) — oldest, third independent Objective/KR model.
3. **"Theme" naming collisions (unrelated concepts, must NOT be touched):** `src/pages/Themes.tsx` (Portfolio grouping tag, `/portfolio/.../themes`) and `src/components/workhub/themes/*` (Work Hub epic-adjacent grouping).
4. **Orphaned Astryx scaffolding** — `src/modules/strategy/astryx/*` references dead `/strategy/*`, `/ideas/*` routes; zero external importers; pre-STRATA leftover.
5. **Legacy schema residue** — `20260525000001_sync_strategy_upgrade.sql` (pre-STRATA) and `20260706130000_es_strategy_decommission.sql` (tore down `es_strategy_*`) — read both before build to confirm no dangling objects.

---

## B. Balanced Scorecard / VMO / Governance estate (SRC-B, agent report 2026-07-09)

### B1. Balanced Scorecard — EXISTS (mature)

Tables (`20260705100000`, `20260705100100`, `20260705100200`): `strata_perspectives` (governed, versioned, parent_id, ADS `color_token`), `strata_threshold_schemes` (RAG bands jsonb, escalation_rules), `strata_scorecard_models` (`owner_scope_type ∈ enterprise/sector/function/portfolio/initiative/custom`, rollup_method, full approval envelope draft→approved→retired/superseded), `strata_scorecard_model_perspectives` (weights must sum 100, `strata_validate_model_weights`), `strata_scorecard_instances` (cycle/period-bound, entity_scope, `locked_snapshot_id`), `strata_scorecard_lines` (`ref_type ∈ kpi/objective/benefit`, exactly-one-FK CHECK), `strata_kpis` (governed dictionary: unit, direction, frequency, 5 distinct ownership roles, threshold_scheme_id), `strata_kpi_formula_versions`, `strata_kpi_targets`, `strata_kpi_actuals` (segregation-of-duties CHECK validator≠submitter), `strata_okrs`, `strata_key_results`, `strata_commentary`.

Code: `StrataScorecardsPage` (279 ln), `StrataScorecardDetailPage` (535), `StrataKpiLibraryPage` (705), `StrataKpiDetailPage` (843), `StrataEvidencePage` (572); `scorecardApi`/`kpiApi` in `domain/index.ts` (~198, ~268). Scores come only from `strata_calc_*` RPCs or frozen snapshot payloads.

Collisions (NOT BSC — leave alone): `src/components/releases/dashboard/ScorecardBar.tsx`, `src/modules/tasks/components/insights/DailyScorecardView.tsx`. Dead legacy: `public.scorecards` table (bootstrap migration, 5 columns, zero code refs, zero seeds).

### B2. VMO / Portfolios / Benefits — EXISTS (mature)

Tables (`20260705100300`, `20260706190000`): `strata_portfolios` (category_id→value_categories, strategy_scope jsonb, value_target), `strata_portfolio_memberships` (`member_type ∈ ('initiative','project_card')`, allocation_pct), `strata_benefits` (9-state lifecycle identified→…→finance_validated→closed, portfolio_id FK, owner/validator SoD CHECK), `strata_benefit_project_cards` (**current primary attribution path**; comment: "Theme-level attribution is derived through project_card.theme_id, not stored separately"), `strata_benefit_initiatives` (legacy), `strata_benefit_values` (`value_kind ∈ baseline/planned/forecast/realized` + validation_status — exactly the requested Planned/Forecast/Realized/Validated model), `strata_assumptions`, `strata_attribution_rules` (`shared_benefit/counterfactual/double_counting`), `strata_gate_instances`/`strata_gate_evidence` vs governed `strata_gate_models`/`_stages`.

Code: `StrataPortfolioVmoPage.tsx` (1100 ln), `vmoAuthoring.tsx` (431), `valueApi` (~640).

Non-STRATA "benefit" hits are unrelated text-field stubs: `src/components/backlog/DetailPanel/tabs/BenefitsTab.tsx`, `src/components/epic-backlog/tabs/BenefitsTab.tsx` — no logic to migrate.

### B3. Two "project" concepts — do not conflate

1. **Legacy `public.projects`** (bootstrap L37064) — SAFe/Jira-clone delivery entity (program_id, sprint counts, wip_limits) behind `src/pages/project-hub/*` (30+ pages). NOT the executive Project Card. Stays as a Jira-sync source feeding `strata_project_cards.source_key`.
2. **`strata_project_cards`** — "the sole execution object" (reconciliation migration header). Source-agnostic (`source_system ∈ jira/manual/upload/api`); budget, pm_id, business_owner_id, baseline/forecast/calc dates, execution_health + server-computed `calculated_health`, progress/variance, milestones + dependencies tables with source traceability, `risk_summary`/`dependency_summary`, config-engine tabs/sections/fields per card_type, `optional_fields` jsonb (strategic_pillar, aop_mapping, stakeholders, …), `reference_id` PRJ-#####. **Verdict: essentially ALL requested Project Card fields already exist.** Legacy `strata_initiatives` kept back-compat only — Project Card supersedes Initiative.

### B4. Governance — EXISTS (mature, STRATA-only, no legacy equivalent anywhere)

Tables (`20260705100400`, `20260705100100`): cadence/close = `strata_cycles` (snapshot_policy jsonb, status) + `strata_periods` (close_status, closed_by/at); `strata_snapshots` (INSERT-only, SNAP-####, supersession via RPC only) + `strata_snapshot_items` (frozen payloads); `strata_decisions` (DEC-####, forum, snapshot_id, evidence_refs); `strata_actions` (ACT-####, decision_id, owner, due); `strata_board_packs` (snapshot_id, pdf/pptx, "reconcile to snapshot_key"); `strata_audit_events` (immutable, trigger `strata_audit()` on every governed table); `strata_ai_outputs` (advisory-only, human_review_status); lineage: `strata_data_sources`, `strata_upload_runs` (RUN-####, file_hash), `strata_staging_rows`, `strata_validation_results`, `strata_lineage_records`, `strata_calculated_values` (value+score+band+formula_version+inputs+source_run_ids).

Code: `governanceApi` (~898: lockSnapshot, closePeriod, decision/action CRUD), `StrataReviewsPage.tsx` (1028 ln — LockSnapshotModal, ClosePeriodModal with attestation guard, snapshot rail), `lib/boardPack.ts` (326 ln — jsPDF/pptxgenjs from frozen snapshot data only).

### B5. Theme ↔ Portfolio linkage — CONFIRMED ABSENT (by design)

Exhaustive FK/RPC search across all portfolio migrations + the 120K authoring RPC migration: **no stored Theme↔Portfolio pair anywhere.** Only path is two hops: `strata_strategy_elements(theme) ←theme_id← strata_project_cards ←member_id← strata_portfolio_memberships → strata_portfolios` (plus deprecated initiative path). The migration comment makes the ban an explicit design rule already. Legacy `public.objectives` carries both `theme_id` + `portfolio_id` on one row, but those are unrelated concepts (release-hub epic-theme tagging + SAFe agile-portfolio) — not evidence of a business linkage.

### B6. Reuse verdicts

| Area | Verdict |
|---|---|
| Balanced Scorecard | **Refactor-in-place** (extend); drop dead `public.scorecards` |
| VMO/Portfolios/Benefits | **Refactor-in-place** (extend); ignore unrelated BenefitsTab stubs |
| Governance | **Refactor-in-place** (extend); nothing to reconcile — STRATA-only |
| Project Card | **Refactor-in-place**; finish Initiative→Project Card migration; keep `public.projects` as sync source |
| Theme↔Portfolio ban | **Nothing to remove** — codify the rule so it can't regress |

---

## C. Module / navigation / guardrail context (SRC-C, agent report 2026-07-09)

### C1. Module registration recipe (ideation = reference; strata = live example)

1. `src/modules/<name>/` (barrel index.ts, pages/, admin or Routes.tsx shell, types.ts)
2. Typed builders in `src/lib/routes.ts` (`strataRoutes` L252-283 is the fullest example) + `Routes` barrel (L357-359)
3. Mount in `src/routes/FullAppRoutes.tsx` — STRATA pattern: `<MG k="strategyhub" t="STRATA">` wrapping lazy `StrataRoutesShell` at `/strata/*` (L614); `MG` = `ModuleGate` (org flag) + `ModuleGuard` (role) via `MG_ROLE_KEY` (L381-386)
4. Env flag in `src/lib/featureFlags.ts` (`VITE_ENABLE_*`)
5. `HubSwitcher.tsx` HUBS array entry (+ flag filter L70-85)
6. `HomeSidebar.tsx` rail entry (L109-110, flag filter L467-470)
7. Sidebar: **STRATA has NO dedicated sidebar — it reuses `EnterpriseSidebar.tsx`**, which already models a 3-section + config nav: (Command Center / Strategy Room / Scorecards / KPI&OKR), (Execution / Portfolio & Value), (Data & Lineage / Reviews & Decisions), (Configuration) — `EnterpriseSidebar.tsx` L28-57
8. `src/config/routeRegistry.ts` page-title entries (STRATA: 13 entries L19-32)
9. Admin surface `/strata/admin` (`StrataAdminConfigPage`)
10. DB `feature_flags` row `module_key='strategy_hub'`

### C2. Navigation facts

- `CatalystShell.tsx`: HUB_ROUTES (L240-250), lazy sidebar imports (~L109-208), route-prefix checks include `/strata` (~L552-564).
- **`StrataSwitcher.tsx` + `useStrataSwitcher.ts`** — a PRODUCT-level switcher (CATALYST ↔ STRATA) driven by `VITE_APP_PRODUCT`, from `CAT-STRATA-ISOLATE-20260707-001`. STRATA is being treated as a quasi-separate product; see also `README_STRATA_ISOLATION.md` and git stash `strata-standalone`. **Decision needed before extending nav.**
- `IdeationSidebar.tsx` shows the `SidebarBase`/`SidebarConfig` recipe if a dedicated 4-area STRATA sidebar is wanted.

### C3. Routing + slug facts

- All paths via typed builders; STRATA slug hooks are module-local (`useStrategyElementBySlug` in `useStrata.tsx`).
- **No `UuidToSlugRedirect` component exists anywhere** (exhaustive search) — detail pages resolve `useParams<{slug}>` + `useXBySlug`. Legacy-UUID redirects would follow the `StrategyhubLegacyRedirect` `Navigate` pattern (`App.tsx` L146-148).
- Slugs DB-generated and frozen: `strata_slugify()` + `strata_generate_slug()` trigger (derive from name only when slug null, dedupe `-2`/`-3`), applied via loop in each migration.

### C4. Astryx ring-fence — orphaned

`AstryxZone` never imported outside its own directory; its intended mount points (`/strategy/*`, `/ideas/*`) no longer exist. `/strata/*` is **NOT** Astryx-zoned (StrataRoutesShell = StrataProvider + plain Routes). Reviving Astryx for STRATA would be a NEW decision; otherwise dead code to remove.

### C5. Feature flags — three layers

(1) env `VITE_ENABLE_*` (`featureFlags.ts`), (2) DB `public.feature_flags` via `ModuleGate`/`useModuleEnabled` (`FeatureFlagContext`), (3) role access via `ModuleGuard`/`useModuleAccess` (`admin_role_module_permissions`, `OVERRIDE_KEY_TO_CANONICAL` maps `strategy_hub`→`enterprise`).

### C6. Migration/RLS conventions

`YYYYMMDDHHMMSS_strata_<topic>.sql`, one concern per file. RLS: per-action policies — select `current_user_is_approved()`; insert `strata_has_role(ARRAY['strategy_office']) AND status='draft'`; update/delete status- and ownership-gated (`strata_is_admin()`). Governed records carry version/status/approval/audit columns. `organization_id` nullable (single-tenant note).

### C7. CRE (Catalyst Rules Engine)

`src/lib/catalyst-rules/` (CatalystRules.ts + RULE_TABLE.md = source of truth). Grid A: `Theme` (A13) and `Objective` (A14) owned by ENTERPRISE. Grid C `BANNED_LINK_PAIRS` + `canLinkTo()` enforce link bans — but **only for `ph_*` work-item types**. STRATA Portfolio is a `strata_*` domain entity, so the Theme↔Portfolio ban must be enforced at the STRATA domain/DB layer (CHECK constraint / RPC validation / trigger on any future edge table), not (only) CRE. Chokepoint gate: `npm run lint:cre` in pre-commit + CI. Grid E: canonical L1/L2 layout (`CatalystListPageLayout`, `AtlaskitPageShell flush`, breadcrumb contract) for any new STRATA pages.

### C8. Tests

Vitest + RTL, colocated `__tests__/` folders (see `src/components/layout/__tests__/HubSwitcher.test.tsx` for the flag-mocked pattern). **No test files exist under `src/modules/strata/` — a real gap** given the goal requires smoke tests.
