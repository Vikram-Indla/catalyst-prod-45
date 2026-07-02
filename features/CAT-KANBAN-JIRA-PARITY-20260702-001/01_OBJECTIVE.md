# OBJECTIVE

Bring Catalyst's Kanban board (`src/features/kanban-board/`, mounted by all 6 hub modes —
project/product/incident/tasks/release/test) to visual and functional parity with Jira,
using live DOM/CSS evidence (Chrome MCP on both a real logged-in Jira session and Catalyst),
not screenshot-guessing.

## Acceptance criteria (per item)
- Every claimed Jira-vs-Catalyst gap must be measured with `getComputedStyle()` on both sides,
  or directly observed live — never inferred from a screenshot alone.
- Fixes go in the single canonical source files (confirmed via `grep -rln` — zero duplicate
  implementations exist outside `kanban-board/` for card/swimlane/toolbar/menu components).
- No fake/placeholder data rendered — if real data doesn't exist (epic color, epic status),
  render nothing until it does (zero-assumption-rendering rule).
- Every DB/schema change requires an explicit backup + explicit user confirmation of the exact
  command (this repo's permission layer enforces this hard — see `08_DRIFT_LOG.md`).
