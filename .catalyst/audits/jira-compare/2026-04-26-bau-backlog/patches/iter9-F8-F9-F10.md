# Iter-9 Patches — F8 + F9 + F10 (BacklogPage.atlaskit.tsx)

**Date:** 2026-04-26
**Surface:** /project-hub/BAU/backlog
**File:** `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`
**Approver:** Vikram (in-session "continue")

## F8 — Drop redundant __caret structural column

Removed the entire column object that was at lines 818-829:
```ts
{
  id: '__caret',
  label: '',
  width: 3,
  alwaysVisible: true,
  align: 'center',
  cell: makeCaretCell({ hasChildren, isExpanded, toggle }),
},
```
The Type column now sits adjacent to Key with no leading caret column. If
hierarchical expand/collapse needs to be exposed, fold the caret into the
Type cell renderer (Jira's pattern) rather than re-adding a structural col.

## F9 — Type column width 3 → 9

Changed `width: 3` (≈40px at 1200px viewport) to `width: 9` (≈108px),
closest stable percent for the 110px target Vikram approved. JiraTable
treats `width <= 100` as percent; pixel-exact 110px would require a
`columnWidths` userOverride or a JiraTable schema change for pixel-mode
columns — deferred.

## F10 — Native &lt;select&gt; → @atlaskit/select

CLAUDE.md §7 bans native `<select>`. The previous comment in the source
acknowledged the violation but argued "Atlaskit Select is heavier than
needed here". That argument doesn't survive the Atlaskit-only mandate
for migrated surfaces.

Added import at line 26:
```ts
import Select from '@atlaskit/select';
```

Replaced the entire `<label>` + `<select>` block at lines 1202-1226 with
an `@atlaskit/select`:
```tsx
<Select<{ label: string; value: GroupByKey }>
  inputId="backlog-group-by"
  isSearchable={false}
  spacing="compact"
  value={...}
  options={[
    { label: 'None', value: 'none' },
    { label: 'Status', value: 'status' },
    { label: 'Parent', value: 'parent' },
    { label: 'Assignee', value: 'assignee' },
    { label: 'Priority', value: 'priority' },
  ]}
  onChange={(opt) => {
    if (!opt) return;
    setGroupBy(opt.value);
    setCollapsedGroups(new Set());
  }}
/>
```

`spacing="compact"` keeps the height reasonable for an inline toolbar.
The wrapping `<label>` was replaced with a flex `<div>` carrying a span
label so the Atlaskit form-field auto-styling doesn't conflict with the
host toolbar's typography.

## Acceptance criteria

- [ ] Caret column gone — Type icon column is now leftmost data column.
- [ ] Type column visibly wider (~108px not ~40px).
- [ ] Group-by control renders as Atlaskit Select with chevron + dropdown.
- [ ] Selecting a group-by option still triggers `setGroupBy + setCollapsedGroups(new Set())`.
- [ ] No native `<select>` in the page DOM.
- [ ] No TypeScript errors.

## Live verification deferred

Same FUSE-mount inotify gap blocks immediate re-probe. Disk has the
edits; whenever Vikram does a clean `pkill + npm run dev` cycle (or
opens BacklogPage.atlaskit.tsx in his editor and Cmd+S to fire native
inotify), F8/F9/F10/F11/F14 will all land together.
