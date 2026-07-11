# Catalyst TestHub — Enterprise Rebuild: Discovery, Fitment & Blueprint

**Feature Work ID**: CAT-TESTHUB-REBUILD-20260704-001
**Phase**: A complete (discovery/fitment) + B blueprint proposal. **No implementation performed.**
**Date**: 2026-07-04/05 · Evidence: 8 independent probes (repo, DB, live UI, Project Hub canon, incident linkage, reports, packages, benchmarks), full outputs in `features/CAT-TESTHUB-REBUILD-20260704-001/evidence/`
**DB probed**: staging `cyijbdeuehohvhnsywig` (the dev app's backend). Prod untouched.

---

## 1. Executive Verdict

The "TestHub is failed" framing is **half right, and the half matters**.

**What is genuinely strong (evidence-verified, keep):**
- **Schema is enterprise-consensus shape already**: 55 `tm_*` tables, 87 RPCs, 9 views, 34 triggers — plans, cycles, scope, runs, immutable step snapshots, version pinning at scope-add, auto-defect trigger on run failure, release quality gates/signoffs/readiness. Benchmark probe conclusion: this is Zephyr Scale's architecture with hooks for Xray's coverage engine. No competitor-grade schema gap blocks the rebuild.
- **Execution runner is genuinely good** (live-probed): case rail, timer, keyboard shortcuts, honest no-steps fallback, evidence dropzone, disabled-until-verdict save.
- **Reports engine is real**: 26 reports, zero fake, registry+renderer+boundary pattern, token-pure charts, honest caveat banners.
- **Canonical wiring exists**: CatalystDetailRouter already routes `test_case`/`test_cycle`/`tm_defect`; TestCoveragePanel already mounts on story/defect/incident views; defect creation already goes through CreateStoryModal.
- Code hygiene: 0 TS errors, 0 color-law violations in TestHub dirs, 0 `th_*` references.

**What is genuinely failed (evidence-verified, rebuild):**
1. **Project context is fake.** Every repository/dashboard query uses hardcoded `project_id=00000000-0000-0000-0000-000000000001`. This single defect cascades into: dashboard FK crash on every load, board wrong-empty, My Work showing everyone's cases, widgets that can never persist layout. TestHub is a single-tenant demo wearing multi-project clothes.
2. **Core CRUD broken**: "+ Create case" button is dead (no dialog, no error — verified via mouse and programmatic click).
3. **The mental model is absent.** `tm_test_plans` (39 cols, gates, signoffs, readiness RPCs) has **no UI surface at all**. Sets vs folders vs cycles is unexplained. No scenario concept. No coverage-scope concept. A tester cannot answer "what am I testing, for which release, and are we ready?" anywhere.
4. **Hand-rolled surfaces violating canon**: folder tree (recursive, non-virtualized, DOM-prop leaks), custom 0-radius status pills instead of Lozenge, 📌 emoji, native selects, three breadcrumb styles, clipped fixed-width tables, dual key formats.
5. **Traceability is a stub**: real view-backed data but no live `ph_issues` join, no defect column, no scope parameter, no matrix.
6. **Reports have a P1 defect class**: 10 dedicated bodies swallow errors into infinite spinners; status_category casing split-brain; product-status fabricates 0-defect cards.

**Verdict**: NOT a rip-and-replace. **Rebuild the presentation tier and IA on top of a largely reusable data foundation.** Weighted reuse ≈ **58%** (schema/RPCs ~85%, hooks ~70%, report engine ~75%, page surfaces ~35%, tree/pills/board ~0–15%). Detailed per-area matrix in §19.

The rebuild's three market differentiators (no benchmark tool ships all three): release quality-gate-aware Plan readiness, native defect→incident escalation, TestRail-speed inline authoring inside an LTREE repository.

---

## 2. Current-State Evidence Summary

| Probe | Verdict in one line | Evidence file |
|---|---|---|
| Repo architecture | 69 files/~29k LOC; real data layer is `src/hooks/test-management/` (28 hooks); 7/17 pages are thin wrappers over canonical hubs; handover doc materially stale | evidence/01 |
| Database | 55 tm_ tables (22 empty), 87 RPCs, LTREE live, cascade triggers live; 3-generation RLS inconsistency; 3 unapplied migrations; 28 dead th_ tables | evidence/02 |
| Live UI | 0 crashes/404s; runner+reports strong; dead create button, fake project context, FK crash, wrong-empty board, unfiltered My Work | evidence/03 |
| Project Hub canon | Full component catalog available (JiraTable/ViewBase/SidebarDetails/StatusLozengeDropdown/ProfilePicker/CreateStoryModal…); **no canonical tree, no matrix grid, no runner surface** | evidence/04 |
| Incident linkage | Canonical IncidentHub = ph_issues+incidents extension; TestCoveragePanel read-path already on incident view; CRE bans QA Bug↔Production Incident via ph_issue_links; sprint FK conflict (ph_jira_sprints vs iterations) | evidence/05 |
| Reports | 26/26 wired real; 18 keep / 7 refactor / 1 merge; P1 error-swallowing in 10 bodies; zero use of 87 RPCs | evidence/06 |
| Packages | **Zero new installs needed** — recharts/pragmatic-dnd/react-virtual/xyflow/resizable-panels all installed with in-repo precedent | evidence/07 |
| Benchmarks | Common core + differentiators mapped from Xray/TestRail/Zephyr/qTest/PractiTest (+4); Gartner MQ for test management does NOT exist publicly — do not cite | evidence/08 |

## 3. Screenshot Inventory

Live screenshots were captured and analyzed in-session by the Chrome MCP probe on all 14 routes (light) + dashboard/repository/reports (dark); they are **not persisted as files** (probe-session artifacts). All UI criticism above is additionally backed by DOM/CSS measurements (computed styles, element counts, widths) recorded in evidence/03. **Persisted light+dark PNG pairs are a deliverable of the Phase B prototype gate**, per master prompt §26 — prototype screens will be screenshot-archived under `features/CAT-TESTHUB-REBUILD-20260704-001/screenshots/`.

## 4. Route Inventory (verified live + code)

All in `src/routes/FullAppRoutes.tsx:652–691`, ModuleGate `k="testhub"`, all lazy-loaded, all resolve (0 404s):

`/testhub`→dashboard · `/testhub/{dashboard,my-work,board,repository,cycles,timeline,dependencies,sets,traceability,defects,filters}` · `/testhub/:projectKey/cycles/:cycleKey[/execute]` + legacy short form · `/testhub/sets/:setKey` · `/testhub/defects/:defectKey` · `/testhub/reports[/:reportSlug]` + 6 legacy redirects · `/testhub/filters/{create,:filterId}` · Admin: `/admin/test/{priorities,case-types,case-statuses,permissions}` + test-ops.

Slug-contract compliant except `:filterId` (UNRESOLVED whether value is a slug). Sidebar (TestHubSidebar, 12 items) ↔ routes: zero orphans in either direction. **No route exists for: plans, folders (deep-link), runs, scenario, admin environments/custom-fields/notifications/audit.**

## 5. File Inventory (summary; full table in evidence/01)

- Pages `src/pages/testhub/` (17 routed): 7 thin wrappers (Dashboard→ProjectDashboardPage mode='test', MyWork/Defects→BacklogPage+adapters, Board→KanbanPage, Filters×2) + 10 bespoke (Repository 1003 LOC, CycleDetail 1251, Execution 1125, SetDetail 828, TestSets 512, Cycles 478, Traceability 262, ReportsHub 201, Timeline 100, Dependencies 94) + reports lab chassis (~2160).
- Components `src/components/testhub/`: reports subsystem (22 files), AIGenerateTestCasesDialog (599), VersionDiffView, TmCommentsSection.
- **Real data layer `src/hooks/test-management/` (28 hooks, ~240KB)** — useTestCases 42.5K, useDefects 34.8K, useTestCycles 24.3K, useFolders 13.3K, +versioning/flaky/coverage-gap/MTTR hooks.
- Detail views: `src/components/catalyst-detail-views/` CatalystViewTestCase/TestCycle/TmDefect (canonical).
- Dead: `src/hooks/testhub/useCommandCenter.ts` (274 LOC, zero importers); mis-homed useReleases.ts; zombie `test_data_rows`/`test_cycle_executions` path in 2 hooks.

## 6. Database Inventory (summary; full in evidence/02)

- 55 `tm_*` tables; live rows in 33 (staging): tm_test_cases 104, tm_test_steps 88, tm_cycle_scope 61, tm_requirement_links 56, tm_test_runs 54, tm_defects 15, tm_test_plans 2. 22 tables empty (incl. both version tables, attachments, comments, labels, environments, notifications-adjacent none).
- 87 RPCs (analytics ×9, compare_cycles, traceability_matrix, versioning, gates/signoffs/readiness, BDD) — **frontend uses ~6 of 87**.
- Cascade verified: step→run→scope→cycle counters; auto-defect on failed run; version pinning at scope-add; immutable step snapshots.
- LTREE live on tm_folders.path. Key sequences per prefix.
- **Drift**: 3 repo migrations unapplied to staging (tm_defect_status_history, tm_coverage_history, tm_defect_key_normalize — explains dual key formats seen live); v_tm_requirement_coverage applied out-of-band.
- **RLS**: 3 generations (proper tm_user_has_access / blanket authenticated / current_user_is_approved) + fully-open tm_release_signoffs, tm_signoff_templates; tm_permissions/tm_roles writable by any authed user. Standardization required (approval-gated — stop rule 12).
- Duplicate families: tm_audit_log vs tm_audit_logs; tm_attachments vs tm_test_attachments. 28 th_* tables dead (22 empty).
- Linkage: tm_requirement_links (live, 56 rows) = coverage backbone; tm_defect_links polymorphic (auto_execution rows live; incident slot unused); tm_test_cases has linked_story_key + sprint_id + release_id (NOT linked_work_item_id).

## 7. Package Inventory (summary; full decision records in evidence/07)

**Install-now list: EMPTY.** recharts 3.5.1 (via existing ADS ReportChart wrapper), @atlaskit/pragmatic-drag-and-drop 1.7.5 full suite, @tanstack/react-virtual 3.13.13 (already inside JiraTable), @xyflow/react 12.10.2 (DependenciesDiagram precedent), react-resizable-panels 2.1.9 (installed, dormant — DEFER, first use = new canonical pattern needing sign-off). Dead: react-window. Rules: raw recharts import = review flag; new dnd code = pragmatic only; new pages lazy(); don't re-split vendor-atlaskit chunk.

## 8. Current Defects & Quality Issues (consolidated, evidence-ranked)

**P0 — functional breaks**
1. Dead "+ Create case" (Repository). 2. Hardcoded project UUID `…0001` in repository/dashboard queries → FK crash ×2/load, board wrong-empty, My Work unfiltered. 3. tm_test_plans has zero UI. 4. 10 report bodies swallow errors → infinite spinner.

**P1 — trust/correctness**
5. status_category casing split-brain ('Done' vs 'done') across report hooks. 6. product-status report fabricates 0-defect cards + truncated-UUID keys. 7. tester/team-performance attribute execution to assignee not executed_by. 8. Saved views don't persist sprint/tester/epic params (incl. default report). 9. Dual key formats (unapplied normalize migration). 10. Dependencies cards titled by raw UUID. 11. Sprint FK ambiguity (code writes ph_jira_sprints.id; handover claims iterations) — must verify before any cycle work. 12. {data}-only destructures in 6 picker hooks + 1 unchecked error.

**P2 — UX/canon violations**
13. Hand-rolled folder tree (no virtualization/keyboard/dnd; DOM-prop leaks). 14. Custom status pills (not Lozenge/StatusLozengeDropdown). 15. Clipped fixed-width tables (cycles list + detail). 16. Breadcrumb inconsistency ×3 styles. 17. 📌 emoji; SET-key wrapping; native selects in cycle assignment. 18. Timeline dateless ("No issues with dates" modal). 19. Traceability: no live ph_issues join, no defects, no scope. 20. Zero RPC usage in reports (3× full ph_issues scans per render). 21. Chart palette theme-blind in dark. 22. Repo rows 1px outline heavier than Jira dark.

**P3 — hygiene**
23. Dead useCommandCenter.ts; 4 orphaned lab report defs; export missing on 5 bodies; execution-history 100-row cap; zombie test_data_* path; cycleStatusFromDb(null)→'PLANNED' domain default; RLS generations (security debt, approval-gated).

## 9. Benchmark Research (summary; full per-product + URLs in evidence/08)

**Gartner**: no publicly citable current MQ for test management exists (STA MQ discontinued 2019; 2025 AI-Augmented Testing MQ is a different category). "Gartner-level quality bar" = allowed phrasing; any ranking claim = banned.

**Common core all serious tools share**: case library separate from execution; Definition→Planned instance→Immutable result event; time-boxed cycle bound to release/sprint/env; plan umbrella with rollup; step→run→cycle computed rollup; evidence at run+step; inline defect raise with inherited context; requirement traceability with per-requirement status; 8 signature reports.

**Differentiators adopted into this blueprint**:
- Xray: coverage as computed status (OK/NOK/NOT RUN/UNCOVERED) with **selectable analysis scope** (latest|release|plan|cycle); folder-vs-set doctrine (1 folder home, N set memberships; folders=functionality never release).
- TestRail: title-only inline case entry (+Enter); append-only result history; To-Do workload view.
- Zephyr Scale: **Plan→Cycle→Execution naming** (cleanest; matches tm_ schema 1:1); own keys outside issue tracker (validates tm_*+ph_issues split); versioning with executed-version pinning (schema already does this via scope-add trigger).
- qTest: coverage predicates as explicit SQL formulas.
- PractiTest: scope-row=instance abstraction (already ours); exploratory charter type (later slice).
- Qase: fail→defect prompt with inherited context (trigger already auto-creates; UI must surface).

**Anti-patterns rejected**: execution semantics in folder tree; >2 execution container levels; TestRail's "plan"-naming inversion; everything-as-an-issue; report sprawl; filters-only or folders-only organization.

---

## 10. Target Mental Model

One sentence per persona: *"The Repository holds what we CAN test; Cycles are what we ARE testing now; Plans say whether the release is READY; everything traces back to work items."*

| Object | Backing (exists today) | Definition | Notes |
|---|---|---|---|
| Test Space | `tm_projects` ↔ `projects` via resolveTmProjectId | Project-scoped testing context; ALL TestHub surfaces operate inside one selected Test Space | Kills the hardcoded-UUID model. Space switcher in hub header |
| Test Repository | `tm_folders` (LTREE) + `tm_test_cases` | The library. Folders = functionality, never releases | Xray/AIO doctrine; 1 case = 1 folder |
| Folder | `tm_folders` | Navigational tree, rollup counts + coverage/execution summary | Gets slug for deep links (additive migration) |
| Scenario | `tm_test_cases` with `test_format='gherkin'` (+ gherkin cols, tm_gherkin_steps) **or** case_type "Scenario" | Business-flow spec; groups/links cases via tm_test_case_links | **Recommended: NOT a new table** (see §24 decision). tm_scenarios = stop-rule object, deferred |
| Test Case | `tm_test_cases` + `tm_test_steps` | Executable spec; steps action/data/expected; admin-driven priority/type | Two authoring modes: steps \| Gherkin |
| Test Step | `tm_test_steps` | Action, expected, optional data; shared-step cols exist (later slice) | |
| Test Set | `tm_test_sets` (static + smart) | Many-to-many selection tool feeding cycles; never holds results | static=Xray Set, smart=saved filter |
| Test Plan | `tm_test_plans` (39 cols) + gates/signoffs/readiness tables + RPCs | **Release readiness umbrella**: groups cycles, owns gate evaluation + signoff verdict | Currently ZERO UI — biggest unlock, schema complete |
| Test Cycle | `tm_test_cycles` | Time-boxed execution container (sprint/env/build) | Zephyr semantics; binds sprint; NO suite sub-level |
| Cycle Scope | `tm_cycle_scope` | Planned instance: case@pinned-version + assignee + order + current_status | PractiTest "instance" |
| Test Run | `tm_test_runs` | One execution event; re-execution appends (run_number) | Append-only |
| Step Result | `tm_step_results` (immutable snapshots) | Per-step verdict + actual + evidence | |
| Defect | `tm_defects` (ADF cols, parent_key, auto_created) | Raised from run/step via CreateStoryModal QA-Bug path; auto-defect trigger live | |
| Incident Link | tm_defect_links(link_type='incident') + incident_work_items (reciprocal) | Defect↔incident escalation; CRE C3 blocks ph_issue_links path — this is the sanctioned route | Zero DDL needed |
| Work Item Link | `tm_requirement_links` (external_key=issue_key) | Coverage backbone; already read by TestCoveragePanel on story/defect/incident | |
| Evidence | `tm_attachments` + storage `tm-attachments` | Attach at case/run/step/defect | |
| Report | report-registry (26) + formulas drawer | Source-transparent derived views | |
| Dashboard | Command Center (§13 screen 1) | Operational + executive | |
| Traceability Matrix | v_tm_requirement_coverage + tm_get_traceability_matrix RPC | Forward/backward coverage with scope param | |

Persona fit: Tester lives in My Work + Runner. QA lead in Cycles + Repository. Test manager in Plans + multi-cycle reports. BA/PO in Traceability + coverage. Incident manager in incident validation view. Executive in Readiness dashboard.

## 11. Target Information Architecture

**Decision (challenge #29): TestHub stays a global hub, but every surface is project-scoped through a mandatory Test Space switcher** (pattern: reports hub's existing project picker, made hub-global and persistent). URL keeps `/testhub/*`; space in context, not path (matches current reports deep-link `?project=` convention).

Sidebar (9 items, down from 12 — kill Board/Filters-as-Jira-clone ambitions, fold Timeline into Cycles):

```
TEST HUB [Space: ▾ Senaei BAU]
├─ Command Center        /testhub/dashboard        (rebuilt)
├─ My Testing Work       /testhub/my-work          (rebuilt: assigned runs, To-Do semantics)
├─ Repository            /testhub/repository       (rebuilt shell, tree v2 + inline add)
├─ Test Sets             /testhub/sets             (refactor)
├─ Plans & Readiness     /testhub/plans  [NEW]     (tm_test_plans + gates + signoffs)
├─ Cycles                /testhub/cycles           (refactor; timeline as a tab)
├─ Defects               /testhub/defects          (keep, wrapper already canonical)
├─ Traceability          /testhub/traceability     (rebuilt: matrix + graph + scope)
└─ Reports               /testhub/reports          (uplift in place)
```

~~Removed from nav~~ **REVERSED at Gate B (Vikram 2026-07-05): NOTHING Catalyst has may be lost.** Board, Timeline, Dependencies and Filters stay first-class nav items and get UPLIFTED, not hidden: Board → bound to real case/run workflow statuses (fixes wrong-empty); Timeline → release/cycle Gantt fed by cycle dates (Phase E adds dates at create); Dependencies → keeps its dedicated surface AND powers the Traceability graph (key-titled nodes fix); Filters → kept alongside smart sets. Nav = 13 items (9 above + these 4). Exhaustive feature union in `01_WORLDCLASS_FEATURE_MATRIX.md` — target is the industry #1 feature set: everything Catalyst ships today ∪ best of Xray/TestRail/Zephyr/qTest/PractiTest/Qase/Allure/SpiraTest/AIO ∪ Catalyst-only differentiators.

## 12. Target Screen Inventory (30 screens; format: purpose · persona · primary action · data · components · states)

Core layout primitives reused everywhere: HubPageHeader / ProjectPageHeader, JiraTable + cell factories, CatalystDetailRouter (panel/fullPage), CatalystSidebarDetails, StatusLozengeDropdown, ProfilePicker, CatalystDrawer, SectionMessage+Retry (error), EmptyState (zero), Spinner→skeleton (loading), FlagsHost (toasts). Dark mode: token-only by construction; chart palettes via adsChartTheme. Responsive: JiraTable column priority + narrow-mode hides right rail (ProjectAllWorkView precedent). Permissions: tm_user_has_access + tm_permissions (Phase H hardening).

1. **TestHub Command Center** (`/testhub/dashboard`) — rebuilt. QA lead/exec. Read health, jump to work. Widgets (DashboardWidgetGrid + registry, FK fix first): Readiness strip (plans w/ gate verdicts), Active cycles w/ progress bodies (fix header-only widget), My pending runs, Coverage % (scoped), Open defects by severity, Flaky top-5 (useFlakyTestDetection exists). Data: v_tm_cycle_progress, v_tm_my_work, readiness RPCs. Acceptance: zero console errors; every widget has body or honest empty; layout persists.
2. **Test Repository** — rebuilt shell. Tester/QA lead. Split: FolderTreeV2 (left, 280px) + JiraTable cases (right) + CatalystDetailRouter panel (detail). **Tree v2 = flattened-tree-in-JiraTable-style rows, react-virtual, keyboard nav, pragmatic-dnd move, context menu (new/rename/move/archive/export), system views (All, Unassigned, Recently updated, Needs review, No work-item link, Linked to current sprint)**. TestRail inline title-only add row per folder (+Enter). Bulk bar: move/assign/status/label/link/archive (BulkFooterBar). No hard delete.
3. **Repository Folder Manager** — folder ops live in tree context menu + a Manage Folders drawer (counts, coverage/exec rollup via LTREE aggregate, archive). Data: tm_folders_with_counts.
4. **Scenario Manager** — Gherkin-mode cases surfaced as a Repository filter chip + scenario badge; scenario detail = case detail with Gherkin editor (tm_gherkin_steps, tm_convert_to_bdd RPC) + linked cases section (tm_test_case_links). No new table (see §24).
5. **Case Create/Edit Drawer** — CatalystDrawer (wide): identity (key preview via tm_next_entity_key), folder picker, title, ADF description, preconditions, priority/type (admin-driven), owner (ProfilePicker), labels, linked work item (tm_requirement_links picker w/ CRE-safe search), estimate, StepEditor v2. Fixes dead Create button by rebuild.
6. **Case Detail** — existing CatalystViewTestCase (keep; already ViewBase+tabs+versioning+coverage) + polish: version pin indicator, latest/history results tab (append-only tm_test_runs), scenario badge.
7. **Step Editor v2** — numbered rows, action/expected/data, insert above/below, duplicate, delete, pragmatic-dnd reorder (tm_reorder_steps RPC), keyboard (Tab/Enter flow), bulk paste (rows→steps parser), dirty-state guard, autosave-on-blur w/ explicit save affordance, empty-step guard.
8. **Test Sets** — refactor: JiraTable, Lozenge (kill 📌), fixed key column, smart-set query builder (existing smart_query jsonb), set→cycle push (tm_cycle_sets exists).
9. **Cycle List** — refactor: fix clipped container (fluid width), add sprint/env/dates columns, readiness chips, timeline tab (needs cycle dates entry in create flow — currently dateless).
10. **Cycle Create Flow** — modal: name, sprint (**after FK verification**, §23 Q3), environment (tm_environments — empty table, seed via admin), planned dates (fixes dateless timeline), owner.
11. **Cycle Detail / Scope Builder** — refactor 1251-LOC page onto canonical layout: fluid table (unclip), scope tab w/ folder/set/filter add flows + duplicate guard (UNIQUE(cycle_id,case_id) exists), ADS Select for assignee (kill native select), bulk assign, version-pin visibility.
12. **Cycle Assignment View** — scope tab group-by-assignee + workload counts (v_tm_execution_by_assignee).
13. **Execution Runner** — KEEP + polish (best current surface): add per-step results when steps exist (already), run notes, link-existing-defect/incident action, cycle progress in header, next-case auto-advance, final run summary.
14. **My Testing Work** — rebuilt semantics: v_tm_my_work (assigned scope entries in active cycles), status filter chips, Start run CTA → runner. Empty state when truly nothing assigned. To-Do pattern (TestRail).
15. **Defect Raise Modal** — keep CreateStoryModal QA-Bug path; prefill from runner context (case/step/cycle/env → source_* cols); auto tm_defect_links rows already written.
16. **Defect List/Detail** — keep (already canonical wrappers); apply key-normalize migration.
17. **Incident Validation View** — incident detail already has TestCoveragePanel(mode='incident'); ADD write path: "Link test case" + "Create validation cycle" actions (tm_requirement_links w/ external_key=INC key; cycle template w/ linked cases). Reciprocal list on TestHub side: cycles filtered by linked incident.
18. **Traceability Matrix** — rebuilt: JiraTable matrix (req rows × coverage/status/defects/cycles columns), live ph_issues join (status, type icon, clickable keys), scope param (latest|release|plan|cycle — Xray model), OK/NOK/NOT RUN/UNCOVERED chips, missing/failed/blocked quick filters, CSV export. Data: v_tm_requirement_coverage + tm_get_traceability_matrix RPC.
19. **Coverage Graph** — Traceability second tab: extend DependenciesView/@xyflow (fix UUID titles → keys+names), req→case→run→defect flow; JiraTable list fallback (a11y).
20. **Report Center** — keep hub shell; fix breadcrumb dup; Saved views param completeness.
21–27. **Reports** (uplift in place, formulas drawer already exists): Execution Overview (keep), Cycle Summary (keep), Multi-Cycle Comparison (keep; switch to tm_compare_cycles RPC), Case Distribution (keep, merge duplicate), Requirement Coverage (reformulate on view), Defect Trend + NEW leakage (tm vs prod-incident via parent_key), Tester Workload (fix executed_by attribution + tm_get_cycle_team_workload RPC). ALL: add isError branches (P1 fix), casing normalization helper.
28. **Risk & Readiness Dashboard** — NEW report category: tm_release_quality_gates + signoffs + tm_create_readiness_snapshot/evaluate RPCs; per-plan gate pass/fail, waivers, signoff status. Differentiator screen.
29. **Admin Test Configuration** — keep 4 existing pages; add Environments (table exists, empty); defer custom-fields/notifications/audit pages (Phase H).
30. **Audit/History View** — Phase H: tm_audit_log (3 rows live) surfaced on case/cycle detail activity tabs; consolidate dup tables first (approval).

## 13. Target Workflow Maps (5 core)

1. **Author**: Repository → folder → inline add title (+Enter) → enrich in drawer (steps/links) → status draft→ready→approved (admin statuses).
2. **Plan**: Plans → create plan (release link) → attach cycles → cycles get scope from folders/sets/filters → bulk assign → gates configured.
3. **Execute**: My Work → Start run → step verdicts (1/2/3/4) → evidence → fail⇒defect prompt (prefilled) → save → cascade (step→run→scope→cycle→release counters, all trigger-driven, verified live).
4. **Escalate**: defect → link incident (tm_defect_links + incident_work_items) → incident fix → "Create validation cycle" from incident → regression scope → validation status back on incident panel.
5. **Read readiness**: Plan detail → gate evaluation (RPC) → signoffs → readiness verdict → executive dashboard chip → release decision.

## 14. Target Data Model Impact (ALL additive; none destructive; each needs approval per stop rules)

| # | Change | Type | Risk | Stop-rule |
|---|---|---|---|---|
| D1 | Apply 3 drifted migrations to staging (defect_status_history, coverage_history, defect_key_normalize) | already-committed files | low | ledger discipline |
| D2 | `tm_folders.slug` + trigger + Routes builder + useFolderBySlug | additive DDL | low | slug contract (mandated) |
| D3 | Verify + fix tm_test_cycles.sprint_id FK target (ph_jira_sprints vs iterations) | probe→possible FK fix | med | #10 audit-conflict → ask |
| D4 | RLS standardization on tm_user_has_access (plans/gates/signoff/permissions tables; close public-true signoffs) | policy change | med | #12 RLS → approval REQUIRED |
| D5 | Notification tables (tm_notifications + settings) | additive, Phase H | low | approval (new tables) |
| D6 | Consolidate tm_audit_log/s + tm_attachments/tm_test_attachments | migration + code sweep | med | approval |
| D7 | th_* retirement (28 tables) | destructive | med | #1 destructive → approval, separate work id |
| D8 | tm_scenarios | NOT PROPOSED | — | #11 avoided — scenario via existing cols |

## 15. Target Integration Model

- **Project Hub**: Test Space bound to projects via resolveTmProjectId (existing); coverage chips on story detail (TestCoveragePanel — exists); "create test case from story" action (CRE-safe: TESTHUB owns Test Case creation — surface must be registered in cre-chokepoint-gate.cjs); dashboard widgets already in registry.
- **Incident Hub**: read path exists (TestCoveragePanel mode='incident'); add link/create-validation-cycle write paths (§12.17). Defect↔incident via tm_defect_links+incident_work_items ONLY (CRE C3 bans ph_issue_links pair). No Incident Hub behavior change without its own approval.
- **Releases**: releases counters already trigger-synced from tm_; Plans surface joins release_test_cycles + gates. Release Hub untouched.
- **Sprints**: cycle.sprint_id after D3 verification; sprint dimension in reports (exists).
- **CRE**: all new create/link surfaces call CRE API + get added to gate file list.

## 16. Target Reports Model

Keep 26-report registry architecture. Changes: (a) P1 error-handling fix across 10 bodies + 6 destructure fixes + casing helper; (b) formula corrections (burndown ideal line, traceability %, attribution); (c) merge 1 duplicate; kill 4 orphaned lab defs; (d) move heavy joins to existing RPCs/views (compare_cycles, cycle analytics ×9, traceability matrix, team workload); (e) NEW: pass/fail rate trend, defect leakage, flaky cases (hook exists), Risk & Readiness category; (f) saved-view param completeness; (g) export menu on all bodies + catch handlers. Source transparency: FORMULA_EXPLANATIONS drawer already exists — extend to new reports.

## 17. Target Visualization Model

- Charts: ReportChart wrapper ONLY (line/bar/area/pie); add dark-aware categorical ordering review (palette theme-blind nit).
- Coverage/dependency graph: extend DependenciesDiagram (xyflow) w/ typed nodes (req/case/run/defect), key-titled cards; list fallback.
- Matrix: JiraTable-based (no new grid lib).
- Progress/risk: Lozenge + ProgressBar + readiness chips (token semantic colors).
- Timeline: existing shared TimelineView only after dnd-era check; cycles get dates first.

## 18. Package Recommendations

None to install. Reuse: recharts(wrapper), pragmatic-dnd, react-virtual, xyflow, @atlaskit/* via ads barrel. Deferred: react-resizable-panels (only if approved design specifies resizable split; else fixed sidebar). Full decision records: evidence/07.

---

## 19. Fitment / Reuse Matrix (37 areas)

Columns: quality 0–10 · reuse % · decision · reason/action · risk · approval?

| Area | Path | Q | Reuse | Decision | Reason / required action | Risk | Appr |
|---|---|---|---|---|---|---|---|
| Schema | 55 tm_ tables | 8 | 90% | keep | consensus shape; apply 3 drifted migrations; consolidate dup families later | low | D1 |
| RLS | pg_policies | 4 | 40% | refactor | 3 generations + open signoff tables; standardize on tm_user_has_access | med | YES (D4) |
| RPCs | 87 tm_* | 8 | 85% | keep | mostly unused by FE — wire them; rewrite none found broken yet | low | no |
| Views | 9 | 8 | 90% | keep | v_tm_requirement_coverage/my_work/cycle_progress = rebuild backbone | low | no |
| Routes | FullAppRoutes 652-691 | 7 | 85% | keep | add /plans; nav-hide board/timeline/deps/filters w/ redirects | low | YES (nav) |
| Layout | TestHubSidebar + shells | 6 | 60% | refactor | 9-item nav + Space switcher; fix 3-style breadcrumbs | low | no |
| Navigation | sidebar/crumbs | 5 | 50% | refactor | see above | low | no |
| Repository | RepositoryPage 1003 | 5 | 45% | replace-shell | keep data flow + JiraTable; rebuild tree, kill hardcoded project id, fix dead create | med | no |
| Folder tree | FolderTreeView (hand-rolled) | 3 | 10% | replace | virtualized flattened tree, keyboard, dnd, context menu | med | tree pattern |
| Scenario mgmt | (absent) | 0 | n/a | build | Gherkin-mode + linked cases; NO new table | low | YES (§24) |
| Case list | JiraTable in repo | 7 | 80% | keep | add inline title-add row, bulk bar | low | no |
| Case drawer | (dead button) | 2 | 20% | replace | new CatalystDrawer create/edit; CreateStoryModal pattern | med | no |
| Step editor | StepEditor 146 | 4 | 35% | replace | v2 w/ reorder RPC, bulk paste, autosave, guards | med | no |
| Case detail | CatalystViewTestCase | 8 | 85% | keep | polish: results history tab, version pin badge | low | no |
| Test sets | TestSetsPage/SetDetail | 6 | 65% | refactor | Lozenge, key col, smart builder UI, set→cycle exists | low | no |
| Cycle list | CyclesPage 478 | 5 | 55% | refactor | unclip container, add columns, dates in create | low | no |
| Cycle detail | CycleDetailPage 1251 | 5 | 50% | refactor | canonical layout, ADS Select, consolidate 14 inline queries into hooks | med | no |
| Scope builder | in detail | 5 | 55% | refactor | folder/set/filter add, dup guard exists in schema | low | no |
| Execution runner | ExecutionPage 1125 | 8 | 80% | keep | best surface; add link-existing-defect, summary, auto-advance | low | no |
| Defect modal | CreateStoryModal QA-Bug | 8 | 90% | keep | prefill from runner context | low | no |
| Evidence upload | runner dropzone + bucket | 7 | 80% | keep | extend to step level consistently | low | no |
| My Work | MyWorkPage wrapper | 2 | 25% | replace | v_tm_my_work semantics; wrapper chrome reusable | low | no |
| Dashboard | DashboardPage wrapper | 3 | 40% | refactor | fix FK (real project id), widget bodies, readiness strip | med | no |
| Reports | 26-report subsystem | 7 | 75% | refactor | P1 error fixes, formulas, RPC adoption, +4 new reports | low | no |
| Traceability | TraceabilityPage 262 | 4 | 40% | replace | matrix v2 + scope + live joins + graph tab | med | no |
| Incident integration | TestCoveragePanel read path | 6 | 70% | extend | add write paths + validation cycle flow | med | CRE gate file |
| Prod-incident integration | ph_issues type + CRE | 5 | 60% | extend | same mechanism; C3-safe linking only | med | no |
| Work-item integration | tm_requirement_links live | 7 | 85% | keep | picker UX + Feature/Epic rollup later | low | no |
| Admin config | 4 pages | 6 | 70% | keep | + Environments page; defer rest to H | low | no |
| Audit | tm_audit_log(+dup) | 3 | 30% | investigate | consolidate dup first; surface in activity tabs (H) | med | YES (D6) |
| Notifications | (absent; orphaned enum) | 0 | 0% | build (H) | tables + prefs; essential: assignment, failed-run-on-my-case, signoff-request | low | YES (D5) |
| Light mode | tokens | 8 | 95% | keep | verified clean | low | no |
| Dark mode | server-persisted theme | 7 | 85% | keep | fix row-outline weight + chart palette ordering | low | no |
| Responsiveness | mixed | 4 | 40% | refactor | kill fixed-width containers; panel-layout narrow modes | low | no |
| Accessibility | partial | 4 | 40% | refactor | keyboard tree, aria on matrix, graph list fallback | med | no |
| Package stack | package.json | 9 | 100% | keep | zero installs | none | no |
| Test coverage | 1 unit file in module area | 2 | 15% | build | runner cascade + coverage predicates + tree unit tests in each phase | med | no |

**Weighted overall reuse ≈ 58%** (weights: schema/data 30%, surfaces 40%, reports 15%, integrations 15%). Recommendation: **presentation-tier rebuild on retained foundation** — not schema rip, not cosmetic patch.

## 20. 108 Challenge Answers

**Current state (1–27)**
1. Mental model = "folders→cases, cycles→runs" demo; fails because project context is fake, Plans invisible, sets/folders/cycles relationship unexplained, no readiness concept.
2. Unusable: Dashboard (FK crash + half-widgets), Board (wrong-empty), My Work (wrong semantics).
3. Ugly-but-salvageable: Cycles list/detail (clip), Sets (emoji/wrap), Traceability (narrow but honest).
4. Functionally broken: Create-case button; dashboard widget persistence; saved-view params (sprint etc.).
5. Dead routes: none (0 404s). Nav-noise routes: board/timeline/dependencies/filters (§11).
6. Sidebar links: all 12 resolve; none fail.
7. Dead components: useCommandCenter.ts (274 LOC); 4 orphaned lab report defs.
8. Unused hooks: useCommandCenter; useReleases mis-homed (used by Releases module only).
9. Hooks reading wrong tables: useCreateRunWithDataRows/useDataRowResults → zombie test_data_*/test_cycle_executions; useCommandCenter → cc_* tables.
10. th_* readers: **zero**.
11. tm_* writers: repository/cycles/execution/sets/defects flows + reports save-views (full table evidence/01).
12. Mixed schemas: reports intentionally cross-read ph_* (by design); zombie test_data_* path is accidental mixing.
13. Wrong-RPC reports: none use RPCs at all — client joins; product-status fabricates zeros.
14. Fake reports: none of 26 fake; 1 fabricates defect-zeros (product-status).
15. Trustworthy dashboard metrics: test-case status counts (verified real).
16. Always-zero metrics: product-status defect cards (hardcoded); cycles widget body (absent).
17. Persisting mutations: case/cycle/run/step/set/defect CRUD verified writing tm_*.
18. Silently failing: dashboard widget-config upsert (FK); report picker errors ({data}-only ×6).
19. RLS blocking UI: gen-2 blanket policies (plans/gates) currently over-permit rather than block; open signoff tables = opposite problem.
20. Required triggers: percolate + cycle stats + auto-defect + version-pin + snapshot — all EXIST live.
21. Missing triggers: none critical; notifications absent by design gap.
22. Working cascades: step→run→scope→cycle verified consistent live (33% progress math matched runner state).
23. Hardcoded fields: severity vocab, cycle-status UI bridge (null→'PLANNED'), 14-status chart vocab, run statuses; priorities/types admin-driven.
24. Project-context-ignoring UI: repository, dashboard, board, my-work (hardcoded UUID) — the root defect.
25. Must integrate w/ Project Hub: coverage chips (exists), create-case-from-story, dashboards (registry exists).
26. Must integrate w/ Incident Hub: validation cycle + link-case write paths (read exists).
27. Must integrate w/ Release/Sprint: Plans↔releases (schema ready), cycle↔sprint (after D3).
**Target design (28–57)**
28. Target IA: §11 (9-item nav + Space switcher).
29. Global vs project-scoped: global hub + mandatory project-scoped context (§11 decision).
30. Tester finds work <10s: My Work = v_tm_my_work, default landing for tester persona, Start-run CTA.
31. QA lead cycle <60s: Create modal (name+sprint+dates) → scope from folder/set in one drawer → bulk assign.
32. BA story coverage: story detail TestCoveragePanel (exists) + Traceability scoped OK/NOK.
33. PO release readiness: Plans & Readiness screen — gates+signoffs verdict per release.
34. Incident manager validates fix: incident detail → validation cycle status chip + linked runs (§12.17).
35. Executive quality risk: Command Center readiness strip + Risk & Readiness report.
36. Case creation without overload: inline title-only add; enrich later in drawer (progressive disclosure).
37. 20 steps efficiently: bulk paste + Enter-flow keyboard editor.
38. Move cases: drag to folder (pragmatic) + bulk Move dialog.
39. Bulk add to cycle: scope builder folder/set/filter multi-select.
40. Duplicate prevention: UNIQUE(cycle_id,test_case_id) exists; UI grey-out already-in-scope.
41. Pass/fail/block/skip explained: runner keyboard legend (exists) + status glossary popover.
42. Evidence at right level: step dropzone during step, run-level for whole-case verdicts (both exist).
43. Defect from step: fail verdict → prompt (Qase pattern) → CreateStoryModal prefilled (source_* cols).
44. Link existing incident: runner + defect detail "Link incident" (tm_defect_links).
45. Latest case result: repository column from cycle_scope worst-of (TestCoveragePanel logic reused).
46. Historical: case detail Results tab — append-only runs by run_number.
47. Scenario status: scenario badge + linked-case rollup on Gherkin case detail.
48. Folder coverage: tree rollup chips (LTREE aggregate).
49. Work-item coverage: Traceability matrix + story panel.
50. Untested stories: matrix UNCOVERED filter (v_tm_requirement_coverage).
51. Failed high-priority stories: matrix NOK + priority sort.
52. Blocked testing: cycle blocked counters + matrix blocked filter.
53. Overdue executions: cycle planned_end vs now chip (v_tm_cycle_progress schedule_status exists).
54. Workload imbalance: assignment view + tm_get_cycle_team_workload RPC.
55. Risky folders: folder rollup fail-rate; flaky top-5 widget.
56. Cycles compared: multi-cycle-comparison report (exists; move to RPC).
57. Progress over time: burnup/burndown (fix ideal line) + new rate trend.
**Reports/viz (58–67)**
58. Charts: trends, distributions, burn*, leakage. 59. Tables: history, workload, governance, matrix. 60. Matrix views: requirement coverage, multi-cycle detail. 61. Graph views: coverage graph, dependencies. 62. Justified packages: none new (all installed). 63. Unnecessary: any new chart/dnd/tree/graph lib. 64. Design-inconsistency risk: raw recharts/raw xyflow without wrappers. 65. Bundle risk: none (lazy + chunks); xyflow optional vendor chunk if grows. 66. A11y risk: graph views → list fallbacks mandatory. 67. Dark-mode risk: chart categorical palette ordering (nit, tracked).
**Reuse (68–77)**
68. Must-reuse PH components: JiraTable+cells, ViewBase/DetailRouter, SidebarDetails, StatusLozengeDropdown, ProfilePicker, CreateStoryModal, Drawer, SectionMessage/EmptyState, HubPageHeader, useItemSelection, DashboardWidgetGrid, ReportChart.
69. Delete: hand-rolled tree, custom pills, dead hooks, orphaned lab defs, 📌.
70. Salvage: runner, reports engine, case/cycle detail views, sets logic, admin pages.
71. Strong tables: cases/steps/cycles/scope/runs/step_results/defects/requirement_links/folders/plans+gates.
72. Incomplete: notifications (absent), datasets (dangling), shared steps (cols only), environments (empty), version tables (0 rows — loop unproven).
73. New tables truly required: none for core; notifications (H); NO tm_scenarios.
74. Safe migrations: D1/D2 additive. 75. Risky: D4 RLS, D6 consolidation, D7 th_ drop (gated).
76. Report-powering RPCs: compare_cycles, cycle analytics ×9, traceability_matrix, team workload, readiness suite. 77. Rewrite-needed RPCs: none identified yet (verify under load in Phase G).
**Permissions/audit/notifications (78–88)**
78. Required permissions: space-scoped role check (tm_user_has_access) on every surface; write gates per tm_permissions keys.
79–85. Personas: create cases = tester+lead; approve = lead/manager (case status transition); execute = assignee+lead; create cycles = lead; close cycles = lead/manager; raise defects = any executor; view reports = all space members (exec dashboards org-visible). Enforced via tm_permissions (15 rows exist) — matrix formalized in Phase H.
86. Audit events: case approve/version, scope change, run save, defect raise/link, gate waive, signoff — tm_audit_log + existing cycle_execution_audit.
87. Essential notifications: run assignment, my-case failed, signoff requested. 88. Deferrable: comments/mentions/digests.
**Behavior (89–108)**
89. Dark mode: token-clean foundation verified; chart ordering + row-outline nits tracked.
90. Small viewports: PanelLayout narrow modes; matrix horizontal-scroll-in-container.
91. Thousands of cases: react-virtual tree+table; LTREE subtree queries; keyset pagination on history.
92. Execution data loss: autosave per step verdict (existing save model) + dirty guard + append-only runs.
93. Cycle-builder perf: folder/set batch RPC (tm_bulk_add_cases_to_cycle exists).
94. Traceability understandable: one matrix + one graph + scope selector; formula drawer.
95. Not CRUD: readiness verdicts, coverage statuses, risk chips — decisions on every screen, not rows.
96. Risk not counts: NOK/UNCOVERED statuses, gate failures, flaky index.
97. Readiness: plan verdict chip = gates+signoffs+coverage composite.
98. Accountability: executed_by attribution fix, workload views, signoff names.
99. Missing coverage: UNCOVERED filter + folder rollups + uncovered-stories table (exists in sprint report).
100. Failing tied to business impact: matrix NOK sorted by story priority; defect-impact report (exists).
101. Incident validation: §12.17 chip + panel.
102. Cycle flow: progress bar + verdict chips + timeline tab.
103. Case lifecycle: draft→ready→approved→deprecated Lozenge + version history (schema live).
104. Quick triage: My Work chips; defect list editable pills (exists).
105. Deep drilldown: report→filtered list→detail panel chain (registry links).
106. Executive summary: Command Center strip + Risk & Readiness report.
107. Test-architect review: Needs-review system view + approval-age report (exists) + version diff (exists).
108. Smallest approval-safe prototype: `/testhub-lab` — 7 screens, mock-labeled, §22.

## 21. Implementation Roadmap (post-approval)

Every phase: scope · files · DB impact · UI impact · tests · screenshots · acceptance · rollback (git revert of phase branch; no destructive DB) · approval gate at end.

- **A — Discovery/Fitment**: DONE (this doc). Gate A = approve blueprint direction.
- **B — Prototype** (~2 slices): `/testhub-lab` route (isolated, lazy, no nav entry), 7 screens (Command Center, Repository w/ tree v2, Case drawer+step editor, Scope builder, Runner polish mock, Traceability matrix+graph, Report center w/ readiness) on labeled mock+real-read data. Light+dark screenshots persisted. Gate B = visual/mental-model sign-off.
- **C — Foundation** (~3 slices): Space context provider (kills hardcoded UUID), breadcrumb standardization, nav v2 + redirects (approval for nav-hide), dashboard FK fix, D1 migrations applied, D3 sprint-FK verification. Gate C.
- **D — Repository & Scenario** (~4 slices): tree v2, inline add, case drawer v2 + step editor v2, bulk ops, system views, Gherkin scenario surfacing, D2 folder slugs. Gate D.
- **E — Cycles & Execution** (~4 slices): cycle list/detail refactor, scope builder, assignment view, runner polish, defect prefill, dates+timeline tab. Gate E.
- **F — Traceability & Integration** (~3 slices): matrix v2 + scope param, coverage graph, incident validation write paths, CRE gate-file registration. Gate F.
- **G — Reports & Command Center** (~3 slices): P1 fixes, formula corrections, RPC adoption, 4 new reports, readiness dashboard, saved-view params, exports. Gate G.
- **H — Admin/Audit/Permissions/Notifications** (~3 slices): D4 RLS (approval), D5 notifications, D6 consolidation, environments admin, persona matrix, audit surfacing. Gate H.
- **I — Hardening** (~2 slices): a11y pass, responsiveness, perf (virtualization thresholds), test coverage, full screenshot acceptance, dark sweep. Final gate.

2-hour slice rule applies; each slice gets session log + validation output + screenshots per COMMIT GATE.

## 22. Approval Gates

G-A blueprint · G-B prototype visuals · G-C nav-hide/redirects + space model · G-D tree pattern (new canonical component) · G-E none extra · G-F CRE gate-file additions · G-G report formula changes visible to users · G-H RLS (D4) + notifications tables (D5) + consolidation (D6) · G-I ship/replace decision. Plus standing stop rules (§28 of master prompt) honored throughout.

## 23. Open Questions for Vikram

1. **Nav pruning**: approve hiding Board/Timeline/Dependencies/Filters from TestHub nav (routes redirect, nothing deleted)?
2. **Scenario model**: accept "scenario = Gherkin-mode test case + linked cases" (no tm_scenarios table)? Alternative: case_type='Scenario' config row only.
3. **Sprint FK**: code writes ph_jira_sprints.id, handover says iterations — which is the intended sprint source for cycles? (D3 probes the actual FK; product intent needed.)
4. **Split pane**: does the approved Repository design want a resizable tree|list divider (activates dormant react-resizable-panels as a new canonical pattern), or fixed 280px tree?
5. **Plans naming**: "Plans & Readiness" as the nav label (vs "Test Plans")?
6. **Board future**: is a workflow-status test board wanted eventually (Phase H+), or retire the concept?
7. **My Work default landing**: should testers land on My Work instead of Command Center?
8. **th_* retirement**: green-light a separate cleanup work id after rebuild ships?

## 24. Recommended Decisions (my calls, reversible at Gate A)

R1 Presentation-tier rebuild on retained schema (58% reuse) — not a rip. R2 Zephyr naming (Plan→Cycle→Run); no suite level. R3 Scenario without new table. R4 Coverage = SQL predicates + Xray scope param. R5 Zero new packages. R6 Tree = virtualized flattened rows, JiraTable-visual-language (new shared component, Gate D). R7 Defect↔incident via tm_defect_links + incident_work_items (CRE-safe). R8 Reports uplifted in place (engine kept). R9 Space switcher pattern from reports project picker. R10 8 signature reports promoted in nav; long tail remains in registry.

## 25. Decisions That Must Wait for Approval

Blueprint direction itself (G-A) · prototype visual language (G-B) · nav-hide (Q1) · scenario model (Q2) · sprint source (Q3) · split pane (Q4) · RLS standardization (D4) · notifications schema (D5) · audit/attachment consolidation (D6) · th_* drop (D7) · any Incident/Project/Release Hub behavior change · CRE rule changes.

---
*Discovery inputs: 8 probe reports under `features/CAT-TESTHUB-REBUILD-20260704-001/evidence/00–08`. No production code, routes, schema, or data were modified during Phase A (only artifacts: this doc, feature folder, evidence files; UI probe wrote 2 theme-preference toggles for the probing user, restored).*
