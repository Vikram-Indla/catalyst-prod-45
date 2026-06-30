# Plan Lock — CAT-FILTER004-20260630-001

**Status:** APPROVED FOR EXECUTION
**Council verdict:** 2026-06-30 session

## Objective
FilterPreviewPage (Create/Edit filter) canonical redesign:
- Replace `<Heading level="h600">Create filter</Heading>` with editable filter name `Textfield`
- Replace FilterChip (Assignee/WorkType/Status) + FilterTriggerAndPopup (More filters) with mounted `CanonicalFilter` (passes `filterContext` from hub type)
- Collapse two-row toolbar into single row
- Remove: FilterChip, FilterTriggerAndPopup, JiraBasicFilter, facetOptions, openChipKey, toggleValue, updateFacet, moreCount (all dead after CanonicalFilter replaces them)

## Non-scope
- CanonicalFilter.tsx — DO NOT MODIFY (FILTER001 scope)
- JQLEditor — DO NOT TOUCH
- FilterSaveModal — DO NOT TOUCH
- JiraTable + results — DO NOT TOUCH
- FiltersListPage — DO NOT TOUCH

## Timebox: 2 hours

## Slices

| # | Change | File |
|---|---|---|
| A | Editable filter name: replace `<Heading level="h600">` with `Textfield` (no border until focused, placeholder "Filter name…") | FilterPreviewPage.tsx |
| B | Mount CanonicalFilter: replace FilterChip×3 + FilterTriggerAndPopup with `<CanonicalFilter filterContext={...} scopeType scopeKey value={canonicalFilter} onChange={setCanonicalFilter} />` | FilterPreviewPage.tsx |
| C | Bridge: replace `filterStateToJql(filters)` with `canonicalFilterValueToJql(canonicalFilter)` for JQL generation; remove dead state (filters, openChipKey, facetOptions, etc.) | FilterPreviewPage.tsx |
| D | Single-row toolbar: merge row-2 content (count, Save as, Save filter, kebab) into row-1; delete row-2 div | FilterPreviewPage.tsx |

## filterContext mapping
| hub | filterContext |
|---|---|
| isProduct | `'product'` |
| isIncident | `'incident'` |
| isTasks | `'tasks'` |
| isRelease | `'project'` (closest match) |
| default (project) | `'project'` |

## Validation
```bash
npx tsc --noEmit
npm run lint:colors:gate
npm run audit:ads:gate
```

## Stop conditions
- Any TypeScript error → stop, fix
- Any new ADS color violation → stop, fix
- Any regression to JQL generation logic → revert, escalate
