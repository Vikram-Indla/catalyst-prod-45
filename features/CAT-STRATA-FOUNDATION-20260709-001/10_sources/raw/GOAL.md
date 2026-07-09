# SRC-001 — Locked STRATA goal (verbatim, supplied 2026-07-09)

Claude Code Goal: Build the Canonical STRATA Product Foundation

You are working on STRATA, a configurable enterprise strategy execution, balanced scorecard, and value realization platform.

STRATA must help leadership answer four questions:
1. Are we executing the strategy?
2. Are we achieving the intended performance outcomes?
3. Are our strategic investments creating the promised value?
4. What decisions or interventions are required now?

This is not a reporting tool. STRATA is a governance platform that connects strategic intent to execution evidence, performance outcomes, value realization, portfolio value, executive snapshots, decisions, actions, and audit history.

## Primary Goal

Implement the canonical STRATA hierarchy, terminology, linkage model, navigation structure, and foundational data model so that the application clearly supports:
1. Strategy Execution
2. Balanced Scorecards
3. Value Management Office
4. Governance

All four areas must live under a Strategy Cycle.

## Locked Product Hierarchy

```text
STRATA
└── Strategy Cycle
    ├── Strategy Execution
    │   └── Strategic Theme
    │       └── Strategic Objective
    │           ├── Objective Key Result / OKR
    │           └── Project Card
    │               ├── Linked Strategic Theme
    │               ├── Linked Strategic Objective
    │               ├── Project Objective
    │               │   └── Links back to Strategic Objective
    │               ├── Project KPI
    │               │   └── Links back to Objective Key Result / OKR
    │               ├── Milestones
    │               ├── Dependencies
    │               ├── Risks
    │               ├── Blockers
    │               ├── Evidence / Lineage
    │               └── Portfolio Link
    │                   └── Links Project Card to Portfolio
    ├── Balanced Scorecard
    │   └── CEO Scorecard
    │       ├── Perspectives
    │       └── Sector / CXO Scorecards
    │           ├── Scorecard Objectives
    │           ├── Scorecard Measures / KPIs
    │           ├── Targets
    │           ├── Actuals
    │           ├── Scores
    │           └── Evidence / Commentary
    ├── Value Management Office
    │   └── Portfolios
    │       ├── Linked Project Cards
    │       ├── Benefits
    │       │   ├── Planned Value
    │       │   ├── Forecast Value
    │       │   ├── Realized Value
    │       │   ├── Validated Value
    │       │   └── Evidence
    │       ├── Value Gates
    │       ├── Benefit Realization
    │       ├── Assumptions
    │       ├── Attribution Rules
    │       └── Value Evidence / Lineage
    └── Governance
        ├── Review Cadence
        ├── Period Close
        ├── Snapshot
        ├── Decision
        ├── Action
        ├── Board Pack
        └── Audit Trail
```

## Mandatory Terminology Rules

Apply everywhere in code, UI labels, routes, schemas, mocks, seed data, comments, documentation:
1. Use Strategic Theme only.
2. Remove the legacy term Play everywhere from active STRATA terminology.
3. At the strategy level, use Objective Key Result / OKR.
4. At the project level, use Project KPI.
5. Use Project Card as the executive-level project object.
6. Use Sector / CXO Scorecard as one combined concept.
7. Use Value Management Office or VMO for the value realization area.
8. Do not call STRATA by any previous product/vendor name.

## Mandatory Linkage Rules

1. Strategy Cycle contains Strategy Execution, Balanced Scorecard, Value Management Office, and Governance.
2. Strategy Execution contains Strategic Themes.
3. Strategic Theme contains Strategic Objectives.
4. Strategic Objective contains Objective Key Results / OKRs.
5. Project Cards sit under the Strategic Objective hierarchy level.
6. Project Cards also link back to Strategic Themes.
7. Project Cards contain Project Objectives.
8. Project Objectives link back to Strategic Objectives.
9. Project Cards contain Project KPIs.
10. Project KPIs link back to Objective Key Results / OKRs.
11. Project Cards contain milestones, dependencies, risks, blockers, evidence, and lineage.
12. Portfolios are independent of Strategic Themes.
13. Strategic Themes must not link directly to Portfolios.
14. Portfolios must not link directly to Strategic Themes.
15. Only Project Cards link to Portfolios.
16. Balanced Scorecard lives at Strategy Cycle level.
17. Value Management Office lives at Strategy Cycle level.
18. Governance lives at Strategy Cycle level.

## Required Functional Areas

### 1. Strategy Execution
Manage: Strategy Cycles, Strategic Themes, Strategic Objectives, OKRs, Project Cards, Project Objectives, Project KPIs, Milestones, Dependencies, Risks, Blockers, Evidence/Lineage.
Must answer: which Themes are executing; which Objectives are progressing; which OKRs are improving; which Project Cards contribute to each Theme/Objective; which Project Objectives support which Strategic Objectives; which Project KPIs support which OKRs; which projects are delayed, blocked, at risk, or dependent on another party.

