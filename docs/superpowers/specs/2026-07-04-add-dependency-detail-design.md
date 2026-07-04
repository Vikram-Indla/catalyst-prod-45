# Add Dependency on Work Item Detail — Design Spec

**Feature Work ID:** CAT-DEPS-ADDDEP-20260704-001
**Date:** 2026-07-04
**Slice:** 1 of 2 — `ph_issues`-backed types only (Epic / Feature / Story / Task)
**Follow-up (out of scope here):** Business Request / Gap / MTD on `br_dependencies`.

---

## 1. Objective

On the work item detail page, add an **"Add Dependency"** action to the "+" quick-actions
menu (immediately after "Link work item"). It opens a dialog to create a dependency of type
**blocks** or **is blocked by** against another work item in the same project. Created
dependencies render in a child-table-style section on the detail page and reflect on the
project timeline automatically.

## 2. Non-scope

- Business Request / Gap / MTD dependencies (different table `br_dependencies`, separate slice).
- Sub-task detail views (subtasks are excluded from dependencies entirely).
- Cross-project dependencies.
- Any change to the timeline rendering — it already reads `ph_issue_dependencies`.
- The existing standalone Dependencies pages / diagrams.

## 3. Decisions (user-approved)

| # | Decision |
|---|---|
| D1 | Render as **one JiraTable** with an added **Relationship** column (`blocks` / `is blocked by`), styled like the child work item table. |
| D2 | Dropdown shows **same-project** issues only, **excluding** sub-tasks and child work items (and self). |
| D3 | Menu option + section appear on **Epic, Feature, Story, Task** detail views only. |
| D4 | Persist to canonical **`ph_issue_dependencies`** — the exact table the timeline already reads — so timeline reflection is free. |

## 4. Canonical reuse (no hand-rolling)

| Concern | Reuse |
|---|---|
| Table | `@/components/shared/JiraTable` (same as `SubtasksPanel`) |
| Menu + event bus | `CatalystQuickActions.tsx` + `quickActionsBus.ts` (mirror `emitLinkWorkItem` / `useLinkWorkItemListener`) |
| Section pattern (collapsible header, listens to bus, opens create flow) | `linked-work-items/LinkedWorkItemsSection` |
| Dep read/write | `ph_issue_dependencies` via a per-issue hook modeled on `Timeline/dependencies/useTimelineDependencies.ts` + `normalize.ts` |
| Dialog | Model on the Jira-parity `LinkWorkItemModal` / existing `AddDependencyModal`; ADS components only |

## 5. Data model

Table `ph_issue_dependencies` (migration `20260624014941`):
`source_issue_key`, `target_issue_key`, `dependency_type ∈ {blocks, is_blocked_by}`,
`project_key`, `created_by`, soft-delete `deleted_at`. Unique live index on
(source, target, type). Normalization: canonical form `blocker BLOCKS dependent`.
Bidirectional view `vw_ph_issue_dependencies_bidirectional` already flips the pair.

For the current issue `K`:
- **blocks** rows → K blocks target (K is blocker).
- **is blocked by** rows → target blocks K.
Both directions are read for K and shown in the single table with the Relationship column.

## 6. Components to add / change

1. **`quickActionsBus.ts`** — add `emitAddDependency()` + `useAddDependencyListener()`
   (copy of the link pair).
2. **`CatalystQuickActions.tsx`** — new menu item `{ id: 'dependency', label: 'Add Dependency', ... }`
   in `primary` section, positioned right after the `link` item. Gate to Epic/Feature/Story/Task.
3. **`useIssueDependencies(issueKey, projectKey)`** — new hook (new file under
   `project-work-hub/components/dependencies/`): reads both-direction live rows from
   `ph_issue_dependencies`, resolves target issue metadata (type/summary/status/assignee/priority)
   the same way `SubtasksPanel` / `useTimelineDependencies` do; exposes `add()` / `remove()`
   mutations writing to the same table; invalidates both this query and the timeline's
   `ph_issue_dependencies` query key so both surfaces refresh.
4. **`DependenciesSection`** — new section component: collapsible header ("Dependencies" +
   count + "Add dependency" button), listens to `useAddDependencyListener`, renders one
   `JiraTable` (columns: Work, Relationship, Priority, Assignee, Status) with a remove action
   per row, and hosts the add dialog.
5. **`AddDependencyDialog`** — type selector (blocks / is blocked by) + async work-item picker
   scoped to same project, excluding sub-tasks, child work items of K, and K itself. ADS
   components + tokens only.
6. **Mount** `<DependenciesSection issueKey=... projectKey=... />` after
   `<LinkedWorkItemsSection>` in: `CatalystViewEpic`, `CatalystViewFeature`,
   `CatalystViewStory`, `CatalystViewTask`.

## 7. Dropdown exclusion rule (D2)

Candidate query: `ph_issues` where `project_key = K.project_key`, `deleted_at IS NULL`,
`issue_type` NOT IN sub-task types, `issue_key != K`, `parent_key != K` (exclude direct
children), and exclude keys already in a live dependency with K (avoid dup / reverse-dup —
mirror `normalize.ts` validation: no self, no duplicate, no circular).

## 8. Timeline reflection

No timeline code changes. Writing to `ph_issue_dependencies` + invalidating its query key
makes the existing Blocked-by/Blocks columns update. Manual verify: create a dep on a Story,
open the project timeline, confirm the count appears on both endpoints.

## 9. Guardrails (CLAUDE.md)

- ADS tokens only — run `npm run lint:colors:gate` + `npm run audit:ads:gate` before commit.
- No hand-rolled table/menu/dialog — JiraTable + ADS + existing bus.
- Zero-assumption rendering — unknown fields render blank, no fabricated defaults.
- No `git add -A`; stage explicit files.
- Screenshot acceptance for the new section + menu item; DOM/DB probe for functionality.

## 10. Acceptance criteria (binary)

- [ ] "+" menu on Epic/Feature/Story/Task shows "Add Dependency" directly after "Link work item"; absent on sub-task.
- [ ] Dialog lets user pick type (blocks / is blocked by) + a same-project work item; sub-tasks and child items are not selectable.
- [ ] Submitting inserts one row into `ph_issue_dependencies` (verified by DB query).
- [ ] New section lists the dependency in a JiraTable with a Relationship column; remove works (soft delete).
- [ ] Opening the project timeline shows the dependency count on both endpoints without a reload of the app.
- [ ] Color/audit gates pass; no new hardcoded colors.

## 11. Open item to confirm during implementation

- MTD storage (deferred to slice 2, but confirm it is not silently an `issue_type` in `ph_issues`
  that users expect here).
