# Patches — iter 2 (P1 #1 follow-up — Parent epic loader)

## Diff
**File:** `src/modules/project-work-hub/hooks/useBacklogData.ts`
**Function:** `useEpicBacklog`
**Change:** Removed `comment_count` from the SELECT clause. Added comment block explaining the why.

```diff
-        .select('issue_key, summary, status, status_category, assignee_display_name, due_date, priority, parent_key, parent_summary, issue_type, comment_count, jira_created_at, jira_updated_at, source')
+        .select('issue_key, summary, status, status_category, assignee_display_name, due_date, priority, parent_key, parent_summary, issue_type, jira_created_at, jira_updated_at, source')
```

## Root cause
`comment_count` does not exist on `ph_issues`. The query returned PostgREST 400
(PG error 42703 `column ph_issues.comment_count does not exist`). React Query
treated `epics` as `[]`, so `parentOptions = epics.map(...)` was `[]`, and the
Parent popover only rendered the "No parent" sentinel + "No matches" empty
state on every BAU row.

`useStoryBacklog` (line 195 of the same file) already omits `comment_count` —
this fix puts epics on the same footing. The mapping at line 143 has a defensive
`typeof row.comment_count === 'number' ? row.comment_count : null` so removing
the column from SELECT cleanly produces `null` for the field downstream — same
behaviour the Story branch already has.

## Verification
- Direct Supabase query without `comment_count` returns 13 BAU epics ✓
- After Vite HMR + page reload: Parent popover on BAU-5671 shows 14 items
  (1 "No parent" + 13 epics) — exactly matches the Supabase count ✓
- Table row count delta: 817 → 820 (3 synthesized epic-level rows now surface
  via BacklogPage's tree merge, which previously couldn't because `epics` was
  empty)

## Side effect
The Comments column on synthesized epic rows now shows the "Add comment"
placeholder instead of a count — which matches what stories already display.
Jira's compact list view also computes the comment count lazily on the detail
panel, so this is not a parity regression.

## Loop closed
Phase 7 RE-PROBE returned the expected diff (0 remaining) for the P1 #1
finding. Phase 8 wiring on Parent popover passes (open + 14 items + close).
No new findings surfaced.
