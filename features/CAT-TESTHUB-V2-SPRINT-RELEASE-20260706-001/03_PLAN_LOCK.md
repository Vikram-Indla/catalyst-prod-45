# PLAN LOCK — CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 (MASTER)

**Status:** APPROVED (2026-07-06)
**Approved by:** Vikram — Plan Lock + D-001 (bridge to rh_releases), D-002 (new tm_test_executions parent), D-003 (enum ADD VALUE 'hold'), D-004 (TestSets → Plans redirect)
**Timebox:** 2 hours per slice; 55 slices total (~110h nominal). Each slice executes under this master lock; no slice may exceed 2h without split.
**Scope authority:** V2 package `/Users/vikramindla/Downloads/catalyst_test_module_v2_sprint_release_package 2/` (locked user mental model). Conflict precedence: mental model → V2 architecture → acceptance ledger → Catalyst canonical → existing constraints.

---

## OBJECTIVE

Rebuild Test Hub into an enterprise, sprint-and-release-integrated, AI-assisted QA/UAT module. Done = every V2 acceptance criterion mapped with evidence; full-page surfaces for case/plan/execution/run/traceability/reports; zero side drawers; draft never executable; executions snapshot immutable versions with variance + explicit pull-latest; sprint and release detail carry test-health/readiness sections with pass/warn/block signoff gates consuming real test data; 10 AI edge functions producing drafts only; 13-column repository table; RTL proven; screenshot evidence for every surface.

## NON-SCOPE

- Prod (lmqw) writes — staging cyij only until explicit instruction
- Dropping/altering live legacy tables (test_data_rows, test_cycle_executions, step_result_attachments) — deprecation is separate work
- New product direction beyond V2 package; no external-UI copying
- Dark-mode net-new work beyond token compliance (module is token-clean; reload-into-dark check per UI slice)
- Rewrites of KEEP surfaces (Dashboard/MyWork/Board/Defects/DefectDetail/Timeline/Filters/CycleRunDetail) beyond sliced retrofits

## OPEN DECISIONS (block marked slices; full text in 09_DECISIONS.md)

| ID | Decision | Recommendation | Blocks |
|---|---|---|---|
| D-001 | Release plane: keep tm FKs on `releases` + bridge to `rh_releases` via rh_release_test_cycle_links + rh_readiness_checks vs re-point FKs | Bridge (zero FK churn, Release Ops honored) | B8, E3, G3, G4, I2 |
| D-002 | Execution vs Cycle split | New parent `tm_test_executions`; cycles gain nullable execution_id | B4, E3–E5, F1 |
| D-003 | `hold` step verdict | `ALTER TYPE tm_execution_status ADD VALUE 'hold'` | B6, F2 |
| D-004 | TestSets fate (V2 has no Sets concept) | Redirect stubs → Plans; fold AddToCycleSet logic into execution scope builder | E7 |

## CANONICAL COMPONENTS SELECTED (evidence: 02_CANONICAL_DISCOVERY.md + 12_AGENT_OUTPUTS.md Agent 1)

JiraTable v1.4 (`@/components/shared/JiraTable`) — all list surfaces, MANDATORY · Breadcrumbs/PageHeader/ProjectPageHeader · Lozenge/StatusLozenge/HealthBadge/CatalystStatusPill · CatalystAvatar/UserAvatar · ActivityPanel + TmActivitySection/TmCommentsSection · AttachmentsSection → tm_attachments + bucket testhub-attachments · LinkedWorkItems + tm_requirement_links · @atlaskit/pragmatic-drag-and-drop (folder moves; no tree lib — parent_id + chevrons) · RightDetailsPanel (right rail, NOT drawer) · ads Modal (compact actions only; replace module shadcn Dialogs) · EmptyState/SectionMessage(+Retry) · JiraIssueTypeIcon/ProjectIcon · CatyIconCTA (only AI rainbow; no inline AI buttons on detail views) · AdfDescriptionField · react-intl-next.

## CANONICAL SCREENS SELECTED

| Screen | Reuse |
|---|---|
| CatalystDetailRouter fullPageMode | Test Case/Defect full pages (DefectDetailPage proves pattern) |
| SprintDetailPage = ReleaseDetailPage + SPRINT_CONFIG | SprintTestHealthSection mounts via additive config key |
| ReleaseDetailPage/ChangeDetailPage tabs + ChangeCockpitSections | ReleaseTestReadinessSection model |
| BacklogPage.atlaskit.tsx | repository table density bar |
| ReportsHubPage + REPORT_REGISTRY | all 9 new reports = registry entries |
| CatalystViewStory leftContent + TestCasesSection + TestCoveragePanel | work-item Tests section, generalized to Feature/Epic/BR/Defect/Incident |

