# Catalyst TestHub — World-Class Feature Matrix (Industry #1 Contract)

**Feature Work ID**: CAT-TESTHUB-REBUILD-20260704-001 · **Date**: 2026-07-05
**Directive (Vikram, Gate B)**: "Exhaustive list of features which beats every tool… world-class test module with number 1 spot in the industry. You cannot lose what Catalyst has like dependencies, timeline for releases."
**Sources**: evidence/01–08 probes (verified 2026-07-04/05), 00_DISCOVERY_FITMENT_BLUEPRINT.md, `src/pages/testhub/`, `src/hooks/test-management/` (28 hooks), `report-registry.ts` (26 wired), staging cyij DB probe (55 tm_* tables, 87 RPCs).

**Competitor key**: XR=Xray · TR=TestRail · ZS=Zephyr Scale · QT=qTest (Tricentis) · PT=PractiTest · QA=Qase · AL=Allure TestOps · SP=SpiraTest · AIO=AIO Tests · CAT=Catalyst-today · ALL=all nine · MOST=6+.

**Status legend (truth-graded — see §5 Honesty Rules)**:
- **LIVE** — shipped, verified working on staging (UI probe or code+data evidence)
- **LIVE\*** — shipped with a known defect; the fix phase is noted
- **SCHEMA-READY → X** — tables/RPCs/triggers exist and verified; UI lands in roadmap Phase X
- **PROTOTYPED → X** — code (hook/component) exists but loop unproven (0-row tables, dead path, or dormant); completed in Phase X
- **PLANNED-X** — designed in blueprint, buildable on existing schema, lands Phase X
- **NEW-X** — not in schema or code today; net-new build in Phase X

Phases per blueprint §21: C Foundation · D Repository/Scenario · E Cycles/Execution · F Traceability/Integration · G Reports/Command Center · H Admin/Audit/Permissions/Notifications · I Hardening. "H+" = post-rebuild work id.

---

## 1. GUARANTEE — Nothing Catalyst Has Is Lost

Per Gate B reversal (blueprint §11): **Board, Timeline, Dependencies and Filters stay first-class nav items.** Every capability below maps to KEPT or UPLIFTED. **Zero rows say dropped.**

