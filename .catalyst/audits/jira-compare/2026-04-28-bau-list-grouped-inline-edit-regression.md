# JIRA COMPARE — BAU list grouped (inline-edit popover regression)
Date: 2026-04-28 · Iteration: 1 · Auditor: Claude (jira-compare skill v3)

## Scope (from user's screenshot / handoff)
Phase 8 wiring-test regression check on the inline-edit popovers (Status,
Priority, Summary, Assignee, Parent) on the BAU list grouped surface,
following the JiraTable chevron-slot insert that placed a uniform 24×24
slot at the start of every issue row's first data column.

Jira ref:     https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?sortBy=key&direction=DESC&groupBy=status
Catalyst ref: http://localhost:8080/project-hub/BAU/backlog?groupBy=status
Wiring list:  Click each editor cell on a sample row → verify popover
              opens, position is correct, options render, Escape closes,
              and at least one mutation persists end-to-end (PATCH 204 +
              DOM update).

Sample row:   BAU-5671 (Vikram's safe test row from prior session)

## Executive verdict
**NO REGRESSION.** The chevron-slot insert in the first data column does
not affect the inline-edit popovers in columns 3–8. All five popover
mechanisms work: trigger fires, popover renders at the correct anchor,
options render, aria toggles correctly, and Escape closes. Priority
mutation verified end-to-end (PATCH `/ph_issues?issue_key=eq.BAU-5671`
returned 204; DOM updated to "lowest"; revert PATCH also 204; DOM
updated back to "medium"). Two unrelated side findings recorded but
they are not chevron-slot regressions.

## P0 — none
The chevron-slot insert is correctly isolated to column index 1 (Type
column, structural). Inline-edit columns sit at indices 3–8 and have
unchanged click targets, hover affordance, and popover anchor geometry.

## P1 — Parent picker shows empty Epic list — RESOLVED iter 2
| # | Element | Behaviour | Root cause | Fix | Status |
|---|---------|-----------|------------|-----|--------|
| 1 | Parent column popover | Rendered only "No parent" sentinel; `filtered` was empty | `useEpicBacklog` SELECT included `comment_count`, which doesn't exist on `ph_issues` → PostgREST 400 → React Query held `epics` as `[]` → `parentOptions` empty | Removed `comment_count` from `useEpicBacklog` SELECT. `useStoryBacklog` already omits it; this aligns the two loaders. | ✅ FIXED iter 2 |

**Evidence (iter 2 re-probe):**
- Supabase direct query without `comment_count`: 13 rows (200) ✓
- Catalyst Parent popover after fix: 14 items (1 "No parent" + 13 BAU epics) ✓
- Table row count delta: 817 → 820 (3 synthesized epic rows now surface)
- Patch: see `2026-04-28-bau-list-grouped-inline-edit-regression/patches/iter2.md`

**New lesson** (recorded as L29 below).

## P2 — Mutation re-render latency
| # | Observation | Notes |
|---|-------------|-------|
| 1 | Priority mutation: PATCH returns 204 in ~150ms but DOM updates only ~2–3s later | Optimistic update appears not to be wired; UI relies on background refetch. Functional, not broken. |

This is a polish item — Jira's list view updates the cell instantly
because @atlaskit/inline-edit + react-query optimistic update fires
before the network round-trip. Worth tracing whether
`updateField.mutate` has an `onMutate` for optimistic state.

## Wiring inventory (chevron-slot regression check)

| # | Editor | Trigger tag | aria-expanded toggle | Popover opens | Position correct | Items rendered | Search/auto-focus | Escape close | Persistence |
|---|--------|-------------|----------------------|---------------|------------------|----------------|-------------------|--------------|-------------|
| 1 | Status | BUTTON | ✅ false→true→false | ✅ portal #1 | ✅ top: trigger.bottom + 4 | ✅ 17 (StatusPills + groups) | n/a | ✅ | not tested (avoid status churn) |
| 2 | Priority | BUTTON | ✅ | ✅ | ✅ top: 385 = trigger.bottom + 4 | ✅ 6 (Highest/Critical/High/Medium/Low/Lowest) | n/a | ✅ | ✅ end-to-end PATCH 204 + DOM update on both write and revert |
| 3 | Summary | SPAN (InlineEdit wrapper, BUTTON readView) | n/a (uses InlineEdit, not popover) | ✅ activates edit mode | n/a | n/a | ✅ input auto-focused | ✅ Cancel button restores | not tested |
| 4 | Assignee | BUTTON | ✅ | ✅ | ✅ top: 390 = trigger.bottom + 4 | ✅ 13 (Unassigned + 12 capped) | ✅ Search field auto-focused | ✅ | not tested |
| 5 | Parent | BUTTON | ✅ | ✅ | ✅ top: 386 = trigger.bottom + 4 | ⚠️ 1 (No parent only — see P1) | ✅ Search field auto-focused | ✅ | not tested |

## Catalyst chevron-slot DOM map (for reference)

Sample row BAU-5671 (leaf, no children):
```
td[0]  width 48   select checkbox
td[1]  width 106  type icon  + chevron-slot placeholder ← only the chevron-slot lives here
td[2]  width 106  key (BAU-5671)
td[3]  width 438  summary    + InlineEdit (data-jira-cell-editor SPAN)
td[4]  width 146  status     + EditorPopover (data-jira-cell-editor BUTTON)
td[5]  width 106  comments   + EditorPopover (data-jira-cell-editor BUTTON)
td[6]  width 345  parent     + EditorPopover (data-jira-cell-editor BUTTON)
td[7]  width 146  assignee   + EditorPopover (data-jira-cell-editor BUTTON)
td[8]  width 93   priority   + EditorPopover (data-jira-cell-editor BUTTON)
td[9]  width 45   row-actions (hover-only)
td[10] width 48   trailing column-manager
```

Sample row BAU-5419 (parent, has children): identical to above EXCEPT
td[1] contains a chevron-button (data-testid `jira-table.row.expand-button`)
in place of the chevron-slot placeholder.

## Counts
- 4903 `[data-jira-cell-editor]` triggers across 817 issues × ~6 editor columns ≈ correct
- 11 chevron buttons (parent rows in BAU)
- 806 chevron slots (leaf rows)
- All consistent with the design.

## Proposed fix plan
None required for the regression scope. Two follow-up items to consider
after this audit ships:

1. `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` —
   investigate the Epic loader feeding `makeParentEditCell` `options`.
   Confirm BAU's Epic list is empty by design or fix the filter.
2. `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` —
   wire `onMutate` on the `updateField` mutation so optimistic UI
   beats the background refetch.

## Handoff index
- [CLAUDE CODE]: 1 (P1 #1 — Parent epic loader)
- [LOVABLE]: 0
- [RESEARCH]: 0
- [ROVO]: 0
- [DESIGN-CRITIQUE]: 0
- [A11Y]: 0

## Acceptance checks
- [x] All five inline-edit popovers open on click after the chevron-slot insert.
- [x] aria-expanded toggles correctly on each.
- [x] Popover positions match the legacy `top = trigger.bottom + 4` spec.
- [x] Escape closes every popover (Cancel button does the same for InlineEdit).
- [x] Priority mutation persists end-to-end (PATCH 204 + DOM update + GET refresh).
- [x] No console errors during any test.
- [x] BAU-5671 reverted to original priority="medium" before exit.
- [x] No bespoke shadcn/Radix appeared in scope.

## Lessons appended to SKILL.md §19

### L28 — React Query mutation latency hides as "regression" if you read DOM too fast
**Date:** 2026-04-28
**Pattern:** First persistence test for Priority concluded "REGRESSION" after
1.5s wait because the DOM still showed the original value. The actual root
cause: `updateField.mutate` doesn't fire an `onMutate` optimistic update,
so the DOM only flips after the background refetch completes (~2–3s).
**Rule:** When verifying mutation persistence in Phase 8, either (a) wait
≥3s before reading the post-mutation DOM, OR (b) inspect the network tab
for the PATCH/POST + 2xx response (which is the real ground truth).
A "DOM didn't update in 1.5s" signal is unreliable on this codebase
until optimistic UI is wired.

### L29 — PostgREST 400 on a missing column ≠ visible error
**Date:** 2026-04-28
**Pattern:** `useEpicBacklog`'s SELECT clause included `comment_count`, a
column that doesn't exist on `ph_issues`. PostgREST returned 400 with
PG error `42703 column does not exist`. React Query caught the error
internally — the page rendered the rest of the UI fine because
`useStoryBacklog` succeeded — but `epics` ended up empty for hours
without anyone noticing. Visible symptom was downstream: the Parent
picker popover rendered only "No parent" + "No matches" because
`parentOptions = epics.map(...)` was empty.
**Rule:** When auditing a derived UI element (filter list, picker
options, badge counts) that is empty when it shouldn't be, FIRST check
the underlying query's network response BEFORE assuming a render bug.
A 400 from PostgREST on a typoed/missing column is invisible in the UI
but trivial to spot in DevTools network. Cross-check the SELECT clause
against the actual table schema (here: `useStoryBacklog`'s SELECT was
the canonical reference — it omits `comment_count`).
**Diagnostic shortcut:** `fetch(url, { headers: ... })` directly against
the Supabase REST endpoint reveals these 400s instantly. If you hit a
"hooks return empty data despite obvious DB content" mystery, fire the
SQL directly and read the error body.