### 2. Project Card (central execution object; executive-facing, NOT a task tracker)
Supports: name and reference, budget, progress, project owner, project manager, department/sector, baseline dates, forecast dates, delivery health, linked Strategic Theme, linked Strategic Objective, Project Objectives, Project KPIs, dependencies, milestones, risks, blockers, serving party, requesting party, evidence and lineage, portfolio links.

### 3. Value Management Office (at Strategy Cycle level)
Supports: portfolio creation/management, linking Project Cards to Portfolios, benefits, planned/forecast/realized/validated value, assumptions, attribution rules, benefit ownership, benefit validation, value leakage, value gates, benefit realization, portfolio-level reporting, evidence and lineage.
Critical rule: Portfolio ↔ Project Card allowed. Portfolio ↔ Strategic Theme NOT allowed (either direction).

### 4. Balanced Scorecard (at Strategy Cycle level)
Supports: CEO Scorecard, Sector / CXO Scorecards, Perspectives, Scorecard Objectives, Scorecard Measures/KPIs, Targets, Actuals, Thresholds, Weightages, Formulas, Scores, Commentary, Evidence, Data lineage, Drilldowns.
CEO Scorecard rolls up Sector / CXO Scorecards through configured perspectives (Financial, Customer, Growth, Operational, Digital, People, Regulatory/Risk, other configured).
Drilldown: enterprise → sector → measure detail → related Project Cards, benefits, evidence, commentary.

### 5. Governance (at Strategy Cycle level)
Supports: Review Cadence, Period Close, Snapshots, Decisions, Actions, Board Packs, Audit Trail. Connects to Strategy Execution, Balanced Scorecard, and VMO so executive decisions and actions are evidence-backed.

## Implementation Instructions (before coding)

1. Inspect the current STRATA/Catalyst codebase.
2. Identify existing routes, tables, components, enums, types, seed data, labels related to strategy, themes, objectives, scorecards, projects, portfolios, value, decisions, governance, or legacy terminology.
3. Do not duplicate existing models if they can be safely refactored.
4. Do not create parallel terminology.
5. Do not introduce disconnected mock-only functionality.
6. Preserve existing working functionality unless it directly violates the locked STRATA hierarchy.
7. If database changes are required, create safe migrations.
8. If legacy data exists using older terminology, preserve IDs and relationships where possible, but expose only the correct STRATA terminology in the UI.
9. Ensure route names, page titles, labels, empty states, and navigation reflect the STRATA model.
10. Add validation so invalid relationships cannot be created.

## Expected Deliverables

1. Canonical STRATA domain model implemented or refactored.
2. Strategy Cycle root structure.
3. Strategy Execution hierarchy.
4. Project Card linkage model.
5. Balanced Scorecard foundation.
6. VMO / Portfolio foundation.
7. Governance foundation.
8. Correct terminology across UI, code, routes, data model, and seed data.
9. Relationship validation enforcing the locked rules.
10. Updated navigation reflecting STRATA's four major areas.
11. Seed/sample data demonstrating the correct hierarchy.
12. Basic smoke tests or verification notes proving the model works.
13. No direct Strategic Theme-to-Portfolio linkage anywhere.
14. No active usage of the legacy term Play in STRATA-facing UI.

## Acceptance Criteria (all must be true)

1. STRATA has a Strategy Cycle root.
2. Strategy Execution, Balanced Scorecard, VMO, and Governance all sit under Strategy Cycle.
3. Strategic Theme contains Strategic Objectives.
4. Strategic Objectives contain OKRs.
5. Project Cards sit under Strategic Objectives.
6. Project Cards link back to Strategic Themes.
7. Project Cards contain Project Objectives and Project KPIs.
8. Project Objectives link to Strategic Objectives.
9. Project KPIs link to OKRs.
10. Portfolios are independent of Strategic Themes.
11. Only Project Cards can link to Portfolios.
12. Balanced Scorecard lives at Strategy Cycle level.
13. CEO Scorecard sits under Balanced Scorecard.
14. Sector Scorecard and CXO Scorecard are represented as Sector / CXO Scorecard.
15. VMO lives at Strategy Cycle level.
16. Governance lives at Strategy Cycle level.
17. The UI does not look like a basic operational tracker.
18. The structure supports executive dashboards, strategy maps, scorecard drilldowns, project card views, portfolio value views, benefit realization views, dependency views, snapshots, decisions, actions, and evidence-backed insights.
19. No duplicate strategy hierarchy is created.
20. No broken navigation, dead links, or disconnected mock data is introduced.

## Final Product Intent

STRATA = enterprise command system for strategy execution, performance governance, and value realization. Leadership moves: Strategy → Objectives → OKRs → Project Cards → Execution Evidence → Portfolios → Benefits → Scorecards → Governance Snapshots → Decisions and Actions.

Do not treat this as a cosmetic rename. Treat it as the canonical product architecture for STRATA.