| # | Current capability (evidence) | Fate in rebuild | Phase |
|---|---|---|---|
| G1 | Dashboard `/testhub/dashboard` (ProjectDashboardPage mode='test') | UPLIFTED → Command Center: FK crash fixed, header-only widget gets body, readiness strip added | C, G |
| G2 | My Work `/testhub/my-work` (BacklogPage wrapper) | UPLIFTED → true mine-semantics via `v_tm_my_work`, To-Do pattern, Start-run CTA | E |
| G3 | Board `/testhub/board` (KanbanPage mode='test') | KEPT + UPLIFTED → bound to real case/run workflow statuses (fixes wrong-empty) | H |
| G4 | Repository `/testhub/repository` (1003 LOC, LTREE tree + table) | UPLIFTED → tree v2 (virtualized, DnD, keyboard), dead "+ Create case" fixed by rebuild, inline add | D |
| G5 | Cycles list `/testhub/cycles` (478 LOC) | UPLIFTED → fluid width (unclip), sprint/env/date columns, readiness chips | E |
| G6 | Cycle detail `/:projectKey/cycles/:cycleKey` (1251 LOC) | UPLIFTED → canonical layout, scope builder tabs, ADS assignee select, 14 inline-supabase sites → hooks | E |
| G7 | Execution runner `/execute` (1125 LOC; timer, keyboard 1/2/3/4, dropzone) | KEPT (best current surface) + polish: run notes, auto-advance, step evidence | E |
| G8 | Timeline `/testhub/timeline` (Gantt shell) | KEPT + UPLIFTED → fed by cycle planned dates (added at create), release/cycle Gantt | E |
| G9 | Dependencies `/testhub/dependencies` (xyflow diagram) | KEPT + UPLIFTED → key-titled nodes (UUID fix), also powers Traceability graph | F |
| G10 | Test Sets `/testhub/sets` + Set detail (static sets, SET-### keys) | KEPT + refactor: JiraTable, Lozenge (kill 📌 emoji), smart-set builder UI | D |
| G11 | Traceability `/testhub/traceability` (tm_requirement_links ⋈ cases, honest empty) | UPLIFTED → matrix v2: live ph_issues join, defect/cycle columns, scope param, graph tab | F |
| G12 | Defects `/testhub/defects` (+detail; canonical BacklogPage wrapper, editable pills) | KEPT + key-normalize migration applied | C |
| G13 | Reports hub `/testhub/reports/:slug` — **all 26 wired reports, 0 fake** | KEPT in place + uplift: error branches, formula fixes, RPC adoption, +4 new reports | G |
| G14 | Filters `/testhub/filters` (+create, +preview) | KEPT alongside smart sets (ship-both doctrine, antipattern #7) | D |
| G15 | Admin pages ×4 (priorities, case-types, case-statuses, permissions) + test-ops | KEPT + environments/custom-fields/notifications/audit/AI-usage added (8-page plan) | H |
| G16 | Typed route builders `Routes.testHub.*`, slug/display-key URLs (`/testhub/TESTHUB/cycles/CYC-001`) | KEPT; folder slugs added (D2) | D |
| G17 | LTREE folder tree v1.3 (path, depth, case_count, circular guard) | KEPT — canonical tree backbone of Repository v2 | D |
| G18 | Test case versioning (tm_create_version_snapshot/restore/history RPCs, useTestCaseVersions, useAutoVersioning, versioning tab on CatalystViewTestCase) | KEPT + loop proven end-to-end (0-row tables today), executed-version pin indicator | D |
| G19 | AI case generation (`ai-generate-story-test-cases` edge fn: Gemini, sanitizer, max 10, priority/type reasoning) | KEPT + wired into Repository create flow + work-item context mode | D |
| G20 | Caty report narratives (`report-insights` edge fn on all 26 reports, deriveWiredAggregates) | KEPT + extended to the 4 new reports | G |
| G21 | Comments (useTmComments + tm_comments) | KEPT + proven live with mentions | H |
| G22 | Attachments (tm-attachments bucket, runner dropzone) | KEPT + step-level evidence, table consolidation (D6) | E, H |
| G23 | CSV + PDF export (16 lab slugs, table export) | KEPT + export menu on all 26 bodies + catch handlers | G |
| G24 | Saved report views (tm_saved_reports, is_shared, deep-link ?project=&range=) | KEPT + param completeness fix (sprint/tester/epic persisted) | G |
| G25 | Flaky test detection (useFlakyTestDetection.ts) | KEPT + surfaced: Command Center top-5 widget + Flaky report | G |
| G26 | Coverage gaps (useCoverageGaps + tm_get_coverage_gaps RPC) | KEPT + Command Center widget | G |
| G27 | Coverage history (useCoverageHistory; migration drifted) | KEPT + D1 migration applied → trend chart | C, G |
| G28 | Defect MTTR (useDefectMetrics + tm_get_defect_mttr) | KEPT (report remains in Incident Hub per council verdict; RPC reused for readiness) | G |
| G29 | Shared steps (useSharedSteps + cols + tm_step_definitions) | KEPT + real library UI (loop unproven today) | D |
| G30 | Tags/labels (useTestCaseTags + tm_labels/tm_case_labels) | KEPT + proven live + bulk-label op | D |
| G31 | Test data / data-row runs (useTestData, useCreateRunWithDataRows, useDataRowResults) | KEPT — **migrated off zombie test_* tables onto tm_ datasets (approval, D-rule)** — capability preserved, path modernized | E |
| G32 | Cascade engine (tm_step_results_percolate, cycle counters, status transition validation, scope UNIQUE guard) | KEPT verbatim — trigger-driven rollup is load-bearing | — |
| G33 | Release-counter sync (releases.test_cases_* / defects_* / coverage_percent / health_score trigger-synced) | KEPT verbatim — no competitor has this | — |
| G34 | Auto-defect trigger (trg_tm_auto_create_defect on run failure) | KEPT + surfaced in runner UX | E |
| G35 | Version pinning at scope-add + immutable step snapshots | KEPT + pin made visible in scope builder | E |
| G36 | Sprint linkage (cycle/defect sprint_id via ph_jira_sprints picker) | KEPT after D3 FK verification (ph_jira_sprints vs iterations — UNRESOLVED, probe first) | C |
| G37 | Requirement links coverage backbone (tm_requirement_links, 56 rows, external_key=issue_key) | KEPT — remains THE coverage mechanism | — |
| G38 | TestCoveragePanel on story + defect + incident detail (worst-of chain) | KEPT + extended to Feature/Epic rollup | F |
| G39 | Gherkin/BDD (gherkin cols, tm_gherkin_steps, convert_to_bdd, save_gherkin_scenario, step suggestions RPCs) | KEPT + Scenario authoring mode UI (schema-only today) | D |
| G40 | Keyboard-first runner (1/2/3/4 + Enter legend, no-steps fallback verdict, disabled-until-verdict Save) | KEPT verbatim — praised in UI probe | — |
| G41 | Dark mode (token-only, verified no white-glare) | KEPT; chart palette theme-awareness nit fixed | I |
| G42 | Formulas drawer (FORMULA_EXPLANATIONS source transparency) | KEPT + extended to new reports | G |
| G43 | Admin-driven priorities/case types/case statuses (tm_case_priorities/types) | KEPT; hardcoded severity + cycle-status vocab also moved to admin config | H |
| G44 | Execution history per case (useTestCaseExecutionHistory) | KEPT + results tab on case detail (append-only) | D |
| G45 | Release linkage per case (useTestCaseRelease, tm_test_cases.release_id, release_test_cycles) | KEPT — feeds Plans & Readiness | G |
| G46 | Multi-cycle comparison report + 9 cycle analytics RPCs | KEPT + switched from client-side joins to tm_compare_cycles RPC | G |
| G47 | Honest empty states + zero-assumption dashes (Sprint "—") | KEPT — codified as acceptance rule for every new screen | — |
| G48 | tm_next_entity_key display-key generator (TC/CYC/SET/DEF-###) | KEPT + dual-format normalization (TC-001 vs TC-0001) | C |
| G49 | Dashboard widgets in project-hub registry (TestCasesOverviewWidget, TestCyclesProgressWidget) | KEPT — Project Hub dashboards keep test widgets | — |
| G50 | Governance/mismatch report category (governance, approval-age) | KEPT — differentiator category, extended | G |
| G51 | ModuleGate k="testhub" gating + tm_user_has_access RLS | KEPT + RLS standardized (D4, approval) | H |
| G52 | 5 workflow maps incl. release-counter cascade verified live | KEPT — acceptance tests for rebuild phases | — |

**Guarantee: 52/52 rows KEPT or UPLIFTED. 0 dropped.**

---

## 2. FEATURE MATRIX BY DOMAIN

Columns: **Feature** · **Who has it** (owners among the 9 + CAT) · **Catalyst status** · **Beats-market-how** (blank = parity play).

### 2.1 Repository & Authoring (26)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Hierarchical folder repository | ALL, CAT | LIVE | LTREE-native: O(1) subtree ops at depths GUI trees choke on |
| One-case-one-folder doctrine (folders=functionality, never releases) | XR, AIO, CAT | LIVE | |
| Folder rollup counts (tm_folders_with_counts) | TR, QT, CAT | LIVE | |
| Folder coverage/execution rollup summary | QT | PLANNED-D | LTREE aggregate = coverage % per subtree, no competitor shows per-folder coverage |
| Virtualized tree (10k+ nodes, react-virtual) | TR (partial) | PLANNED-D | |
| Tree drag-drop move (pragmatic-dnd) | TR, QT, ZS, QA | PLANNED-D | |
| Tree keyboard navigation | QA (partial) | PLANNED-D | Full arrow/type-ahead nav — a11y no tool ships |
| Folder deep links (slug URLs, D2) | — (all use ids) | PLANNED-D | Human URLs for folders — unique |
| Folder context menu (new/rename/move/archive/export) | TR, QT, QA | PLANNED-D | |
| Inline title-only case add per folder (+Enter) | TR | PLANNED-D | TestRail-speed grid entry inside LTREE tree — combo nobody ships (benchmark §Unique #3) |
| Display keys TC-### (never UUIDs) | ZS, XR, PT, QA, CAT | LIVE\* (dual-format nit → C) | |
| ADF rich-text description | XR (Jira ADF), CAT | LIVE | Same editor as delivery work items — one authoring muscle |
| Steps: action / data / expected | ALL, CAT | LIVE | |
| Step reorder (tm_reorder_steps RPC) | ALL, CAT | LIVE (UI polish D) | |
| Step insert above/below, duplicate, delete | ALL, CAT | LIVE (v2 polish D) | |
| Bulk paste rows→steps parser | TR, QA | PLANNED-D | |
| Step editor keyboard flow (Tab/Enter), autosave-on-blur, dirty guard | TR (partial) | PLANNED-D | |
| Preconditions field | ALL, CAT | LIVE | |
| Admin-driven priorities/types/statuses | TR, PT, QA, CAT | LIVE | Vocab tables, not code constants |
| Case labels/tags + bulk label | ALL | PROTOTYPED → D (hook + tables, 0 rows) | |
| Case estimate field | TR, ZS | SCHEMA-READY → D | |
| Case owner (ProfilePicker) | ALL, CAT | LIVE | |
| System smart views (All, Unassigned, Recently updated, Needs review, No work-item link, Linked to current sprint) | PT (filters), QA | PLANNED-D | "Linked to current sprint" view — delivery-aware repository, nobody has it |
| Bulk ops: move/assign/status/label/link/archive (BulkFooterBar) | TR, QT | PLANNED-D | |
| Archive not hard-delete | TR, ZS, QT | PLANNED-D | |
| Clone/duplicate case (steps clone RPC + link carry) | ALL, CAT | LIVE | |

### 2.2 Scenarios / BDD (7)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Gherkin authoring mode on a case (no separate entity) | XR, ZS, QA | SCHEMA-READY → D (cols + tm_gherkin_steps + save_gherkin_scenario) | One entity, two modes — no Xray-style entity sprawl |
| Convert steps-case → BDD (tm_convert_to_bdd RPC) | XR | SCHEMA-READY → D | Server-side conversion RPC — Xray does this client-side |
| Step-definition suggestion library (autocomplete reuse) | XR | SCHEMA-READY → D | |
| Scenario grouping via tm_test_case_links | XR (test sets) | PLANNED-D | |
| Scenario badge + Repository filter chip | — | PLANNED-D | |
| Feature-file (.feature) export | XR, ZS | NEW-G | |
| Scenario coverage rollup into requirement coverage | XR | PLANNED-F | |

### 2.3 Sets & Smart Views (7)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Static test sets (many-to-many, hold no results) | XR, CAT | LIVE | |
| Smart sets (saved-query auto-membership, smart_query jsonb) | PT (dynamic filters) | SCHEMA-READY → D | Static + smart in one entity — Xray set ∪ PractiTest filter |
| Set→cycle push (tm_cycle_sets) | XR, AIO | SCHEMA-READY → D | |
| Set display keys SET-### | XR | LIVE\* (key-wrap nit → D) | |
| Set from requirement one-click | SP | NEW-F | |
| Sets AND saved filters shipped together (antipattern #7 avoided) | — (tools pick one) | LIVE + PLANNED-D | Both organizing models, deliberately |
| Set membership visible on case detail | XR | PLANNED-D | |

### 2.4 Plans & Release Readiness — gates / signoffs / waivers (14)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Test plan umbrella (release-scoped, groups cycles, rollup) | ZS, QT, PT, AIO | SCHEMA-READY → G (tm_test_plans, 39 cols, 2 rows, ZERO UI — biggest unlock) | |
| Plan scope + plan team (tm_plan_scope, tm_plan_team) | QT, PT | SCHEMA-READY → G | |
| Plan versions (tm_plan_versions) | — | SCHEMA-READY → G | Versioned readiness plans — unique |
| Plan stats/burndown/analytics RPCs | QT, TR | SCHEMA-READY → G | |
| **Release quality gates (threshold rules, evaluate RPC)** | **NOBODY** | SCHEMA-READY → G (tm_release_quality_gates + evaluate) | Native release-gate engine inside the test tool — category-defining |
| Gate templates (tm_gate_templates) | NOBODY | SCHEMA-READY → G | Reusable gate policies per org |
| **Gate waivers with reason capture** | NOBODY | SCHEMA-READY → G | Auditable waive-with-reason — compliance story no tool has |
| **Multi-role release signoffs (tm_release_signoffs + templates)** | NOBODY (PT has basic approvals) | SCHEMA-READY → G | QA/PO/Eng sign-off chain on the release itself |
| Readiness snapshots (tm_create_readiness_snapshot) | NOBODY | SCHEMA-READY → G | Point-in-time readiness audit trail |
| Readiness verdict chip on executive dashboard | NOBODY | NEW-G | |
| Release counters live-synced from execution (releases table) | NOBODY | LIVE | Release Hub shows test truth with zero ETL |
| Release health score (releases.health_score) | NOBODY | LIVE | |
| Plan↔release↔cycle binding (release_test_cycles junction) | ZS (versions), QT | SCHEMA-READY → G | |
| Plan naming = Zephyr semantics (Plan→Cycle→Run, no suite level) | ZS | PLANNED-G | Avoids qTest 4-level nesting + TestRail plan inversion |

### 2.5 Cycles & Timeline (16)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Time-boxed execution cycles | ALL, CAT | LIVE | |
| Cycle↔sprint binding | XR, ZS (via Jira) | LIVE\* (D3 FK verification → C) | Native sprint objects, not Jira-plugin indirection |
| Cycle↔environment | TR (configs), QT, PT | SCHEMA-READY → E (tm_environments empty; admin seed H) | |
| Cycle milestones (tm_cycle_milestones) | TR (milestones) | SCHEMA-READY → E | |
| Cycle planned dates (create-flow entry) | ALL | PLANNED-E | |
| Cycle/release timeline Gantt | AIO (partial) | PROTOTYPED → E (Timeline shell live; needs dates) | Release-timeline Gantt fed by cycle dates — kept per Vikram directive |
| Cycle display keys + slug URLs (CYC-###) | ZS | LIVE | |
| Cycle status lifecycle with DB transition validation | — (UI-only elsewhere) | LIVE | Server-enforced legal transitions |
| Cycle progress rollup (v_tm_cycle_progress, computed only) | ALL, CAT | LIVE | |
| Bulk add scope from folder / set / filter | TR, ZS, XR | LIVE (refactor E) | Three add-paths in one scope builder |
| Duplicate-scope guard (UNIQUE cycle_id,case_id) | QT | LIVE | |
| Executed-version pinning at scope-add | ZS | PROTOTYPED → E (trigger live; version rows unproven) | |
| Assignment view: group-by-assignee + workload (v_tm_execution_by_assignee) | QT, TR (To-Do) | SCHEMA-READY → E | |
| Run templates (tm_run_templates) | TR (configs) | SCHEMA-READY → E | |
| Daily execution targets | AIO | NEW-E | |
| Multi-cycle compare (tm_compare_cycles RPC + report) | AL (history), TR | LIVE\* (client-side → RPC in G) | |

### 2.6 Execution & Runner (18)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Dedicated runner with case rail | ALL, CAT | LIVE (probe: "genuinely good") | |
| Per-step verdicts + actual results (tm_step_results) | ALL, CAT | LIVE | |
| Keyboard-first execution (1/2/3/4 + Enter, visible legend) | QA (partial hotkeys) | LIVE | Fastest verdict entry in the market; legend on-screen |
| Execution timer | TR, CAT | LIVE | |
| Append-only run history (run_number, re-execution appends) | TR, ZS, CAT | LIVE | |
| Immutable step snapshots (case edit never mutates history) | ZS, CAT | LIVE | Enforced by trigger, not convention |
| No-steps fallback verdict | TR, CAT | LIVE | |
| Cascade rollup step→run→scope→cycle→**release** (trigger-driven) | — (all stop at cycle) | LIVE | Only tool whose rollup reaches the release object |
| **Server-side auto-defect on run failure (trg_tm_auto_create_defect)** | QA/AL (client prompt/rules only) | LIVE | DB trigger — works even for API-driven runs |
| Fail→defect prompt, prefilled case/step/cycle/env context | QA, XR, CAT | LIVE (prefill polish E) | |
| Link-existing-defect / link-incident from runner | QA | PLANNED-E | Incident link in-runner — nobody has an incident hub to link to |
| Attachments at run (dropzone) | ALL, CAT | LIVE | |
| Attachments at step result | XR, QT | PLANNED-E | |
| Run notes | ALL | PLANNED-E | |
| Next-case auto-advance + final run summary | TR | PLANNED-E | |
| Data-driven runs (datasets / parameterized rows) | XR (datasets), QT | PROTOTYPED → E (hooks live on legacy test_* path; migrate to tm_datasets — approval, blueprint D-rules) | |
| Execution history per case (useTestCaseExecutionHistory) | TR, PT, CAT | LIVE | |
| Cycle progress in runner header | TR | PLANNED-E | |

### 2.7 Evidence & Attachments (6)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Central evidence storage (tm-attachments bucket) | ALL, CAT | LIVE | |
| Attach at case / run / defect | ALL, CAT | LIVE | |
| Attach at step result | XR, QT | PLANNED-E | |
| Screenshot paste-from-clipboard in runner | TR, QA | NEW-E | |
| Evidence gallery on run summary | AL | NEW-E | |
| Attachment family consolidation (tm_attachments vs tm_test_attachments) | — internal | PLANNED-H (D6, approval) | |

### 2.8 Defects (15)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Native defect entity with own keys (DEF-###) | PT, SP, QA (others delegate to Jira) | LIVE (tm_defects, 50 cols) | Native AND delivery-linked — not either/or |
| ADF rich fields (description/expected/actual) | — (plain text elsewhere) | LIVE | |
| Severity taxonomy blocker→trivial | ALL, CAT | LIVE | |
| **Workflow-studio-driven defect statuses (workflow_status_key + reason capture)** | NOBODY | LIVE | Org-configurable defect workflow engine, not a fixed enum |
| Source context cols (source_test_run/case/plan_id) | QA, XR, CAT | LIVE | |
| Auto-created flag + trigger | AL (rules) | LIVE | |
| Auto tm_defect_links rows on execution (link_source='auto_execution') | — | LIVE | Zero-click traceability defect→case/run/cycle/plan/release/requirement |
| Defect↔work-item parenting (parent_key, epic_link) | XR (Jira links) | LIVE | Defect sits inside the delivery hierarchy |
| Defect status history | TR (history) | PLANNED-C (D1 drifted migration) | |
| **Defect MTTR metric (tm_get_defect_mttr)** | NOBODY (test tools) | LIVE | Ops-grade MTTR inside the test module |
| Canonical list/detail (BacklogPage wrapper, editable status pills) | — | LIVE | Same table UX as delivery backlog |
| Defect key normalization (DEF-002 vs DEF-00001) | — | PLANNED-C (D1) | |
| Defect density / summary / impact / trend / closure-trend reports | ALL (subset) | LIVE\* (casing fix → G) | 5 defect reports out of the box |
| Sprint dimension on defects (sprint_id) | — | LIVE | |
| Defect raised via canonical CreateStoryModal QA-Bug path | — | LIVE | One create modal across delivery + test |

### 2.9 Incident / Prod-Incident Integration (9) — **no competitor has an incident hub at all**

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Regression-coverage panel on incident detail (TestCoveragePanel mode='incident') | NOBODY | LIVE | Ships today |
| "Link test case" write path on incident | NOBODY | PLANNED-F (tm_requirement_links, external_key=INC key; zero DDL) | |
| **"Create validation cycle" from incident** (regression scope from linked cases) | NOBODY | PLANNED-F | Incident-driven regression testing as a first-class flow |
| Defect→incident escalation (tm_defect_links type='incident' + reciprocal incident_work_items) | NOBODY | SCHEMA-READY → F (zero DDL, CRE-sanctioned route) | |
| Validation status surfaced back on incident panel | NOBODY | PLANNED-F | |
| Sev-1 defect → optional incident creation | NOBODY | PLANNED-F | |
| Defect leakage report (test-found vs prod-found via ph_issues Production Incident) | NOBODY (AL has failure matching, not prod linkage) | NEW-G (feasible now — reports probe) | Leakage measured against real production incidents, not tags |
| Cycles filterable by linked incident (TestHub side reciprocal) | NOBODY | PLANNED-F | |
| CRE-governed link rules (banned pairs C1/C3 enforced by lint:cre) | NOBODY | LIVE | Machine-enforced linkage governance |

### 2.10 Work-Item Traceability & Coverage (15)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Requirement↔case links (tm_requirement_links, 56 live rows) | ALL, CAT | LIVE | |
| Coverage panel on story detail | XR (issue coverage), CAT | LIVE | |
| Coverage panel on defect AND incident detail | NOBODY | LIVE | Three-surface coverage read |
| Worst-of status coverage chain (links→cases→scope status→defects) | XR, QT | LIVE | |
| Traceability matrix page (v_tm_requirement_coverage — one engine) | ALL | LIVE\* (narrow → F rebuild) | |
| Live work-item join (status, type icon, clickable keys) | XR | PLANNED-F | |
| **Coverage scope parameter (latest \| release \| plan \| cycle)** | XR only | NEW-F | Xray's killer feature + plan-gate integration Xray lacks |
| OK / NOK / NOT RUN / UNCOVERED computed coverage status | XR | PLANNED-F | |
| Explicit SQL coverage predicates (covered = all linked approved; executed = all instances run) | QT (formulas) | PLANNED-F | Predicates documented in formulas drawer — auditable coverage math |
| Coverage-gap detector (tm_get_coverage_gaps) | NOBODY (manual filters elsewhere) | LIVE | |
| Coverage history trend | NOBODY | PROTOTYPED → C/G (hook live, D1 migration drifted) | Coverage % over time — unique |
| Full RTM req→case→run→defect (tm_get_traceability_matrix RPC) | QT, SP | SCHEMA-READY → F (RPC unused today) | |
| Create-test-case from story (CRE-safe, gate-file registered) | XR, ZS | PLANNED-F | |
| Feature/Epic coverage rollup (parent_key) | NOBODY | PLANNED-F | Coverage at epic altitude |
| Stories-with-tests release counter | NOBODY | LIVE | |

### 2.11 Dependencies & Graph (5)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Dedicated test dependencies surface (xyflow diagram) | NOBODY | LIVE\* (UUID-title fix → F) | Only test tool with a dependency graph page — kept per directive |
| Coverage graph req→case→run→defect (typed nodes, key-titled) | NOBODY | PLANNED-F | |
| Accessible list fallback for graphs | NOBODY | PLANNED-F | |
| Cross-entity hover previews (IssueHoverCard) | — | PLANNED-F | |
| Graph reuse across Dependencies page + Traceability tab (one engine) | — | PLANNED-F | |

### 2.12 Boards & Filters (7)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Test kanban board (canonical KanbanPage mode='test') | QA (partial) | LIVE\* (wrong-empty; rebind to real statuses → H) | Kept per Gate B directive |
| Board bound to workflow-studio statuses | NOBODY | PLANNED-H | Config-driven board columns |
| Saved filters (list + create + preview pages) | PT, TR, QA | LIVE | |
| Filter builder page (CreateFilterPage pattern) | PT | LIVE | |
| Toolbar quick filters → query | ALL | LIVE | |
| Filters and smart sets coexist | — | PLANNED-D | |
| Filter deep-links (`:filterId` param — resolve slug question) | — | LIVE\* (slug audit → C) | |

### 2.13 Reports & Analytics — all 26 today + 4 new (32)

All 26 registry entries verified wired, zero fake (evidence/06). Fate of each:

| Report (slug) | Who has equivalent | Status | Beats-market-how / uplift |
|---|---|---|---|
| execution-overview | ALL | LIVE | Keep |
| execution-summary | ALL | LIVE | Keep |
| execution-burndown | TR, QT | LIVE\* → G | Fix ideal-line calendar-day slope |
| execution-burnup | QT | LIVE | Keep |
| execution-distribution | ALL | LIVE\* → G | Merge with execution-overview (identical selector) |
| execution-history | TR | LIVE\* → G | Lift 100-row cap |
| case-distribution | ALL | LIVE | Keep |
| case-usage | TR | LIVE | Keep |
| defect-summary | ALL | LIVE\* → G | Fix 'Done' casing split-brain + error check |
| defect-impact | PT | LIVE | Keep |
| defect-trend | ALL | LIVE | Keep |
| defect-closure-trend | PT, QT | LIVE\* → G | Destructure fix |
| multi-cycle-comparison | TR, AL | LIVE\* → G | Switch to tm_compare_cycles RPC |
| multi-cycle-summary | TR | LIVE | Keep |
| multi-cycle-detail | TR | LIVE | Keep |
| multi-cycle-distribution | TR | LIVE | Keep |
| project-testing-status | QT (Insights) | LIVE\* → G | Add export |
| product-status | NOBODY (delivery-joined) | LIVE\* → G | Fix hardcoded {0,0,0} defect cards (zero-assumption violation) |
| sprint-testing-status (default report) | NOBODY (sprint via ph_issues join) | LIVE\* → G | Delivery+test unified sprint view; fix saved-view params + scan cost |
| points-burndown | NOBODY (story points in a test tool) | LIVE\* → G | Destructure fix |
| tester-performance | TR, QT | LIVE\* → G | Fix executed_by attribution + workload RPC |
| team-performance | QT | LIVE\* → G | Same attribution fix |
| governance | NOBODY | LIVE | Governance/mismatch category — differentiator, preserve |
| approval-age | NOBODY | LIVE | Stale-approval aging — unique |
| traceability-summary | ALL | LIVE\* → G | Reformulate on v_tm_requirement_coverage (true req-coverage %) |
| traceability-detail | QT, SP | LIVE | Keep |
| **NEW: pass/fail rate trend** | TR, AL | NEW-G (data already fetched) | |
| **NEW: defect leakage (test-found vs prod-incident)** | NOBODY | NEW-G | Real prod-incident join |
| **NEW: flaky cases** | AL (flaky detection) | PROTOTYPED → G (useFlakyTestDetection exists) | Flaky detection over manual+data runs, not just automation |
| **NEW: Risk & Readiness category (gates/waivers/signoffs per plan)** | NOBODY | SCHEMA-READY → G | The release-decision report no tool can build |
| Caty AI narrative on every report (report-insights edge fn) | NOBODY | LIVE | AI insight on all 26/30, not a bolt-on dashboard |
| Formulas drawer (source-transparent math) | NOBODY (QT partial) | LIVE | Every number explains itself |

Report engine platform rows (counted here): registry+renderer+boundary pattern KEPT; error-branch P1 fix all 10 dedicated bodies (PLANNED-G); 6 banned destructure fixes (PLANNED-G); casing normalization helper (PLANNED-G); RPC/view adoption for scale (PLANNED-G); 4 orphaned lab defs killed (PLANNED-G). **+6 platform rows = 38 total in this domain.**

### 2.14 Dashboards / Command Center (10)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| TestHub Command Center (DashboardWidgetGrid + registry) | QT Insights, PT dashboards | LIVE\* (FK crash → C; rebuild → G) | |
| Readiness strip (plans w/ gate verdicts) | NOBODY | NEW-G | Release go/no-go on the landing screen |
| Active cycles with progress bodies | ALL | LIVE\* (header-only widget → G) | |
| My pending runs widget | TR (To-Do) | PLANNED-G (v_tm_my_work) | |
| Coverage % widget (scoped) | XR | PLANNED-G | |
| Open defects by severity widget | ALL | PLANNED-G | |
| Flaky top-5 widget | AL | PLANNED-G (hook exists) | |
| Layout persistence (dashboard_widget_config) | QT, PT | LIVE\* (FK fix → C) | |
| Test widgets on Project Hub dashboards (cross-hub) | NOBODY | LIVE | Test health inside the delivery dashboard |
| Zero-console-error + honest-empty acceptance per widget | — | PLANNED-G (acceptance rule) | |

### 2.15 Collaboration (8)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Comments on test entities (useTmComments + tm_comments) | ALL | PROTOTYPED → H (hook live, 0 rows) | |
| @Mentions in comments | TR, QA, PT | NEW-H | |
| Watchers on case/cycle/defect (WatchersChip via ViewBase) | QA (subscribers) | LIVE (detail views) | |
| Activity feed on detail (CatalystActivitySection) | ALL (audit trails) | LIVE | |
| Shared saved reports (tm_saved_reports.is_shared + RLS) | TR, QT | LIVE | |
| Presence (who's viewing/executing) | NOBODY | NEW-I | Live presence in a test tool — unique |
| Assignment handoff notes (run notes) | TR | PLANNED-E | |
| Description ADF collaborative editing surface | — | LIVE (CatalystDescriptionSection) | |

### 2.16 Versioning & Audit (10)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Case version snapshots (tm_create_version_snapshot) | TR (history), ZS (versions), QT | PROTOTYPED → D (RPCs+triggers+UI tab live; 0 rows — loop unproven) | |
| Auto-versioning on save (useAutoVersioning) | ZS | PROTOTYPED → D | |
| Version restore (RPC) | TR | PROTOTYPED → D | |
| Version history viewer (CatalystViewTestCase tab) | ZS, TR | PROTOTYPED → D | |
| Version diff view | TR (partial) | NEW-D | Side-by-side step diff |
| Executed-version pinning (scope stores pinned version) | ZS | PROTOTYPED → E | |
| Plan versions | NOBODY | SCHEMA-READY → G | |
| Immutable step-result snapshots | ZS | LIVE | |
| Audit log (tm_audit_log, tm_audit_action enum) | PT, QT, TR (enterprise) | LIVE\* (dup-table consolidation D6 → H; surfacing → H) | |
| Audit surfaced on detail activity tabs | PT | PLANNED-H | |

### 2.17 Notifications (6) — all NEW-H (D5 approval: no notification infra exists today; tm_notification_type enum orphaned)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Assignment notifications (case/scope/run assigned to you) | ALL | NEW-H | |
| Run-failure alerts (watched cycles) | QA, AL | NEW-H | |
| **Gate-breach / readiness-change alerts** | NOBODY | NEW-H | Release-gate alerting — no competitor has gates |
| Signoff-request notifications | NOBODY | NEW-H | |
| Digest (daily cycle progress) | TR (email reports) | NEW-H | |
| Per-user notification settings page | ALL | NEW-H | |

### 2.18 Admin & Config (10)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Priorities admin page | TR, PT, QA, CAT | LIVE | |
| Case types admin page | TR, PT, QA, CAT | LIVE | |
| Case statuses admin page | TR, PT, CAT | LIVE | |
| Permissions admin page | ALL, CAT | LIVE | |
| Test-ops admin surface | — | LIVE | |
| Environments admin (tm_environments) | TR (configs), QT | SCHEMA-READY → H (table empty) | |
| Custom fields | ALL | NEW-H | |
| Notification settings admin | ALL | NEW-H | |
| Audit viewer admin page | PT, QT | PLANNED-H | |
| AI usage log admin (tm_ai_usage_log) | NOBODY | SCHEMA-READY → H | AI governance/audit page — unique |

### 2.19 Permissions / RBAC (7)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Project-scoped access RPC (tm_user_has_access) in RLS | ALL (app-tier) | LIVE | Row-level DB enforcement, not app-tier-only |
| Module gating (ModuleGate k="testhub") | — | LIVE | Org-level module visibility |
| tm_roles / tm_permissions model | ALL | LIVE\* (writable-by-any-authed defect → D4 fix, H, approval) | |
| RLS standardization across plans/gates/signoffs | — | PLANNED-H (D4, approval; signoffs currently public-true) | |
| Persona permission matrix (tester/lead/manager/viewer) | ALL | PLANNED-H | |
| CRE creation rights (TESTHUB creates QA Bug/Test Case/Test Cycle only) | NOBODY | LIVE | Lint-enforced creation governance |
| tm_user_roles per-project (useTmUserRoles) | QT, PT | LIVE | |

### 2.20 AI — CATY (11)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| AI test-case generation from prompt (Gemini edge fn, server sanitizer, max-10 guard) | QA (AIDEN), TR (partial), XR (beta) | LIVE | Server-side sanitizer + hard cap = governed generation |
| Generation with priority/type reasoning fields (priorityReason/typeReason) | NOBODY | LIVE | Explainable AI suggestions |
| Generation from work-item context (story ADF → cases) | QA (partial) | PLANNED-D (edge fn is prompt-mode today; story-context wiring in create flow) | Grounded in the actual delivery item, same DB |
| Coverage-area + suggested-additional-tests metadata | NOBODY | LIVE | Generation tells you what it did NOT cover |
| Caty AI narrative on every report (report-insights) | NOBODY (QT Insights ≠ narrative) | LIVE | |
| TestHub insights (useTestHubInsights) | — | LIVE | |
| Flaky detection (status-flip analysis) | AL | LIVE (hook) → surfaced G | |
| AI run summarization (cycle close-out narrative) | NOBODY | NEW-G | |
| AI coverage-gap suggestions ("these stories lack cases") | NOBODY | NEW-H (builds on tm_get_coverage_gaps) | |
| AI duplicate-case detection | QA (partial) | NEW-H+ | |
| AI usage logging/governance (tm_ai_usage_log + ai_usage_log pattern) | NOBODY | SCHEMA-READY → H | Auditable AI usage — enterprise trust |

### 2.21 Import / Export & API (8)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| CSV export (reports, 16 slugs) | ALL | LIVE | |
| PDF export | TR, PT, QT | LIVE | |
| Export on all report bodies + catch handlers | ALL | PLANNED-G (5 bodies missing today) | |
| Traceability matrix CSV export | QT, SP | PLANNED-F | |
| CSV case import | ALL | NEW-D | Must-have parity — justified gap until D |
| Feature-file export | XR, ZS | NEW-G | |
| Competitor migration importers (TestRail/Xray XML) | TR, QA, PT (importers) | NEW-H+ | |
| API surface (87 tm_ RPCs + PostgREST + RLS) | ALL (REST APIs) | LIVE (docs/hardening H) | SQL-grade API with row-level security built in |

### 2.22 Platform (12)

| Feature | Who has it | Status | Beats-market-how |
|---|---|---|---|
| Dark mode (token-only, verified no white-glare) | QA, AL (others partial/none) | LIVE | ADS-token purity by construction |
| Chart palette dark-theme awareness | — | PLANNED-I (theme-blind nit) | |
| Keyboard-first runner + step editor keyboard flow | QA (partial) | LIVE / PLANNED-D | |
| Table virtualization (JiraTable react-virtual) | TR (partial) | LIVE (capability) → applied D | 10k-case repository stays 60fps |
| Responsive narrow mode (right rail hides — ProjectAllWorkView precedent) | — (desktop-only tools) | PLANNED-I | |
| Mobile-responsive execution runner | NOBODY (native apps aside) | NEW-I | Run tests from a phone in the web app |
| Offline execution queue (verdicts buffered, sync on reconnect) | NOBODY | NEW-I | Field/UAT testing without connectivity |
| Display-key + slug URLs everywhere (no UUIDs) | ZS | LIVE | |
| Honest empty states + zero-assumption rendering | — | LIVE (codified acceptance rule) | A dash never lies |
| Error boundaries + SectionMessage/Retry on every fetch | — | PLANNED-G (P1 sweep) | |
| Perf: RPC/view adoption over client joins (3× ph_issues scan fix) | — | PLANNED-G | |
| a11y pass (WCAG on tree/matrix/runner) | — (weak across market) | PLANNED-I | |

**Domain row totals**: 2.1=26 · 2.2=7 · 2.3=7 · 2.4=14 · 2.5=16 · 2.6=18 · 2.7=6 · 2.8=15 · 2.9=9 · 2.10=15 · 2.11=5 · 2.12=7 · 2.13=38 · 2.14=10 · 2.15=8 · 2.16=10 · 2.17=6 · 2.18=10 · 2.19=7 · 2.20=11 · 2.21=8 · 2.22=12 → **265 rows**.

---

## 3. DIFFERENTIATORS — Features NO Competitor Has (evidence-backed, not vapor)

| # | Differentiator | Proof it's real |
|---|---|---|
| D-1 | **Native release quality-gate readiness** — gates, templates, waivers, signoffs, readiness snapshots wired to real releases | Tables `tm_release_quality_gates`, `tm_gate_templates`, `tm_release_signoffs`, `tm_signoff_templates` + evaluate/waive/readiness/signoff RPC family (evidence/02 §RPC families); `releases` table carries total_gates/passing_gates/health_score, trigger-synced today |
| D-2 | **Defect→incident escalation with validation cycles** — defect links to a real Production Incident, incident spawns a regression validation cycle, status flows back | `tm_defect_links` loose polymorphic link (20260703083947), `incident_work_items`, TestCoveragePanel mode='incident' SHIPPING at IncidentDetailPage line 107 (evidence/05); CRE-sanctioned route avoiding banned pair C3 |
| D-3 | **Release-object cascade** — step verdict percolates to release counters with zero ETL | `tm_step_results_percolate` + cycle counter triggers + releases.test_cases_passed/…/coverage_percent verified live (evidence/02 §Cascade) |
| D-4 | **Server-side auto-defect on failure** | `trg_tm_auto_create_defect` trigger, live on staging (evidence/02) |
| D-5 | **CATY AI generation with explainability + governance** — priority/type reasoning, coverage-area metadata, server sanitizer, usage log | `useAIGeneration.ts` typed contract (priorityReason, coverageAreas, suggestedAdditionalTests), `ai-generate-story-test-cases` edge fn, `tm_ai_usage_log` table |
| D-6 | **AI narrative on every report** | `report-insights` edge fn + deriveWiredAggregates across all 26 registry entries (evidence/06) |
| D-7 | **Governance mismatch reports** (governance, approval-age) | Registry category 'Governance', both wired (report-registry.ts:256-268) |
| D-8 | **Delivery+test unified reporting** — sprint-testing-status, product-status, points-burndown join ph_issues/ph_jira_sprints/ph_issue_status_history live | evidence/01 §Data access: "Reports cross-read delivery tables"; sprint_release JSONB linkage on ph_issues (62 cols, evidence/02) |
| D-9 | **LTREE repository + TestRail-speed inline authoring combo** | LTREE v1.3 live on tm_folders.path (evidence/02); inline add designed on JiraTable renderGroupInlineRow (canonical prop exists, evidence/04) — benchmark §Unique #3: "combination nobody ships" |
| D-10 | **Workflow-studio-driven statuses** — defect (and later case/cycle) statuses from the org workflow engine with reason capture | tm_defects.workflow_status_key live; StatusLozengeDropdown workflow-aware w/ ReasonCaptureModal (evidence/04); WF_REASON_REQUIRED pattern shipped (workflow-studio feature, memory) |
| D-11 | **Defect MTTR inside the test module** | `tm_get_defect_mttr` RPC + useDefectMetrics.ts, live |
| D-12 | **Coverage-gap detector + coverage history trend** | `tm_get_coverage_gaps` RPC + useCoverageGaps.ts live; useCoverageHistory.ts + committed migration (D1 apply) |
| D-13 | **Test dependency graph surface** | TestHubDependenciesPage + xyflow DependenciesDiagram, live route (evidence/03: "dependencies: real link") |
| D-14 | **CRE machine-enforced linkage/creation governance** | CatalystRules.ts Grid C banned pairs, `npm run lint:cre` blocking, chokepoint gate file (evidence/05) |
| D-15 | **Release/cycle timeline for releases** (Vikram-named must-keep) | TestHubTimelinePage live shell + shared TimelineView; cycles gain dates Phase E; release_test_cycles junction exists |

---

## 4. COVERAGE SCORECARD vs EACH COMPETITOR

Rule: **"They have, we lack" must be empty or phase-justified.** Every gap below carries a phase → therefore at rebuild completion (end Phase I) the they-have-we-lack column is **zero across all nine tools**, while we-have-they-lack stays long. That is the "beats every tool" proof.

| Tool | They have, we lack today (ALL phase-justified) | Count | We have, they lack (selected; see §3 for full) |
|---|---|---|---|
| **Xray** | Coverage scope param (NEW-F) · feature-file export (NEW-G) · dataset-driven runs on modern path (PROTOTYPED→E) · BDD authoring UI (SCHEMA-READY→D) · CI/automation result ingestion (NEW-H+) | 5 | Release gates/signoffs/waivers · incident hub + validation cycles · release-counter cascade · MTTR · governance reports · AI narrative all reports · workflow-studio statuses · delivery-unified sprint reports · dependency graph page · CRE governance |
| **TestRail** | Inline title-only add (PLANNED-D) · CSV import (NEW-D) · bulk paste steps (PLANNED-D) · milestones UI (SCHEMA-READY→E) · run configs/templates UI (SCHEMA-READY→E) · To-Do view semantics (PLANNED-E) · email digests (NEW-H) | 7 | LTREE repository · ADF editing · release gates · incident integration · auto-defect trigger · coverage-gap detector · AI generation w/ reasoning · dark mode token purity · RLS-enforced API · delivery+test joins |
| **Zephyr Scale** | Case versioning loop proven (PROTOTYPED→D) · executed-version pin visible (PROTOTYPED→E) · plan UI (SCHEMA-READY→G) · feature-file export (NEW-G) | 4 | Everything outside Jira's box: native incident hub, release gates, MTTR, governance reports, dependency graph, AI narrative, workflow-studio statuses, keyboard runner, dashboards w/ delivery joins |
| **qTest** | Coverage predicates surfaced (PLANNED-F) · full RTM screen (SCHEMA-READY→F) · Insights-style BI dashboards (PLANNED-G Command Center) · custom fields (NEW-H) · automation scheduling (NEW-H+) | 5 | No 4-level nesting (2 containers by design) · release gates · incident validation cycles · AI generation+narrative · LTREE speed · trigger cascade to release · CRE governance · honest zero-assumption rendering |
| **PractiTest** | Dynamic-filter smart views UI (SCHEMA-READY→D) · exploratory/charter type (PLANNED-D config row) · audit surfacing (PLANNED-H) · custom fields (NEW-H) | 4 | Native delivery platform (same DB as stories/sprints/releases) · release gates+signoffs · incident hub · AI suite · dependency graph · keyboard runner · dark mode |
| **Qase** | Fail→defect prompt polish (LIVE, uplift E) · @mentions (NEW-H) · screenshot paste (NEW-E) · shared steps UI (PROTOTYPED→D) | 4 | Server-side auto-defect trigger (theirs is client prompt) · release readiness engine · traceability to real work items/incidents · governance reports · delivery-joined analytics · LTREE scale |
| **Allure TestOps** | Flaky surfacing (PROTOTYPED→G) · evidence gallery (NEW-E) · automation-result ingestion pipeline (NEW-H+) · failure-matching defect rules (LIVE trigger ≈ parity; rule-config NEW-H+) | 4 | Manual+data execution depth · release gates/signoffs · incident hub · requirement traceability w/ scope · plan umbrella · admin-driven vocab · AI narrative on manual reports |
| **SpiraTest** | Set-from-requirements one-click (NEW-F) · custom fields (NEW-H) · built-in importers (NEW-H+) | 3 | Modern UX (virtualized, keyboard, dark) · AI suite · release gates · incident validation · trigger cascade · delivery-unified reports · governance category |
| **AIO Tests** | Daily execution targets (NEW-E) · folders-vs-cycles doctrine (LIVE — parity) · Jira-native distribution (N/A — Catalyst IS the platform) | 2 | Everything platform-level: own DB, RLS API, release gates, incidents, AI, 26+4 reports, dependency graph, plans w/ signoffs |

**Gap math**: total they-have-we-lack instances = 38, of which 38/38 carry a phase (D×8, E×9, F×3, G×6, H×6, H+×5, LIVE-parity/N-A×2 noted inline). Zero unjustified gaps. We-have-they-lack: 15 differentiator families (§3) apply against every tool; per-tool lists above are non-exhaustive selections.

---

## 5. HONESTY RULES (binding on every future edit of this file)

1. **Schema-ready ≠ shipped.** A table/RPC with zero UI is SCHEMA-READY, never LIVE. Plans, gates, signoffs, environments, milestones, run templates are SCHEMA-READY today — the readiness engine is real schema (evidence/02) but has ZERO UI until Phase G ships.
2. **PROTOTYPED means the loop is unproven.** Versioning (0 rows in both version tables), comments (0 rows), tags (0 rows), shared steps (tm_step_definitions empty), data-row runs (zombie test_* path), coverage history (drifted migration) — code exists, end-to-end proof does not. They stay PROTOTYPED until a verified round-trip on staging.
3. **LIVE\* declares its defect.** Board (wrong-empty), dashboard (FK crash), 7 reports with formula/casing defects, dual key formats — shipped AND broken is stated as both.
4. **Anything absent from schema AND code is NEW with a phase.** Notifications, custom fields, CSV import, offline queue, mentions, presence, feature-file export, importers, AI run-summary/dedup. No exceptions.
5. **No fabricated capabilities.** Every LIVE claim traces to evidence/01–08, a named file, a named table/RPC, or the 2026-07-04 UI probe. Every competitor claim traces to the benchmark probe (evidence/08) or vendor documentation. "Gartner-ranked" is NOT claimable (evidence/08 §Gartner) — "Gartner-level quality bar" is the permitted phrasing.
6. **Zero-assumption rendering applies to this document**: where a fact is unresolved (sprint FK target D3, `:filterId` slug status), the row says UNRESOLVED/verify — it does not pick a flattering answer.
7. **Status can only move via evidence.** PROTOTYPED→LIVE requires a verified staging round-trip logged in 06_VALIDATION_EVIDENCE.md; PLANNED/NEW→LIVE requires the phase's gate acceptance (screenshots + validation output per COMMIT GATE).

---

*Contract owner: CAT-TESTHUB-REBUILD-20260704-001. This matrix is the acceptance baseline for "industry #1": Section 1 guarantees no regression of Catalyst capability; Section 4 must show zero unjustified competitor gaps at each phase gate; Section 3 items must each retain their schema/code evidence citation as they ship.*