## BINDING INTEGRATION CONTRACTS (12_AGENT_OUTPUTS.md Agent 4 — full list)

1. `useTestHubProject()` only project resolver; keep `['tm-*', projectId, …]` keys + invalidation fan-outs.
2. `tm_cycle_scope.current_status` = execution truth; extend `useCycleExecutionItems`, never fork.
3. `tm_requirement_links` = only work-item↔test link model (linked_story_key dead).
4. Defect creation via CreateStoryModal isDefect branch; populate existing lineage cols (sprint_id, source_change_id, source_sop_step_id).
5. Sprint plane: ph_issues.sprint_id → ph_jira_sprints (filter deleted_at); signoff via ph_sprint_approvers + ph_sprint_dod.
6. Release gates plug into rh_readiness_checks + tm_release_quality_gates/useEvaluateQualityGates (per D-001).
7. Every new create surface → scripts/cre-chokepoint-gate.cjs CHECKS + filterCreatableTypes; cross-module rights only via EXTRA_CREATE_RIGHTS.
8. Activity: extend tm_activity_log entity_types + SECURITY DEFINER triggers; render via TmActivitySection.
9. AI fns copy `supabase/functions/ai-generate-test-artefacts` skeleton (quota tm_ai_usage_log, ANTHROPIC_API_KEY, audit-never-blocks); drafts only.
10. Routes: slug/key-only builders in src/lib/routes.ts; no :id/:uuid.
11. Extend lint:colors:testhub path list for every new directory (zero-baseline stays zero).

## PHASED SLICE PLAN (55 slices — full detail from Implementation Planner)

### Phase B — Data foundation (9 slices, migrations > 20260706130000, staging cyij only)
- **B1** Regen stale types.ts (MCP) + compile repair. `npx tsc -p tsconfig.app.json --noEmit`
- **B2** `20260706140000_tm_folder_system.sql`: folder_type/is_system, depth ≤7 CHECK, idempotent `tm_provision_system_folders(project_id)` RPC + tm_projects insert trigger (Project/Product roots + Functional/UAT/Regression/Incident/Defect)
- **B3** `20260706141000_tm_case_origin_enforcement.sql`: origin (manual|ai|hybrid), version-row immutability trigger, draft-not-executable BEFORE INSERT on tm_cycle_scope (check useAutoVersioning/useTestCaseVersions write paths first)
- **B4 [D-002]** `20260706142000_tm_execution_cycle_split.sql`: tm_test_executions parent (lab_scope_type sprint|release|project|product|business_request|custom + FKs), cycles.execution_id backfill, closed-cycle immutability trigger cascade (scope/runs/step_results). Reversible; backfill in txn
- **B5** `20260706143000_tm_variance_health_snapshot.sql`: tm_case_variance, tm_sprint_test_health, tm_cycle_scope.locked_snapshot JSONB (extend lock trigger)
- **B6 [D-003]** `20260706144000_tm_hold_defect_links.sql`: hold enum value (isolated statement), tm_defect_links.cycle_scope_id repair + backfill, non_test_origin flag
- **B7** `20260706145000_tm_attachments_consolidation.sql`: polymorphic entity_type CHECK extension, storage RLS testhub-attachments, read-through compat views, tm_activity_log entity_type extension
- **B8 [D-001]** `20260706150000_tm_release_gate_bridge.sql`: tm_release_readiness_v2 view, tm check_keys seeded into rh_readiness_checks, `tm_compute_release_gate(release_id)` RPC
- **B9** Types regen #2 + hooks: useFolders/useTestCases uplift (+ `20260706151000_tm_case_table_view.sql` view for 13-col incl. latest-run/open-defects — no N+1), new useTestExecutions/useCaseVariance/useSprintTestHealth

### Phase C — Repository (6)
- **C1** routes.ts builders (repositoryCase/plans/plan/executions/execution/run) + FullAppRoutes + `?case=` redirect
- **C2** 13-col JiraTable: extract RepositoryTable.tsx + repositoryColumns.tsx from 51.5K RepositoryPage; data from tm_case_table_v2
- **C3** FolderTree.tsx: pragmatic-dnd moves via `tm_move_folder` RPC (`20260706152000`), system folders locked, depth-7 create
- **C4** PageHeader + canonical search/CTAs; CRE registration
- **C5** Clone/merge/convert/bulk (ads Modal confirms)
- **C6** Inline expand (read-only summary) vs full-page open; delete panel-mode authoring

