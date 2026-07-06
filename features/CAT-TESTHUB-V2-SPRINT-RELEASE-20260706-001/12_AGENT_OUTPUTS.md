# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Agent Outputs

> Raw outputs from all parallel agents.
> One section per agent. Append — never delete.

---

## Agent 1 — Canonical Component Discovery

**Status: COMPLETE (2026-07-06). Canonical palette for V2 (import paths verified):**

| Need | Canonical | Path |
|---|---|---|
| Dynamic table | JiraTable v1.4 (plain `<table>`, sort/group/bulk/inline-edit/col-reorder/sticky footer, density modes) | `@/components/shared/JiraTable` |
| Breadcrumbs | data-driven `Breadcrumbs` (items[], maxItems=4) | `@/components/ads` |
| Status pills | `Lozenge` / `StatusLozenge` (3-colour guard) / `CatalystStatusPill` / `HealthBadge` | `@/components/ads`, catalyst-detail-views/shared |
| Avatars | `CatalystAvatar` / `UserAvatar` (CDN-banned) | `@/components/shared/UserAvatar` |
| Activity | `ActivityPanel` (All/Comments/History/Worklog, hiddenTabs) + TestHub wrappers `TmActivitySection`/`TmCommentsSection` → tm_comments + tm_activity_log (already wired in CatalystViewTestCase) | `@/components/catalyst-ds` |
| Attachments | `AttachmentsSection` (+ TestCaseAttachments) → Supabase storage `attachments` bucket + attachments table | `@/components/shared/AttachmentsSection` |
| Linked items | `LinkedWorkItems` + normalizeLinkedWork + LinkToolbar | project-work-hub/components/linked-work-items |
| Tree/DnD | **No @atlaskit/tree in repo** — hierarchy = parent_id + chevron expand; DnD = @atlaskit/pragmatic-drag-and-drop (draggable/dropTarget/monitor/closest-edge/DropIndicator) |
| Full-page shell | `PageHeader` (52px) + AtlaskitPageShell + RightDetailsPanel (collapsible right rail, NOT drawer) | `@/components/ads` |
| Modals | `Modal`/ModalHeader/Body/Footer (@atlaskit/modal-dialog wrap) | `@/components/ads` |
| Empty/error | `EmptyState` (default/compact) + `SectionMessage` (+Retry pattern) | `@/components/ads` |
| Icons | `JiraIssueTypeIcon` (type→SVG contract), `ProjectIcon` | `@/lib/jira-issue-type-icons` |
| AI CTA | **`CatyIconCTA` — the ONLY allowed rainbow control** (AIIntelligenceButton + CatyRainbowCTA deprecated); inline AI buttons on detail views banned — AI entry via ImproveIssueDropdown in right rail | `@/components/ui/CatyIconCTA` |
| RTL/i18n | react-intl-next IntlProvider (App.tsx); Arabic detect `/[؀-ۿ]/`; `dir="auto"` pattern; no own IntlProvider around AdfDescriptionField |
| Rich text | AdfDescriptionField (@atlaskit/editor-core; TipTap banned; media → Supabase) |

**TestHub hand-rolled debt found:** shadcn Dialog/Button/Textarea in module (should be ads Modal), custom ReportChart, VersionDiffView custom layout, AIGenerateTestCasesDialog on shadcn Dialog.

---

## Agent 2 — Canonical Screen Discovery

**Status: COMPLETE (2026-07-06). Key findings:**

