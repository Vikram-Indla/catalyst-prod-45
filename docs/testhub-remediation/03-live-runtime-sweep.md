# Test Hub Live Runtime Sweep

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Date:** 2026-07-11  
**Browser:** Chrome with ChatGPT Chrome Extension enabled  
**Mode:** Read-only runtime inspection on `localhost:8080`

## Gate result

Chrome control is now working. The signed-in runtime sweep is no longer blocked.
Mobbin remains unavailable, so market-reference and future-design phases remain
blocked.

## Screenshots

Screenshots were saved under:

`docs/testhub-remediation/visuals/live-20260711/`

Captured routes:

- `dashboard.png`
- `repository.png`
- `board.png`
- `plans.png`
- `executions.png`
- `cycles.png`
- `reports.png`
- `traceability.png`
- `defects.png`
- `filters.png`
- `timeline.png`
- `dependencies.png`
- `my-work.png`
- `admin-test-ops.png`
- `admin-test-permissions.png`

## Route evidence

| Route | Live result | Production-readiness implication |
|---|---|---|
| `/testhub/dashboard` | Loads after a delay. Shows 12 test cases and 1 active cycle. | Works as a thin summary, but does not expose active Test Space or lifecycle health. |
| `/testhub/repository` | Shows 2 cases: `TC-0053` passed and `TC-0054` failed. | Basic repository view works, but visible scope is unclear and far smaller than live staging totals. |
| `/testhub/board` | Shows DRAFT 0, IN REVIEW 0, ARCHIVED 2. | Board is functionally disconnected from repository status; approved active cases do not appear as useful board work. |
| `/testhub/plans` | Shows 2 plans, both with blank progress and blank timeline. | Plan list exists, but plan progress is not operationally useful and does not show version-pinned execution readiness. |
| `/testhub/executions` | Shows 3 executions. | Execution list exists and loads, but does not prove plan handoff or cycle linkage correctness. |
| `/testhub/cycles` | Shows 4 cycles; one live cycle at 100%, three seed cycles at 0%. | Cycle list exists, but it still does not prove plan-owned, version-pinned execution lifecycle. |
| `/testhub/reports` | Redirects to Sprint Testing Status. Shows 0% story coverage, 193 defects, 0 test-linked defects, 12 production incidents. | Reports now load, and they strongly reinforce that coverage/defect linkage is not production-ready. |
| `/testhub/traceability` | Shows 2 requirements, 2 linked cases, 1 passing run, 1 failing run. One failed row displays `0/1 PASSING`. | Traceability loads but contains a visible status contradiction. |
| `/testhub/defects` | Shows 19 defects. Browser logs repeated `Error fetching starred items: Object`. | Defect list works, but starred/favorite integration errors and defect linkage gaps remain. |
| `/testhub/filters` | Shows no saved filters. Browser logs repeated starred item fetch errors. | Filters shell works, but there is no useful saved-filter evidence and prior code evidence still shows wrong source model. |
| `/testhub/timeline` | Shows "No issues match your filters" despite Test Hub cycles and dependencies existing. | Timeline is disconnected from visible Test Hub work. |
| `/testhub/dependencies` | Shows 1 dependency between `SENAEI-BAU RVCYC-001` and `DEMO CYC-001`. | Dependency view exists, but it is global/cross-space and not clearly governed by active Test Space. |
| `/testhub/my-work` | Shows 1 case, `TC-0001 Logout clears the session`. | My Work is scoped differently from repository and cycles, confirming Test Space/user-context ambiguity. |
| `/admin/test-ops` | Shows coverage gate: 682 stories, 0 linked test cases; 1 feature, 0 linked test cases. | Admin evidence confirms coverage governance exists but current coverage is effectively zero. |
| `/admin/test/permissions` | Shows a role/permission matrix. | UI exists, but this does not prove server-side enforcement; DB/RLS evidence still says enforcement is unsafe. |

## Confirmed runtime gaps

1. The module has real screens and many routes load, but the routes do not agree
   on the same active Test Space or same lifecycle scope.
2. Repository, board, plans, cycles, reports, traceability, dependencies, and
   My Work show different slices of reality.
3. Reports and Admin Test Ops expose severe coverage gaps: 0% sprint story
   coverage and 0 linked test cases across large story/feature counts.
4. Traceability has a visible contradiction: a failed run row can display
   `0/1 PASSING`.
5. Timeline does not surface existing Test Hub work.
6. Board is not a reliable operational board: it shows archived items rather
   than the active approved cases shown in repository.
7. Defects and filters emit repeated starred-item errors in the browser console.
8. Permission UI exists, but it is not proof of production-safe authorization;
   DB/RLS probes still show permissive access.

## What this changes

This removes the previous browser-control blocker. It does not remove the Mobbin
blocker and does not authorize implementation. Phase 1 can now be considered
runtime-backed instead of repository/data-only.
