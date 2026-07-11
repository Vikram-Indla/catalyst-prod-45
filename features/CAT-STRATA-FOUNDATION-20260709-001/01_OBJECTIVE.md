# 01 — OBJECTIVE (locked goal, verbatim summary)

Build the Canonical STRATA Product Foundation. STRATA must help leadership answer:

1. Are we executing the strategy?
2. Are we achieving the intended performance outcomes?
3. Are our strategic investments creating the promised value?
4. What decisions or interventions are required now?

STRATA is a governance platform, not a reporting tool: strategic intent → execution evidence → performance outcomes → value realization → portfolio value → executive snapshots → decisions → actions → audit history.

## Locked hierarchy

```
STRATA
└── Strategy Cycle
    ├── Strategy Execution
    │   └── Strategic Theme
    │       └── Strategic Objective
    │           ├── Objective Key Result / OKR
    │           └── Project Card
    │               ├── Linked Strategic Theme
    │               ├── Linked Strategic Objective
    │               ├── Project Objective → links back to Strategic Objective
    │               ├── Project KPI → links back to OKR
    │               ├── Milestones / Dependencies / Risks / Blockers
    │               ├── Evidence / Lineage
    │               └── Portfolio Link (Project Card → Portfolio)
    ├── Balanced Scorecard
    │   └── CEO Scorecard
    │       ├── Perspectives
    │       └── Sector / CXO Scorecards
    │           └── Objectives, Measures/KPIs, Targets, Actuals, Scores, Evidence/Commentary
    ├── Value Management Office
    │   └── Portfolios
    │       ├── Linked Project Cards
    │       ├── Benefits (Planned/Forecast/Realized/Validated Value + Evidence)
    │       ├── Value Gates, Benefit Realization, Assumptions, Attribution Rules
    │       └── Value Evidence / Lineage
    └── Governance
        └── Review Cadence, Period Close, Snapshot, Decision, Action, Board Pack, Audit Trail
```

## Mandatory terminology

1. **Strategic Theme** only. 2. Legacy **"Play"** removed everywhere from active STRATA terminology. 3. Strategy level: **Objective Key Result / OKR**. 4. Project level: **Project KPI**. 5. **Project Card** = executive-level project object. 6. **Sector / CXO Scorecard** as one combined concept. 7. **Value Management Office / VMO**. 8. No previous product/vendor names.

## Mandatory linkage rules (all 18)

1. Strategy Cycle contains Strategy Execution, Balanced Scorecard, VMO, Governance.
2. Strategy Execution contains Strategic Themes.
3. Strategic Theme contains Strategic Objectives.
4. Strategic Objective contains OKRs.
5. Project Cards sit under the Strategic Objective hierarchy level.
6. Project Cards also link back to Strategic Themes.
7. Project Cards contain Project Objectives.
8. Project Objectives link back to Strategic Objectives.
9. Project Cards contain Project KPIs.
10. Project KPIs link back to OKRs.
11. Project Cards contain milestones, dependencies, risks, blockers, evidence, lineage.
12. Portfolios are independent of Strategic Themes.
13. Strategic Themes must not link directly to Portfolios.
14. Portfolios must not link directly to Strategic Themes.
15. Only Project Cards link to Portfolios.
16. Balanced Scorecard lives at Strategy Cycle level.
17. VMO lives at Strategy Cycle level.
18. Governance lives at Strategy Cycle level.

## Expected deliverables (from goal)

Canonical domain model; Strategy Cycle root; Strategy Execution hierarchy; Project Card linkage model; Balanced Scorecard foundation; VMO/Portfolio foundation; Governance foundation; correct terminology across UI/code/routes/data/seeds; relationship validation; updated navigation (4 areas); seed data; smoke tests/verification; no Theme↔Portfolio linkage; no active "Play" term.

## Acceptance criteria

20 criteria — see the original goal text (kept in `10_sources/raw/GOAL.md`). Key: Strategy Cycle root exists; four areas under it; hierarchy + linkages exact; UI is executive-grade, not an operational tracker; no duplicate strategy hierarchy; no broken nav/dead links/disconnected mocks.

## Implementation constraints (from goal)

Inspect before coding; refactor existing models rather than duplicate; no parallel terminology; no disconnected mock-only functionality; preserve working functionality unless it violates the hierarchy; safe migrations; preserve legacy IDs/relationships while exposing only STRATA terminology in UI; validation blocks invalid relationships.
