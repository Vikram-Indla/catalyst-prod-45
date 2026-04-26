# Iter-9 Patch — F14 hard rule (all rows editable, write back to Jira)

**Date:** 2026-04-26
**Surface:** /project-hub/BAU/backlog
**File:** `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`
**Approver:** Vikram (in-session)

## What changed

Three surgical edits, all in BacklogPage.atlaskit.tsx:

### 1. Import `jiraSyncService` (line ~22)
```diff
 import { supabase } from '@/integrations/supabase/client';
+import { jiraSyncService } from '@/services/jira-sync.service';
```

### 2. Rewrite `updateField.mutationFn` (lines ~352-367)

Before:
```ts
mutationFn: async ({ id, source, patch }) => {
  if (source !== 'catalyst') throw new Error('Jira-synced items must be edited in Jira.');
  const { error } = await supabase
    .from('catalyst_issues')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
},
```

After:
```ts
const JIRA_FIELD_MAP: Record<string, string> = {
  title: 'summary',
};
mutationFn: async ({ id, source, patch }) => {
  // Step 1 — local cache write to ph_issues
  const { error: cacheError } = await supabase
    .from('ph_issues')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (cacheError) throw cacheError;

  // Step 2 — for Jira-sourced rows, queue write-back
  if (source === 'jira') {
    for (const [field, value] of Object.entries(patch)) {
      const jiraField = JIRA_FIELD_MAP[field] || field;
      await jiraSyncService.queueWriteBack(id, jiraField, String(value));
    }
  }
},
onSuccess: (_data, variables) => {
  queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
  queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
  if (variables.source === 'jira') {
    flag.success('Updated', 'Change queued for Jira sync approval');
  } else {
    flag.success('Updated');
  }
},
```

Behavioural diff:
- Throw removed → all sources can write.
- Write target switched from `catalyst_issues` → `ph_issues` (the canonical mirror that `useBacklogData` reads from + that `workItemRepo` writes to).
- Jira-sourced rows additionally queue a write-back for moderator approval.
- Toast text differentiates source so users know "queued for Jira approval" vs "updated locally".

### 3. Flip canEdit on Summary col (line ~855)

Before:
```ts
canEdit: (r) => r.source === 'catalyst',
```

After:
```ts
canEdit: () => true,
```

Status col (line 881) and Parent col (line 914) were already `() => true`.

## Risks logged

1. **Table-of-truth migration** — Catalyst-native rows used to write to
   `catalyst_issues`; they now write to `ph_issues`. If any downstream
   consumer (analytics, sync layer, edge function) reads `catalyst_issues`
   directly, it will silently miss the new updates. Action: audit
   `catalyst_issues` usage before this lands in production.

2. **Sync write-loop potential** — Catalyst writes to `ph_issues`, then
   queueWriteBack posts the change to Jira. If the Jira→Catalyst inbound
   sync re-applies the same value to `ph_issues` post-approval, that's
   benign (idempotent); but if the inbound sync triggers another
   `pending_write_back_at` stamp, we could ping-pong. Action: verify the
   inbound sync is gated on a content-hash diff, not a timestamp.

3. **`updated_at` semantics** — Catalyst sets `updated_at: now()` on every
   patch. Jira's inbound sync may also overwrite `updated_at` on next
   pull. The "user-edited" timestamp may flicker.

4. **TypeScript types on `ph_issues`** — Used the same patch-spread
   pattern as `workItemRepo.ts:106` which compiles cleanly there. No
   defensive cast.

## Acceptance criteria

- [ ] All rows on /project-hub/BAU/backlog respond to inline summary edit (not just BAU-1).
- [ ] Editing a Catalyst-sourced row → toast "Updated", no Jira queue row.
- [ ] Editing a Jira-sourced row → toast "Updated · Change queued for Jira sync approval", new row in `jira_write_back_queue`, `pending_write_back_at` stamped on `ph_issues`.
- [ ] No TypeScript errors.
- [ ] Optimistic update visible immediately, persists after refetch (since the same `ph_issues` row is what `useBacklogData` reads).

## Re-probe plan (next iteration)

1. Click summary cell on row 2 (BAU-5609 "External url Behavior") — should enter inline edit.
2. Type new value, blur.
3. Verify toast text mentions Jira approval.
4. Verify `select * from jira_write_back_queue order by created_at desc limit 1` returns the new row.
5. Refresh page; verify the edited summary persists.
