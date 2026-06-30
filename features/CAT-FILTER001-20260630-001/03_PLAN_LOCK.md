# Plan Lock — CAT-FILTER001-20260630-001
# Canonical Filter Redesign — ADS-Compliant, Context-Aware

**Status**: APPROVED FOR EXECUTION  
**Date**: 2026-06-30  
**Score before**: 14/30 (HALT). Target: ≥22/30 (SHIP)

---

## Objective
Fix CanonicalFilter: width, status pill appearance, context awareness, ADS compliance.

## Non-Scope
- JQL editor internals
- Saved filters backend CRUD
- Filter↔URL sync (basicToJql.ts)
- Sprint/quarter filter fields
- New Jira-style "Advanced" (query builder) — removed, not replaced

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/filters/CanonicalFilter.tsx` | Width, rgba, tabs, StatusLozenge, Assignee, context, Parent hiding |
| `src/components/filters/CanonicalFilter.tsx` | Work type context filtering |

## Files Forbidden
- `src/lib/filters/basicToJql.ts` — DO NOT TOUCH
- `src/hooks/workhub/useSavedFilters.ts` — DO NOT TOUCH
- `src/components/filters/FilterSaveModal.tsx` — DO NOT TOUCH

---

## Slices (ordered by dependency)

### Slice A — Width + ADS Token Violations (P0, 15 min)
1. `CanonicalFilter.tsx:626` — `width: 720` → `width: 520`
2. All `rgba(9,30,66,...)` fallbacks in shadow values → strip fallback, keep only `var(--ds-shadow-raised)` 
   - Lines: 631, 720, 886, 1003, 2089, 2457, 2514, 2630
3. `CanonicalFilter.tsx:2638` — `token('color.border', 'var(--ds-border)')` pattern — strip string fallbacks, use var() only
4. Run `npm run lint:colors:gate` — must pass

### Slice B — Status Pills (P0, 15 min)
1. `CanonicalFilter.tsx:35` — remove `import Lozenge from '@atlaskit/lozenge'`
2. Add `import { StatusLozenge } from '@/components/shared/StatusLozenge/StatusLozenge'`
3. `CanonicalFilter.tsx:3006` — replace:
   ```
   displayNode: <Lozenge appearance={s.appearance as any}>{s.label}</Lozenge>
   ```
   with:
   ```
   displayNode: <StatusLozenge status={s.label} size="sm" />,
   ```
4. Screenshot status field in filter → must match home page bold pills

### Slice C — Remove Advanced Tab (P1, 5 min)
1. `CanonicalFilter.tsx:660` — remove `'advanced'` from tab array
2. Remove `FilterTab = 'basic' | 'advanced' | 'jql'` → `'basic' | 'jql'` (type update)
3. Remove the Advanced tab panel render block (find the `tab === 'advanced'` branch)
4. Saved Filters: upgrade from dropdown to a 3rd tab alongside Basic|JQL
   - Add `'saved'` to FilterTab type
   - Render SavedFilterBar content in the saved tab panel
   - Remove the dropdown trigger button

### Slice D — Remove Footer (P1, 5 min)
1. Find and delete the "Give feedback" footer section in CanonicalFilter.tsx
2. Remove keyboard shortcut footer hint
3. Keep only: Clear all (left) + count (right) in bottom strip

### Slice E — Assignee Fix (P0, 30 min)
1. Find where `assigneeOptions` is passed to CanonicalFilter in each consumer
2. Fix data feed — it currently returns 0 options for product-hub/INV/backlog
3. `CanonicalFilter.tsx:3013` — replace `<img src={a.avatarUrl}>` with `UserAvatar` component
   ```tsx
   import { UserAvatar } from '@/components/shared/UserAvatar';
   // in option map:
   icon: <UserAvatar userId={a.id} name={a.label} avatarUrl={a.avatarUrl} size="xsmall" />,
   ```
4. Add "Unassigned" option as first item, "Current user" as second item

### Slice F — Context Prop + Field Visibility (P0+P1, 45 min)
1. Add `FilterContext` prop to `CanonicalFilterProps`:
   ```ts
   filterContext?: 'business-request' | 'product' | 'project' | 'testhub'
   ```
2. Hide Parent field when context is `'business-request'` or `'testhub'`
   - Parent already renders separately via `ParentEditor` — gate on context
3. Filter Work type options by context:
   - `'business-request'`: show only Business Request, Business Gap, BRD Task, Change Request
   - `'project'`: show project-scoped types from HierarchyConfigContext (Feature, Story, Task, Sub-task, QA Bug, Change Request)
   - `'product'`: show all types
   - `'testhub'`: show QA Bug, Defect
4. Parent options for Project: dynamic based on selected work types
   - Story selected → parent options = Features
   - Feature selected → parent options = Epics
5. Wire `filterContext` in each consumer:
   - `BacklogPage.atlaskit.tsx` — pass `filterContext="project"`
   - Product-hub backlog — pass `filterContext="product"`
   - Business Request backlog — pass `filterContext="business-request"`

---

## ADS Components Mandatory (atlassian.design)

| Element | ADS Component |
|---|---|
| Filter popup shell | `createPortal` + `width: 520` fixed |
| Tabs | Custom TabButton (existing) — validated against @atlaskit/tabs visual spec |
| Assignee avatar | `@atlaskit/avatar` via `UserAvatar` wrapper (existing) |
| Status pill | `StatusLozenge` (existing canonical, uses bold ADS tokens) |
| Work type icon | `JiraIssueTypeIcon` (existing) |
| Search box | `@atlaskit/textfield` |
| Checkboxes | `@atlaskit/checkbox` |
| Clear button | `@atlaskit/button` appearance="subtle" |

## ADS Tokens Reference (no hex — ever)
```
Shadow: var(--ds-shadow-raised)           — NO rgba fallback
Surface: var(--ds-surface)
Border: var(--ds-border)
Text active: var(--ds-text)
Text inactive: var(--ds-text-subtle)
Selected bg: var(--ds-background-selected)
```

---

## Validation After Each Slice
- `npm run lint:colors:gate` — zero new violations
- `npm run lint:colors` — count must not increase
- Screenshot filter open with Status field selected → pills must match home page
- Screenshot filter open width ≈ 520px not 720px

## Stop Conditions
- Lint gate fails → stop, fix, re-gate before next slice
- StatusLozenge renders incorrectly (no bold color) → stop, check statusPalette.ts tokens
- TypeScript build error → stop, fix before next slice
