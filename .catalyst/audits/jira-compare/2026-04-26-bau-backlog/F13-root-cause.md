# F13 — Detail side panel broken (root cause; no patch yet)

**Date:** 2026-04-26
**Surface:** /project-hub/BAU/backlog
**Severity:** P0 (wiring break — visible regression)

## Symptom

Clicking a row (e.g. BAU-1) opens the right side panel with ONLY the
breadcrumb header (`ProjectHub / BAU / Backlog / BAU-1 — Test, 25 April.`).
The body is completely empty. Jira's equivalent shows full work-item
details (priority, description, fields).

Vikram's screenshot 2 (this audit session) shows this exact state.

## Root cause (code-level, no live probe yet)

`src/components/catalyst-detail-views/CatalystDetailRouter.tsx` is the
router that paints the panel body. Its lookup logic (lines 44-58):

```ts
const { data: lookedUpType } = useQuery({
  queryKey: ['cv-item-type-lookup', itemId],
  enabled: !!itemId && isOpen && !itemType,
  queryFn: async () => {
    const { data } = await supabase
      .from('ph_issues')
      .select('issue_type')
      .eq('id', itemId)
      .is('deleted_at', null)
      .maybeSingle();
    return data?.issue_type ?? null;
  },
  staleTime: 120000,
});
```

Then line 67-69:
```ts
if (!resolved && !itemType) {
  return null;  // <-- this is what's rendering for BAU-1
}
```

`itemType` is NOT passed by BacklogPage (only `itemId`). If the lookup
on `ph_issues` returns no row for `itemId`, `lookedUpType` is null,
`resolved` is null, and the router returns `null`. Empty body. Only the
breadcrumb (rendered by BacklogPage outside the router) shows.

## Why does the lookup miss?

This is the SAME root cause as F14: Catalyst-native rows live in
`catalyst_issues`, not `ph_issues`. The detail router only reads
`ph_issues`. So Catalyst-native items (like BAU-1, an internal seed row)
are invisible to the router.

F14's mutationFn rewrite moves new INLINE EDIT writes to `ph_issues`,
but the existing `catalyst_issues` rows aren't migrated and aren't
visible to the router until they are.

## Verification SQL

```sql
-- The BAU-1 row's id (whatever it is on Vikram's database)
-- should appear in only ONE of these two tables:
SELECT id, key, title, source FROM ph_issues       WHERE id = '<BAU-1 id>';
SELECT id, key, title, source FROM catalyst_issues WHERE id = '<BAU-1 id>';
```

If the row appears only in `catalyst_issues`, hypothesis confirmed.

## Fix paths (pick one)

### Option A: Migrate catalyst_issues rows into ph_issues (recommended)
One-shot SQL migration moving Catalyst-native rows into the canonical
`ph_issues` table. After this, the detail router works for all rows.
Combined with F14's mutationFn pointing at `ph_issues`, the legacy
`catalyst_issues` table can be retired (after auditing remaining
DELETE/INSERT call sites at lines 1035, 1059, 1083, 1637 of
BacklogPage.atlaskit.tsx).

### Option B: Teach the router to fall back to catalyst_issues
Make CatalystDetailRouter query both tables (or a UNION view) when
ph_issues misses. Quick fix but perpetuates table-of-truth divergence.

### Option C: Render an empty-state instead of null
Defensive: when both `resolved` and `itemType` are null, render
`<EmptyState>` so the user sees "Couldn't load this item" rather than
mysterious empty body. Doesn't fix the underlying data issue but
prevents silent failure.

## Recommendation

A + C together: migrate the data AND add the empty-state guard so this
class of bug is loud next time. Treat A as a separate Catalyst data
migration task (not a frontend patch) — needs DBA/ops review.

## Status

Root cause identified. No patch applied this session — fix requires
data migration approval which is out of scope for jira-compare.