- **TestHub today has 20+ routes** under `/testhub/*`: dashboard (11-widget grid), my-work, board, repository (folder tree + JiraTable + CatalystDetailRouter), cycles (+ `:projectKey/cycles/:cycleKey` detail/execute/runs), sets, plans (TBD tm_test_plans), traceability (matrix over tm_requirement_links + v_tm_requirement_coverage), defects (+ defect detail via CatalystDetailRouter entityKind='tm_defect'), reports (registry-driven ReportsHubPage + REPORT_REGISTRY + saved views tm_saved_report_views), filters, timeline, dependencies. All gated by ModuleGate k="testhub".
- **SprintDetailPage** (`/project-hub/:key/sprints/:sprintSlug`) mounts canonical **ReleaseDetailPage with SPRINT_CONFIG** — entity-hub config-driven pattern. Sections: Breadcrumb, title, description, WorkItemsSection, QualityGatesSection, ReleaseSidePanel, HealthPanel. Sprint Test Health mounts as a new section parallel to QualityGatesSection.
- **ReleaseDetailPage** (`/release-hub/releases-management/:releaseSlug`) same shell + Work Navigator route. **ChangeDetailPage** (`/release-hub/changes/:changeId`, Release Ops P3) has 9-stage tracker + tabs (Overview/SOP/Work Items/Sign-offs/Activity) + ChangeCockpitSections — structural model for Release Test Readiness.
- **Work item detail**: everything goes through **CatalystDetailRouter** (fullPageMode) — Story (`/project-hub/:key/backlog/:issueKey`, `/browse/:issueKey`), Epic/Feature/BR (allwork route), Incident (`/incident-hub/view/:incidentKey`). "Add/Generate Test Case" mounts in CatalystViewStory/Epic via CreateStoryModal (defaultWorkType branch).
- **Gold standard density**: BacklogPage.atlaskit.tsx (JiraTable + inline editors + detail panel + create row + bulk toolbar), ProjectDashboardPage (DashboardWidgetGrid mode-filtered WIDGET_REGISTRY; TestCasesOverviewWidget/TestCyclesProgressWidget exist).
- **Slug contract**: testHubRoutes/projectHubRoutes/releaseHubRoutes builders in src/lib/routes.ts; UuidToSlugRedirect outside shell; dual-mode useXBySlug hooks.
- **Reuse hierarchy for V2**: 1) CatalystDetailRouter 2) JiraTable/BacklogTable 3) DashboardWidgetGrid 4) ProjectPageHeader 5) entity-hub config pattern (RELEASE_CONFIG/SPRINT_CONFIG).
- ⚠️ Note: BacklogPage uses CatalystSideDrawer for detail — V2 scope bans side drawers in Test Module; use full-page CatalystDetailRouter instead.

(Full raw output retained in session transcript.)

---

## Agent 3 — UI/UX Critic

**Status: COMPLETE (2026-07-06). Module score vs V2 bar: ~55/100.** ADS color grep over module: ZERO matches (token-clean). Canonical spine strong (JiraTable everywhere except one page).

**Surface verdicts:**
- KEEP: Dashboard (ProjectDashboardPage mode="test"), MyWork + Board (canonical wrappers; dead `?case=` deep-links), Defects list, Defect detail (CatalystDetailRouter fullPageMode — the V2 pattern proven), Timeline, CycleRunDetail, Traceability (minor), Filters
- UPLIFT: Repository (right bones; 7/13 columns; hand-rolled CTAs/search; panel-mode authoring; no ?case= handling), Test Case authoring (canonical shell, wrong mode — panel not full page; cramped 56px textareas step editor), Cycles list (maxWidth 1200; delete w/o confirm), CycleDetail (good header/tabs/table; **hand-rolled 480px fixed drawer ×3 = hard violation** hosting defect create/comments/evidence), ExecutionPage (full-page master-detail, has real error state), SetDetail (hand-rolled tabs + dropdown), Reports (drawer misnomer = popover, fine)
- REBUILD: TestSetsPage (fully hand-rolled CSS-grid table + custom toggle; fontWeight:653 typo), TestPlansPage (bare list, rows not clickable, **no plan detail surface at all — 0% delivered**)

**Top-10 defects:** 1) CycleDetail RightPanel fixed drawer (616-654,731,888,951); 2) repo 7/13 columns (4 free adds: origin/sprint/designer/updated; 4 need joins: health/parent/release/open defects); 3) Test Plans no surface; 4) TestSets hand-rolled table; 5) dead ?case= deep-links (KanbanPage:451, testCasesDataSource:161 + window.location.assign full reload); 6) authoring panelMode not fullPageMode (route+mode switch, DefectDetailPage proves it); 7) native <button>/naked <input> sprawl; 8) SetDetail hand-rolled tabs/menu; 9) silent error swallowing (error→[] fake-empty in TestPlansPage:67, AddToCycleSetSheet:49) + no delete confirm + unquoted CSV join; 10) maxWidth 1100-1200 clamps + **RTL zero-readiness** (no dir=, physical CSS pervasive: right:0, borderRight, marginLeft:auto, left-anim toggle, directional icons).

