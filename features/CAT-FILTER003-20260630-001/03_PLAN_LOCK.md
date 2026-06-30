# Plan Lock — CAT-FILTER003-20260630-001

**Status:** APPROVED FOR EXECUTION
**Council verdict:** 2026-06-30 session

## Objective
Canonicalize FilterPreviewPage (Create filter) and FiltersListPage toolbar:
- `@atlaskit/breadcrumbs` + `@atlaskit/heading` on FilterPreviewPage
- Basic/JQL toggle → `@atlaskit/button/new`
- FiltersListPage: two-row toolbar (tabs+CTA / search+filters)
- FiltersListPage: breadcrumb separator fix
- Export CSV: demote from primary action band

## Non-scope
- statusPalette.ts — clean, do not touch
- StatusLozenge.tsx — clean, do not touch
- CanonicalFilter.tsx — FILTER001 scope
- useSavedFilters.ts — no changes needed
- JiraTable — no changes needed
- Any new features or data changes

## Timebox: 2 hours

## Slices (ordered, each independently committable)

| Slice | File | Change |
|---|---|---|
| A | FilterPreviewPage.tsx | Replace `<h1>` in chromeBand with `@atlaskit/breadcrumbs` + `@atlaskit/heading` |
| B | FilterPreviewPage.tsx | Replace hand-rolled Basic/JQL `<button>` pair with `@atlaskit/button/new` |
| C | CatalystListPageLayout.tsx + FiltersListPage.tsx | Two-row toolbar: tabs+CTA row / search+filters row |
| D | ProjectPageHeader.tsx or breadcrumb component | Fix "Investor Journey ProductFilters" separator |
| E | FiltersListPage.tsx | Export CSV → demote to table footer or overflow |

## Validation per slice
```bash
npx tsc --noEmit
npm run lint:colors:gate
npm run audit:ads:gate
```

## Stop conditions
- Any TypeScript error → stop, fix, rerun
- Any new ADS color violation → stop, fix, rerun
- Any regression in existing filter routes → revert slice, escalate
