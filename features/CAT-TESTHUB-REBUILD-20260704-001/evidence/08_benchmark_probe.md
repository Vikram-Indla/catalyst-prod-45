# Evidence — Benchmark Research Probe (2026-07-04, official docs cited in agent transcript)

## GARTNER VERIFICATION
No current publicly citable Gartner MQ for test management. Old Software Test Automation MQ discontinued (last 2019-11-25). Nearest: first MQ for AI-Augmented Software Testing Tools (2025-10-06; Leaders Tricentis/OpenText/Keysight/UiPath) — NOT a manual test-management ranking; Xray/TestRail/PractiTest/Qase not positioned. **"Gartner-level quality bar" = permissible phrasing; "Gartner-ranked" = NOT supportable.**

## COMMON CORE (all serious tools share)
1. Case library separate from execution (executing never mutates case).
2. Three roles: Definition (case) → Planned instance (scope/instance) → Result event (immutable, append-only, per-step).
3. Time-boxed execution container (cycle) bound to release/sprint/environment.
4. Umbrella tracking object (plan/milestone) with rollup.
5. Pass/Fail/Blocked/WIP/Not-Run; step→run→container rollup computed.
6. Evidence at run+step level; inline defect raise with inherited context.
7. Requirement traceability → coverage %, RTM, per-requirement status.
8. Signature reports: cycle progress, requirement coverage, defect density, tester workload, RTM.

## KEY DIFFERENTIATORS
- **Xray**: coverage as computed status (OK/NOK/NOT RUN/UNCOVERED) with SELECTABLE ANALYSIS SCOPE (latest|version|plan|environment). Folder-vs-set doctrine: case in exactly 1 folder, many sets; "no execution semantics in repository tree".
- **TestRail**: title-only inline case entry (+Enter) = spreadsheet-speed authoring; append-only result history; config-matrix run generation; To-Do view.
- **Zephyr Scale**: cleanest naming Plan→Cycle→Execution; entities with own keys OUTSIDE issue tracker (validates Catalyst tm_*+ph_issues split); case versioning with executed-version pinning.
- **qTest**: coverage predicates as explicit formulas (covered=all linked approved; executed=all instances run) — SQL-able; link propagation req↔case→runs/defects.
- **PractiTest**: Test→Instance→Run separation (= tm_cycle_scope/tm_test_runs); saved dynamic filters complement; exploratory charter test type.
- **Qase**: fail→defect prompt with inherited context. **Allure**: failure-matching defect rules. **SpiraTest**: set-from-requirements one-click. **AIO**: "folders=functionality, cycles=time" doctrine; daily execution targets.

## ANTIPATTERNS
1. Execution semantics in repository tree. 2. 4-level execution nesting (qTest Release→Cycle→Suite→Run) — 2 containers max. 3. Overloaded "Plan" (TestRail inversion) — use Zephyr meaning. 4. Everything-as-an-issue (Xray noise). 5. Fabricated coverage defaults. 6. Report sprawl (70 canned < 8 signature). 7. Filters-only OR folders-only — ship both.

## RECOMMENDED CATALYST MODEL
Schema already industry-consensus shape ≈ Zephyr architecture + Xray coverage engine + TestRail authoring speed.
- Test Space: 5-tab nav Repository|Sets|Plans|Cycles|Reports; display keys never UUIDs.
- Repository: LTREE canonical tree, 1 folder/case, folders=functionality; master-detail (tree left, JiraTable right); TestRail-style inline title-only add per folder.
- Case: one entity, 2 authoring modes (steps | Gherkin); later: shared steps, versioning w/ executed-version pinning (partially exists), exploratory type.
- Sets: many-to-many organizer (static=Xray set, smart=PractiTest filter); NOT execution containers, hold no results.
- **Plan vs Cycle: KEEP BOTH, Zephyr semantics** — tm_test_plans = release/readiness umbrella (links releases + quality gates/signoffs — Catalyst differentiator no benchmark tool has); tm_test_cycles = time-boxed container → scope → runs → step_results. NO suite level. Cycle↔sprint, Plan↔release.
- Scope=planned pointer, run=event, re-execution appends (never overwrite).
- Runner: step list w/ per-step status, actual-result, evidence run+step, fail→defect prompt prefilled (tm_defects+tm_defect_links; optional incident for sev-1). Rollup computed only.
- Coverage: explicit SQL predicates + Xray-style scope parameter (latest|release|plan|cycle); OK/NOK/NOT RUN/UNCOVERED; unknown renders dash.
- Reports: 8 signature not 80: Cycle progress, Plan readiness (gate-aware), Requirement coverage (scoped), RTM (req→case→run→defect), Defect density, Flaky/re-run history, Tester workload, Execution trend.

## Unique Catalyst opportunities vs market
1. Native release quality-gate/signoff integration into Plan readiness (schema already has tm_release_quality_gates/signoffs/readiness + RPCs).
2. Defect→incident escalation link (no competitor has native incident hub).
3. TestRail-speed grid entry inside LTREE repository — combination nobody ships.