**Bare-color blind spot:** RepositoryPage:859 pipes raw DB color string (priority_ref.color) into inline background.

**Cheapest big wins:** drawer→run-page sections; +4 free repo columns + column picker; fullPageMode route for case; TestSets on JiraTable; wire ?case=.

---

## Agent 4 — Integration Architect

**Status: COMPLETE (2026-07-06). 11 binding contracts for V2:**

1. **`useTestHubProject()` = only project resolver** (localStorage → most-cases → first active; Phase C root fix). Keep `['tm-*', projectId, …]` query keys + invalidation fan-outs (tm-cases/tm-folders-with-counts/repository-tree/tm-case-versions…).
2. **`tm_cycle_scope.current_status` = execution truth**; ALL execution views via `useCycleExecutionItems` (rule stated in-file; realtime channels cycle-scope-${id}/cycle-runs-${id}). Extend, don't fork.
3. **`tm_requirement_links` (external_key + requirement_type CHECK story|epic|feature|business_request|task|defect|incident|external) = only work-item↔test link model**; linked_story_key dead (D-009). TestCasesSection + TestCoveragePanel (story detail) are the precedent for pushing latest-run status to work items — extend to Feature/Epic/BR.
4. **Defect creation stays in CreateStoryModal isDefect branch** (QA Bug → tm_defects, resolveTmProjectId bridge). Lineage cols on tm_defects already exist: sprint_id, source_change_id → rh_changes, source_sop_step_id → rh_sop_steps. Populate, don't duplicate.
5. **Sprint plane**: membership = ph_issues.sprint_id → ph_jira_sprints (D-002); tm_test_cycles/plans/cases/defects already carry sprint_id (20260627192541); sprint signoff = ph_sprint_approvers + ph_sprint_dod evaluation + ph_sprint_status_transitions audit. useSprintBySlug dual-mode.
6. **Release plane**: build on rh_releases / rh_release_work_items (work_item_key + inclusion_source) / **rh_readiness_checks (release_id+check_key, pending|pass|fail|na — natural V2 gate plug-in)** / rh_release_signoffs. Gate math EXISTS: tm_release_quality_gates + useReleaseQualityGates + useEvaluateQualityGates (already invalidates ['release-readiness']). rh_releases has readiness_pct/qa_lead_id/uat_lead_id. ⚠ 3 release models (releases legacy / rh_releases forward / ph_releases sprint-link); ⚠ dead fetch('/api/...') hooks in src/hooks/releases — do not copy.
7. **New create surfaces register in scripts/cre-chokepoint-gate.cjs CHECKS** + filterCreatableTypes; cross-module rights only via EXTRA_CREATE_RIGHTS (currently {TEAM:['Epic']}). CRE governs Test Case/Test Cycle types.
8. **Activity**: extend tm_activity_log entity_types (currently test_case|test_step; steps log under parent case id) + SECURITY DEFINER triggers; render via TmActivitySection → catalyst-ds ActivityPanel.
9. **AI**: copy `supabase/functions/ai-generate-test-artefacts/index.ts` skeleton (claude-opus-4-8, JWT gate + daily quota + cooldown via tm_ai_usage_log, ANTHROPIC_API_KEY env + 500 config_error, audit-never-blocks). Governance rows → ai_usage_log for non-quota actions (ai-improve-story:204 pattern; 13 fns share). Related fns: ai-generate-story-test-cases, summarize-release, release-notes-generate, release-sprint-predictor.
10. **Routes**: slug/key-only params in src/lib/routes.ts (testHubRoutes :114-138); tm_test_plans currently `as any` (not in types) + zero UI — needs types regen + plan_key route before plan UI.
11. **Detail-view Tests section**: clone CatalystViewStory leftContent pattern (AttachmentsSection → LinkedWorkItemsSection → DependenciesSection → TestCasesSection → CatalystActivitySection); reuse TestCoveragePanel rollup (tm_requirement_links → tm_test_cases → tm_cycle_scope → tm_defects).

