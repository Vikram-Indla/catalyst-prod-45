# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Screenshot Checklist

> Screenshot acceptance checklist. Every item must be ACCEPTED before UI-heavy commit.
> UI/UX = 80% of acceptance. Drafted by QA/Screenshot Validator agent 2026-07-06.

## Status
PENDING — awaiting implementation.

## Global gates (apply to EVERY screenshot)
- [ ] No side drawer anywhere (full-page or canonical modal only)
- [ ] Canonical breadcrumbs, status pills (Lozenge/StatusLozenge), face avatars w/ name tooltip, JiraIssueTypeIcon for work items, JiraTable for lists
- [ ] Zero bare colors (lint:colors:testhub zero-baseline gate green)
- [ ] Zero-assumption rendering: at least one row/field with genuinely missing data per surface shows dash/nothing — no fake defaults
- [ ] Empty + loading + error state captured per major surface

## Per-surface checklist

### 1. Repository (tree + table)
- [ ] Project/Product root auto-named (rename disabled) + system folders Functional/UAT/Regression/Incident/Defect
- [ ] Custom folder nested ≥3 deep in tree (proves 6–7 level rendering)
- [ ] Full-width JiraTable, no dead ~28px expand padding when no expandable rows (chevron slot gating lesson)
- [ ] Columns: key, title, status pill, type, origin (separate from type), health, sprint, release, designer, updated, latest run, open defects
- [ ] Row with no sprint/release/health → dash/blank
- [ ] Inline open + full-page open affordances
- [ ] Drag/drop: mid-drag indicator + move confirmation
- [ ] Empty folder state

### 2. Test Case full page — LTR
- [ ] Header: key, title, status, type, origin, health, parent (icon+key), sprint/release chips; breadcrumbs to folder
- [ ] Step editor large (≥ ~60% viewport width): action/expected/test-data, add/copy/delete/reorder, AI complete/improve/coverage
- [ ] Details + Activity panels collapsed AND expanded (2 shots)
- [ ] Traceability section: parents, plans, executions, cycles, runs, defect links
- [ ] Versions list + compare affordance
- [ ] Draft case: Draft pill + no execute/add-to-execution affordance
- [ ] Case with no parent → slot renders nothing

### 3. Test Case full page — RTL
- [ ] Arabic title/steps: mirrored layout, flipped breadcrumbs/panels, step grid column order correct, no clipping, canonical pills/avatars intact

### 4. AI Wizard
- [ ] Functional/UAT/Regression one clear control
- [ ] Count / focus / language (EN/AR) / source-context controls
- [ ] Draft preview: every case shows Draft + AI-origin flag + confidence
- [ ] Accept / reject / regenerate per case
- [ ] Rainbow only on CatyIconCTA
- [ ] Arabic output screenshot (RTL preview)

### 5. Test Plan
- [ ] Curated reference set — cases keep repository folder path (no physical move)
- [ ] Scope binding chip: sprint/release/project/product/BR/custom
- [ ] Live-reference vs locked-reference indicator
- [ ] Pull-latest affordance on variance case
- [ ] Empty plan state

### 6. Execution Lab
- [ ] Context chip in header (sprint/release/project/product/custom)
- [ ] Case list shows snapshotted version (e.g. "v3")
- [ ] Draft cases excluded/disabled in picker with reason
- [ ] Dated cycles list (Cycle 1, Cycle 2, UAT round…)

### 7. Cycle Run Player
- [ ] Run header: case key + version, timer, start/end, executor avatar
- [ ] Step controls pass/fail/blocked/hold/skipped, actual-result field, per-step evidence
- [ ] Force-pass with reason capture
- [ ] Fail state → Create defect pre-linked to run+step
- [ ] Closed cycle: read-only + immutability indicator
- [ ] Variance banner: update/clone/keep-snapshot choices

### 8. Sprint detail — Test Health section
- [ ] Coverage by story, execution progress, pass %, blocked rate, defect severity, retest queue, evidence gaps
- [ ] Gate pill: pass / warn / block (3 shots)
- [ ] Story with zero tests → "no coverage" honest state
- [ ] Links to repository + traceability filtered by sprint

### 9. Release detail — Readiness section
- [ ] Sprint rollup, release plans, UAT + regression status, failed tests, blocking defects, evidence gaps
- [ ] Readiness gate per-criterion breakdown; blocker/waiver rows
- [ ] Signoff gate pass / warn / block (3 shots)
- [ ] Release with no test scope → honest empty state, no fabricated 100%

### 10. Traceability
- [ ] Grid, hierarchy, canvas, matrix (4 shots)
- [ ] Sprint/release filters prominent
- [ ] Chain BR → Epic → Feature → Story → Case → Run → Defect visible
- [ ] Missing link renders gap, not synthesized

### 11. Reports
- [ ] Report list: daily QA, sprint health, release readiness, UAT signoff, regression, defect leakage/retest, variance, evidence completeness, AI audit
- [ ] One rendered report with real seeded data; ADS-token charts
- [ ] Empty data range → empty state, not zeroed fake chart
