# CAT-STRATA-FOUNDATION-20260709-001 — READ ME FIRST

**Feature**: Canonical STRATA Product Foundation (research/discovery phase)
**Status**: Stage 1 — evidence baseline in progress (research only, NO code changes yet)
**Date opened**: 2026-07-09
**Branch**: main (no code changes this phase)

## What STRATA is

Configurable enterprise strategy execution, balanced scorecard, and value realization platform.
Locked hierarchy:

```
STRATA
└── Strategy Cycle
    ├── Strategy Execution   (Strategic Theme → Strategic Objective → OKR + Project Card)
    ├── Balanced Scorecard   (CEO Scorecard → Perspectives + Sector / CXO Scorecards)
    ├── Value Management Office (Portfolios → Benefits, Value Gates, Attribution)
    └── Governance           (Cadence, Period Close, Snapshot, Decision, Action, Board Pack, Audit)
```

## Non-negotiable rules (from the locked goal)

- Terminology: **Strategic Theme** only — legacy term **"Play" is banned** in STRATA-facing UI/routes/schema/seeds.
- **OKR** at strategy level; **Project KPI** at project level; **Project Card** is the executive project object.
- **Sector / CXO Scorecard** is one combined concept. **VMO** for value realization.
- Linkage: **only Project Cards link to Portfolios**. Strategic Theme ↔ Portfolio direct links are banned in both directions.
- Project Objectives link back to Strategic Objectives; Project KPIs link back to OKRs.
- Not a cosmetic rename — canonical product architecture.

## Read order for continuation sessions

1. `00_admin/STATE.json` — pipeline state, next action
2. `01_OBJECTIVE.md` — full locked goal
3. `02_CANONICAL_DISCOVERY.md` — as-is estate map (repo evidence)
4. `03_PLAN_LOCK.md` — (not yet written; requires Vikram approval before any code)
5. `90_handoff/IMPLEMENTATION-PROMPT.md` — build handoff once research completes

## Hard project guardrails that bind STRATA implementation

- ADS tokens only; hand-rolled UI banned; JiraTable rule; slug contract (no :id routes); mockup-first contract for UI.
- Astryx ring-fence: Astryx components allowed only under `/strategy/*` and `/ideas/*` via `<AstryxZone>`.
- No commit without Plan Lock, session log, screenshot acceptance (UI), explicit file staging.