### Phase D — Full-page authoring (7)
- **D1** TestCaseDetailPage scaffold (fullPageMode, breadcrumbs project›folder›key, RightDetailsPanel rail)
- **D2** Steps editor uplift (large AdfDescriptionField rows, dnd reorder, keyboard add, shared steps) — design-critique before close
- **D3** Versions + publish/draft (snapshot on publish, history modal, tm_case_status_config transitions)
- **D4** Activity/attachments/comments (useTmAttachments adapter → tm_attachments)
- **D5** Traceability section (LinkedWorkItems ↔ tm_requirement_links, all 7 types)
- **D6** AI assists (CatyIconCTA cluster: Complete/Improve/Coverage; draft-edits with accept/reject; origin→hybrid on accept; stub until H1)
- **D7** Authoring RTL + i18n (react-intl-next, logical CSS)

### Phase E — Plans/Executions/Cycles (7)
- **E1** TestPlansPage rebuild (JiraTable + create modal + CRE)
- **E2** TestPlanDetailPage NEW (curated refs, live vs locked banner via tm_plan_versions)
- **E3 [D-001][D-002]** ExecutionsPage + useTestExecutions (lab scope picker)
- **E4** ExecutionDetailPage + scope builder (plan pull respects lock; snapshot on add; draft rejection surfaced via SectionMessage)
- **E5** Cycles as dated attempts (remove maxWidth, delete-confirm modal, group by execution, close → immutable)
- **E6** CycleDetailPage drawer excision (delete 480px RightPanel ×3; flows link to run surface; extract sections while cutting)
- **E7 [D-004]** TestSets redirect stubs → Plans

### Phase F — Run player + variance (6)
- **F1 [D-002]** RunPlayerPage scaffold (snapshot render, steps left / active center / rail right)
- **F2 [D-003]** Verdicts pass/fail/blocked/hold/skipped + timer + force-pass with reason (activity-logged)
- **F3** Per-step evidence (tm_attachments entity_type step_result, paste-to-attach)
- **F4** Defect raise pre-linked (CreateStoryModal prefill; tm_defect_links.cycle_scope_id + non_test_origin=false; CRE)
- **F5** Variance banner + explicit pull-latest (open cycles only; resolution recorded)
- **F6** Run summary + CycleRunDetail retrofit (closed run read-only)

### Phase G — Sprint/Release planes + insertion points (6)
- **G1** SprintTestHealthSection (sibling of QualityGatesSection; additive SPRINT_CONFIG key; no-op safe outside sprint config)
- **G2** Sprint signoff gate pass/warn/block (thresholds: blocker defects, unexecuted %, failed regression, evidence, drafts, variance) + tm_sprint_test_health snapshot; wired to ph_sprint_approvers/ph_sprint_dod
- **G3 [D-001]** ReleaseTestReadinessSection (tabs pattern; tm_compute_release_gate + rh_readiness_checks)
- **G4** Release signoff gate → tm_release_signoffs + gate_results (block cannot silently pass; waiver recorded)
- **G5** Work-item insertion points: TestCasesSection + TestCoveragePanel generalized to Feature/Epic/BR/Defect/Incident (per-entity flags, one screenshot each; CRE per surface)
- **G6** Generate CTAs on Sprint/Release/Repo-folder → AIGenerateTestCasesDialog scope-prefilled

### Phase H — AI edge functions + traceability (7)
- **H1** ai-tm-generate / ai-tm-complete / ai-tm-improve (deploy staging + curl smoke + tm_ai_usage_log row)
- **H2** ai-tm-correct / ai-tm-convert-uat / ai-tm-coverage
- **H3** ai-tm-gaps / ai-tm-link-suggest / ai-tm-sprint-risk / ai-tm-release-risk
- **H4** Client AI layer (useAIGeneration wrappers, quota → SectionMessage, drafts-only enforcement, de-stub D6/G6)
- **H5** Traceability grid → JiraTable + hierarchy view
- **H6** Traceability canvas (SVG, click navigates — no drawer) + coverage matrix; timeboxed, EmptyState fallback acceptable
- **H7** Link-suggest surfacing (accept/dismiss chips → flagged tm_requirement_links)