**Evidence buckets:** testhub-attachments (canonical) vs defect-attachments (useEntityAttachments drift) — standardize on testhub-attachments. Update path in useTestCases deletes+reinserts steps wholesale (V2 must respect or replace carefully).

---

## Agent 5 — Data/Safety Guard

**Status: COMPLETE (2026-07-06). Verdict: ~70% of V2 object model already exists in tm_* (56 tables). Key findings:**

⚠ **types.ts STALE** — missing tm_activity_log, tm_case_status_config, tm_defect_status_history, tm_coverage_history, tm_shared_steps, all rh_* Phase 2. Regenerate before coding.
⚠ **docs/testhub-enterprise-rebuild/ does NOT exist on main** (memory pointer stale) — only docs/test-hub/reports/.

**Gap matrix (V2 object → verdict):**
- Repository → tm_projects partial (no product root; tm_projects vs projects split-brain, useTestHubProject bridges)
- Folder → tm_folders REUSE+EXTEND (ltree path + depth, no max-depth CHECK; missing folder_type/is_system + auto root/system-folder provisioning)
- Test Case → tm_test_cases REUSE+EXTEND (46 cols; status enum draft|ready|approved|deprecated + separate archived bool — reconcile; type via tm_case_types lookup rows; origin: is_ai_generated bool, no hybrid → add origin text CHECK; **draft-not-executable NOT DB-enforced**)
- Case Version → tm_test_case_versions FITS (snapshot+steps JSONB, tm_create_version_snapshot/tm_restore_version RPCs) — **immutability needs BEFORE UPDATE/DELETE deny trigger**
- Steps → tm_test_steps FITS (soft delete, shared steps)
- Plan → tm_test_plans + tm_plan_versions FITS (create_plan_version trigger auto-snapshots; live vs locked mechanism present)
- Plan Case Ref → tm_test_plan_cases EXACT FIT
- Execution (lab) → tm_test_cycles PARTIAL — **today one table = execution+cycle**; missing product_id/BR/custom scope_type. Decision: extend cycles with scope_type (lower risk) vs new tm_test_executions parent
- Execution Snapshot → tm_cycle_scope.locked_version (fn_lock_scope_version BEFORE INSERT) + tm_step_results.action/expected_snapshot PARTIAL — locks version number + step text, no full case snapshot row
- Cycle closed-immutable → validate_cycle_status_transition guards status only; children mutability NOT blocked
- Run → tm_test_runs (via cycle_scope_id) PARTIAL — no post-completion write block; 3 generations of data-row cols
- Step Result → tm_step_results enum not_run|in_progress|passed|failed|blocked|skipped — **no `hold`** (ADD VALUE additive-safe, irreversible, can't be in same txn as usage)
- Evidence → FRAGMENTED: tm_attachments (polymorphic, bucket 'tm-attachments') + tm_test_attachments (bucket 'testhub-attachments') + step_result_attachments (rich OCR/AI; FK'd by tm_defect_links.attachment_id). Consolidate on polymorphic tm_attachments
- Defect Link → tm_defect_links mostly fits; no non-test-origin flag; ⚠ **tm_defect_links.test_run_id actually FKs tm_cycle_scope (misnamed)**
- Variance Record → **MISSING (new table)**
- Sprint Test Health → **MISSING (new snapshot table)**
- Release Test Health → tm_release_readiness + tm_release_quality_gates/gate_results/signoffs + gate_evaluation_history PARTIAL/FITS; releases.test_cases_* counters trigger-synced
- AI Audit → tm_ai_usage_log FITS (+ global ai_usage_log for edge fns)

**Sprint/release linkage:** canonical sprint = **ph_jira_sprints** (uuid, slug, deleted_at — filter!); all 4 tm FKs point there. THREE sprint tables exist (ph_jira_sprints, sprints, anchor_sprints). TWO release models: `releases` (tm_* FKs, QA counters) vs `rh_releases` (Release Ops cockpit; **rh_release_sprints → anchor_sprints, inconsistent**). Bridges exist: rh_release_test_cycle_links → tm_test_cycles; rh_sop_steps.defect_id → tm_defects. **V2 must pick ONE release FK target — decision for Vikram.**

**test_* family NOT fully dead:** test_data_rows/test_data_parameters (FK from tm_test_runs + 3 live hooks), test_cycle_executions (useTestCases.ts:140,224), step_result_attachments. No drops without deprecation slice.

**Migration conventions:** next version > 20260706130000, unique; staging cyij only (assert project-ref); Management API for DDL; RLS = tm_user_has_access(auth.uid(), project_id) per-op (permissive fallback documented); new tables text+CHECK not enums; slug contract via catalyst_slugify() trigger copy from rh_changes_generate_slug (20260706124500); extend tm_activity_log entity_types + trigger fns (don't add 4th audit structure); key-based routes (case_key/cycle_key) already contract-compliant.

---

## Agent 6 — Implementation Planner

**Status: COMPLETE (2026-07-06).** 55 slices across phases B–I (B:9 data foundation, C:6 repository, D:7 full-page authoring, E:7 plans/executions/cycles, F:6 run player + variance, G:6 sprint/release planes + insertion points, H:7 AI fns + traceability, I:7 reports/RTL/hardening). ~110 engineer-hours nominal. Full slice-by-slice plan (files, migrations 20260706140000+, validation per slice, screenshots, deps, risks) transcribed into 03_PLAN_LOCK.md. Critical path: B1→B4→B5→E3→E4→E5→F1→F2→F5. Top risks: B4 execution/cycle split migration, E6 CycleDetailPage drawer excision (46.5K file), G5 five host surfaces, types.ts regen ripple.

---

## Agent 7 — QA/Screenshot Validator

**Status: COMPLETE (2026-07-06). Key findings:**

- **Validation commands (exact):** `npx tsc -p tsconfig.app.json --noEmit` (no npm typecheck script; CI warn-only, ~157 baseline errors), `npx vitest run --passWithNoTests` (no npm test script; CI blocking), `npm run lint:colors:gate`, `lint:fallback-hex:gate`, `audit:ads:gate`, `lint:cre` (all ratchet, pre-commit+CI blocking), **`npm run lint:colors:testhub` = STRICT zero-baseline gate scoped to `src/pages/testhub/**` + `src/components/testhub/**`** (any bare color fails; also asserts tombstone paths stay deleted).
- ⚠️ **Gate coverage gap:** strict testhub gate is path-scoped — new dirs (e.g. src/modules/testhub/) silently uncovered unless path list extended. Must extend in V2.
- **Zero unit tests on all 35 tm_ hooks.** Playwright E2E exists (tests/test-management/smoke + golden-path) but baseURL stale (`:5173` vs vite `8080 strictPort`) — needs `PLAYWRIGHT_TEST_BASE_URL=http://localhost:8080`; selectors predate Phase-C.
- **Dev server: port 8080 strictPort, DB cyij confirmed.**
- **Existing tm_ tables confirmed in generated types:** tm_test_cases, tm_test_case_versions, tm_test_steps, tm_test_plans, tm_plan_versions, tm_test_cycles, tm_cycle_scope, tm_test_runs, tm_step_results, tm_defects, tm_defect_links, tm_release_quality_gates, tm_release_readiness, tm_release_signoffs, tm_gate_evaluation_history, tm_cycle_execution_audit, tm_attachments/tm_test_attachments, tm_audit_log(s), tm_ai_usage_log.
- **Full screenshot checklist (11 surfaces × LTR/RTL/empty/loading/error) delivered → written to 10_SCREENSHOT_CHECKLIST.md.**
- **Functional proof matrix F1–F9 (draft-not-executable, publish→version, snapshot, closed-cycle immutability, variance, defect lineage, gate pass/warn/block, audit immutability, AI-draft-only) with concrete SQL/DOM probes → written to 06_VALIDATION_EVIDENCE.md.**
