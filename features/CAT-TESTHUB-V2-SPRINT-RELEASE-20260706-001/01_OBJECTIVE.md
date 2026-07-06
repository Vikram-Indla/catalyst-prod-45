# 01_OBJECTIVE — CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001

## Feature name
TESTHUB-V2-SPRINT-RELEASE

## What we are building
Rebuild Test Hub into an enterprise-grade, sprint-and-release-integrated, AI-assisted QA/UAT module native to Catalyst. Locked scope = user mental model in
`/Users/vikramindla/Downloads/catalyst_test_module_v2_sprint_release_package 2/` (V2 package). No drift, no simplification.

## Why
Current TestHub is below the enterprise bar (cramped surfaces, weak traceability, no sprint/release quality gates). Sprint and Release must become first-class quality control planes so signoff decisions consume real test health.

## Non-negotiables
- **UI/UX is 80% of acceptance.** Premium Jira/Zephyr/TestRail-class quality using Catalyst canonical components + Project module standards. No banned side drawers. Full-page surfaces for Test Case, Test Plan, Test Execution, Cycle Run, Traceability, Dependencies, Reports. Modals only for compact actions. RTL/Arabic proof required.
- **Locked object model:** Repository → Folder → Test Case (Functional/UAT/Regression; Manual/AI/Hybrid) → immutable Test Case Version → Test Plan (curated references) → Test Execution (lab, snapshot-based, tied to Sprint/Release/Project/Product/BR/custom) → Test Cycle (dated attempt) → Test Run (runtime record) → Step Result (pass/fail/blocked/hold/skipped) → Evidence → Defect Link → Variance Record → Sprint/Release Test Health → AI Generation Audit.
- **Draft cases visible but never executable. Published = immutable version. Snapshots — repository edits never silently mutate active/closed cycles. Variance shown; pull-latest only by explicit action. Closed cycles immutable.**
- **Sprint = first-class control plane:** pulls stories + linked cases, sprint execution, cycles, pushes latest run status to Story detail, coverage, failed/blocked, defects, retest queue, evidence gaps, health score, pass/warn/block signoff gate.
- **Release = highest quality gate:** scope pull (BR/Epic/Feature/Story + sprints + UAT + regression + retest + incident validation), sprint rollup, readiness score, pass/warn/block signoff; cannot silently pass unresolved critical blockers.
- **Repository:** auto Project/Product roots with Functional/UAT/Regression/Incident/Defect folders; custom folders 6–7 levels; drag/drop, clone, merge, convert, bulk; inline + full-page open; canonical Jira-style dynamic table (ID, title, type, origin, status, health, parent, sprint, release, designer, updated, latest run, open defects).
- **Insertion points:** Add/Generate Test Case from BR, Epic, Feature, Story, QA Bug/Defect, Incident, Sprint detail, Release detail, Repository folder. Bidirectional trace: work item → case → plan → execution → cycle → run → evidence → defect → retest.
- **AI (Supabase Edge Functions):** generate, complete, improve, correct, convert-to-UAT, coverage check, gap finding, linked-item suggestions, sprint risk, release risk. Reads parent description/fields/acceptance criteria/attachments/existing tests/defects/incidents/sprint-release context + user criteria (type, count, focus areas, language EN/AR). Output = draft only until human publish.
- **Traceability & reports:** grid/hierarchy/canvas/matrix, dependency views, daily QA, sprint health, release readiness, UAT signoff, regression coverage, defect leakage/retest, variance, evidence completeness, AI audit.

## Acceptance criteria (done means)
- [ ] Every acceptance criterion from V2 package mapped with evidence
- [ ] Sprint/release back-and-forth navigation proven live
- [ ] UI/UX screenshot evidence for every surface (LTR + RTL)
- [ ] No side drawers anywhere in module
- [ ] Draft test case cannot execute (proven by probe)
- [ ] Execution snapshots exact case version; closed cycles immutable; variance banner + explicit pull-latest
- [ ] Defects raised from Test Hub carry run/step lineage unless flagged non-test-origin
- [ ] Sprint + Release signoff gates consume test health (pass/warn/block)
- [ ] Reports + traceability operational

## Non-scope
- No prod (lmqw) writes — staging cyij only until explicit Vikram instruction
- No new product direction beyond V2 package
- No external tool UI copying (functional reference only)

## Target surface
`/testhub/*` module routes (slug-based), plus insertion sections in Story/Feature/Epic/BR/Defect/Incident/Sprint/Release detail pages.

## Conflict precedence (from package)
1. user mental model → 2. V2 sprint/release architecture → 3. acceptance ledger → 4. Catalyst canonical patterns → 5. existing implementation constraints.

## Operating mode
Phased (A–I per Fable5 master prompt), status report after each phase, 2-hour slices, Plan Lock before code, screenshot signoff per UI slice.

## Stakeholders
- Vikram: Product Owner / final signoff
- Claude Code (Fable 5): Implementation