### Phase I — Reports, RTL, hardening (7)
- **I1** Daily QA + Sprint Health reports (registry entries)
- **I2 [D-001]** Release Readiness + UAT Signoff reports
- **I3** Regression + Defect leakage/retest reports
- **I4** Variance + Evidence completeness reports
- **I5** AI audit report (tm_ai_usage_log)
- **I6** RTL + lint sweep (extend lint:colors:testhub paths to executions/**, runs/**, new dirs; logical properties; 3 RTL screenshots)
- **I7** Full gate pass + evidence pack (all commands + advisors + screenshot sweep + design-critique on repository/case/run player)

**Critical path:** B1→B4→B5→E3→E4→E5→F1→F2→F5. **Parallel lanes:** C+D need only B1–B3/B9; H1–H3 alongside E/F; G1–G2 need only B5/B9.

## FILES TO MODIFY (primary; per-slice list above)

Key surgery: src/pages/testhub/repository/RepositoryPage.tsx (51.5K extract), src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx + TestCaseStepsEditor.tsx, src/pages/testhub/cycles/CycleDetailPage.tsx (46.5K drawer excision), src/pages/testhub/plans/TestPlansPage.tsx, src/lib/routes.ts, src/lib/entity-hub/config.ts (additive keys), src/hooks/test-management/* (+3 new hooks), scripts/cre-chokepoint-gate.cjs (+CHECKS), scripts/lint-colors-testhub.cjs (path list only), supabase/migrations/2026070614xxxx–15xxxx (8 new), supabase/functions/ai-tm-* (10 new).

## FILES FORBIDDEN

- Applied migrations ≤ 20260706130000 (new versions only)
- test_data_rows / test_cycle_executions / step_result_attachments (no DROP/column removal; compat views only)
- src/integrations/supabase/types.ts by hand (MCP regen only)
- src/components/shared/JiraTable/** (consume, never fork)
- ReleaseDetailPage engine internals + entity-hub config non-additive edits
- rh_* schemas (read + FK; only agreed B8 bridge)
- CreateStoryModal core (extend via props only)
- lint-colors-testhub baseline logic (paths extend-only, threshold zero); cre-chokepoint-gate existing CHECKS
- KEEP pages beyond sliced retrofits

## UI/UX RULES

ADS tokens only (var(--ds-*), no hex fallbacks); no hand-rolled tables/tabs/toggles/dropdowns/drawers; **no side drawers anywhere — new file recreating fixed right-panel pattern fails review**; full-width tables (no maxWidth clamps); modals only for compact actions; ADS spacing 4/8/16/24/32; sentence case; JiraIssueTypeIcon contract; CatyIconCTA only AI rainbow; zero-assumption rendering (unknown → dash/nothing); empty/loading/error (SectionMessage+Retry) on every surface; RTL logical properties on all new code; fix RepositoryPage:859 raw DB color pipe; reload-into-dark check per UI slice.

## DATA/BACKEND RULES

Staging cyij only (`cat supabase/.temp/project-ref` = cyijbdeuehohvhnsywig before every batch); migrations unique versions > 20260706130000, 1:1 with ledger; DDL via Management API pattern; new tables text+CHECK (no new enums), slug/key + catalyst_slugify trigger where URL-navigated; RLS copies tm_user_has_access per-op pattern; snake_case raw rows; no assumption defaults; immutability enforced in DB (triggers), not just UI; types regen at lane boundaries only (B1, B9).

## PARALLEL EXECUTION PLAN

Discovery (done 2026-07-06): 6 agents + planner — outputs in 12_AGENT_OUTPUTS.md. Execution: per-phase slices with parallel lanes (C+D lane, E+F lane, H fn lane); QA/Screenshot Validator gate at each phase end; CHATGPT_REVIEW_PACKET after each phase per V2 package operating loop.

## SCREENSHOT CHECKLIST

Master checklist in 10_SCREENSHOT_CHECKLIST.md (11 surfaces; LTR+RTL; empty/loading/error; gate states pass/warn/block ×2; variance banner both states). Per-slice targets named in slice plan. Screenshots prove UI; functional proof matrix F1–F9 in 06_VALIDATION_EVIDENCE.md proves behavior (draft-not-executable, publish→version, snapshot, closed-cycle immutability, variance, defect lineage, gates, audit, AI-drafts-only).

## VALIDATION COMMANDS

```bash
npx tsc -p tsconfig.app.json --noEmit
npx vitest run --passWithNoTests
npm run lint:colors:testhub          # zero-baseline, extend paths for new dirs
npm run lint:colors:gate && npm run lint:fallback-hex:gate && npm run audit:ads:gate
node scripts/cre-chokepoint-gate.cjs
npm run build
# E2E when touched:
PLAYWRIGHT_TEST_BASE_URL=http://localhost:8080 npx playwright test --project=test-management-smoke
```

## STOP CONDITIONS

RED FLAG + stop if: file outside slice list needs changes; DB column assumption fails; canonical component unfit (needs unsuitability proof); regression in adjacent UI (Story/Sprint/Release/Change detail = highest radius — G1/G3/G5 land behind flags); slice > 2h; migration ledger anomaly; project-ref ≠ cyij; types regen ripples beyond timebox (log + assert, don't chase).

## DRIFT/REBASELINE RULES

Superseded mid-slice → stop, log 08_DRIFT_LOG.md, rebaseline approval, mark SUPERSEDED, new Plan Lock. One correction loop per slice then accept/split/rebuild/stop-revert.
