# B3 — Coverage Model

> STATUS: 🟢 DRAFT. F-01 proven. Each formula discloses denominator.

## Story coverage (PRIMARY, D-006, PROVEN)
- Covered story = ph_issues Story with ≥1 tm_requirement_links (requirement_type='story', external_key=issue_key).
- Coverage% = covered ÷ in-scope stories. Senaei BAU = 14/394 = 3.6% (proven).
- coverage_status (full/partial/pending/blocked) from tm_requirement_links refines per-story.

## Execution coverage (SECONDARY)
- Executed story = covered story whose linked case has a run in scope (current_status ≠ not_run).
- Exec% = executed ÷ covered (or ÷ in-scope; disclose which).

## Pass coverage
- Passed story = all required linked cases passed (latest run). Distinguish from failed/blocked.

## Roll-ups
- Feature/Epic/BR coverage = derived from child story coverage (parent_key chain). Disclose derivation.
- Release/Sprint coverage = story coverage within sprint_release scope (B2).

## Gap reports
- Uncovered stories = in-scope stories with 0 links.
- Unexecuted = covered but no run.
- Stale = run older than threshold (needs DATE_SOURCES).
- Orphans = cases/runs/defects with no resolvable scope.

## Disclosure rule
Every coverage number renders WITH its denominator label (e.g. "3.6% — 14/394 stories").
