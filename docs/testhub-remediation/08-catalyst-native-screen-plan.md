# Test Hub Catalyst-Native Screen Plan

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Status:** SUPERSEDED — rejected as too conservative on 2026-07-11; see `09-premium-testhub-design-direction.md`  
**Design authority:** Existing Catalyst screens/components → Atlaskit primitives → ADS tokens. No external product influence.

## Non-negotiable implementation rules

- Use `JiraTable` for repository, plan, execution, cycle, traceability, report,
  and permission lists; do not build a table, grid table, or card-list substitute.
- Keep the existing `ProjectDashboardPage`, `KanbanPage`, `BacklogPage`,
  `CatalystDetailRouter`, `CatalystViewBase`, `TimelineView`, and
  `DependenciesView` shells. Repair their data adapters and lifecycle contracts.
- Use Atlaskit `Button`, `Select`, `DropdownMenu`, `ModalDialog`, `Lozenge`,
  `InlineMessage`, `Flag`, `Spinner`, and `EmptyState` only through the existing
  Catalyst wrapper/canonical path where one exists.
- Use ADS token values only: no hex, custom palette, Tailwind colors, shadcn, or
  raw controls. Use sentence case, ADS spacing rhythm, and token-owned dark mode.

## Proposed screens to review

| Surface | Proposed Catalyst-native design | Exact canonical building blocks | What does not change |
|---|---|---|---|
| Test Hub frame | Add one visible active Test Space control in the existing page header. It is scope identity, not a new navigation system. | Existing Test Hub/`ProjectPageHeader`; `@atlaskit/select` via Catalyst wrapper. | Current routes and sidebar shell. |
| Dashboard | Keep `ProjectDashboardPage`. Top region is active Test Space and a concise lifecycle summary; below it, existing widgets show only reconciled counts and recent audited activity. | `ProjectDashboardPage`, existing dashboard widgets, `Lozenge`, `InlineMessage`. | No custom KPI cards, scorecards, or external dashboard layout. |
| Repository | Keep the folder region and `JiraTable`. Toolbar order: active scope, search/filter, then one primary `Create case` action; bulk/row actions stay in existing menus. | `JiraTable`, existing folder pattern, `Button`, `DropdownMenu`, `EmptyState`. | Existing folders, details, and case CRUD. |
| Case detail | Keep `CatalystDetailRouter` / `CatalystViewBase`. Main content retains steps and requirements; governed versions, approval, evidence, and activity are explicit sections, not a new sidecar UI. | `CatalystViewBase`, existing detail fields, `InlineEdit`, `Lozenge`, `ModalDialog`. | Existing detail route and core editable fields. |
| Plans | Keep Plan `JiraTable` and detail shell. Detail order: purpose/readiness, scoped case versions, criteria/environment, activity. One primary action becomes `Publish baseline`; creation of an Execution follows only after publication. | `JiraTable`, existing Plan detail, `Lozenge`, `InlineMessage`, `ModalDialog`. | Existing list/detail surfaces. |
| Executions and cycles | Keep list/detail shells. Detail shows immutable manifest/readiness first, then scoped cases, assignments, progress, and run history. | `JiraTable`, existing Cycle/Execution details, `StatusTransitionDropdown`, `DropdownMenu`. | Existing route family and cycle controls. |
| Runner | Keep the current focused execution page, but replace raw controls with Atlaskit/Catalyst controls. Header shows case key/version and sync state; body is one step at a time; footer holds verdict actions and save state. | Existing runner shell, `Button`, `Lozenge`, `Flag`, `InlineMessage`, `Spinner`. | Pass/Fail/Block/Skip/Hold, notes, timer, evidence, and defect prompt. |
| Retrospective | Keep run detail; order the page as result summary, immutable step results, evidence, defects, then audit history. | Existing run detail, `JiraTable` where list density requires it, existing evidence/activity components. | Current run route and forensic data. |
| Traceability and reports | Start with the accessible existing grid/hierarchy and existing report routes. Present scope/filters first; then a `JiraTable` drill-down; defer canvas and advanced analytics. | `JiraTable`, `ReportChart`, `Select`, `DropdownMenu`, `EmptyState`. | Existing traceability/report route registry. |
| Permissions | Make roles primary and members secondary within the existing admin route. Use a `JiraTable`/canonical admin list and a real denied state. | `JiraTable`, existing permission data model, `Lozenge`, `ModalDialog`, `EmptyState`. | Roles → permissions model; server policy remains authoritative. |

## Design decisions requiring Vikram review

1. Keep the active Test Space selector in the page header on every Test Hub route.
2. Keep the existing dashboard shell; do not introduce custom metric cards.
3. Use the existing accessible traceability grid/hierarchy as the production
   baseline and defer the canvas.
4. Keep role-first permissions and move no permission authority into the UI.
5. Put security/data lifecycle repair ahead of any visual cleanup.

## ADS compliance boundary

Every implementation slice must pass the repository ADS gates and prove both
light and dark behavior. The design-intelligence live-arrow audit is pending
because this session has no controllable browser tool; it must run against the
actual changed route before a UI slice is accepted.
