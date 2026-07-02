# Session 001 — Investigate and fix

Full investigation + fix in one session. See 01_OBJECTIVE.md, 03_PLAN_LOCK.md,
06_VALIDATION_EVIDENCE.md for details.

## Summary
1. Two parallel investigation agents found a real bug (Supabase error
   swallowing in useCatalystIssue.ts + useCreateStory.ts's
   useWorkflowStatuses) matching a pattern already fixed twice in this repo
   today (b47ae4356, c414c418b). Applied that fix across 11 files.
2. Verifying live in the browser showed the fix did NOT resolve the
   reported symptom — RED FLAG raised per CLAUDE.md. Deeper investigation
   (authenticated fetch from the live session) found the actual cause:
   ph_issues.deleted_at wrongly set on 36 BAU rows across two bulk
   timestamps, while the backlog list query never filtered deleted_at.
3. Cross-checked all 36 keys against live Jira. 21 confirmed wrongly
   deleted (alive in Jira, share exact per-batch timestamps) → user
   confirmed via AskUserQuestion → restored via direct SQL migration
   against catalyst-staging. 14 confirmed legitimately deleted, left
   alone. 1 ambiguous (BAU-6077), flagged for manual review.
4. Fixed useBacklogData.ts (epic + story queries) to filter deleted_at,
   matching the detail view — defense in depth against recurrence.
5. Verified live: BAU-13 and BAU-316 now open correctly. Console error
   for ph_workflow_type_statuses/ph_workflow_statuses gone.

## Files changed
- src/components/catalyst-detail-views/shared/hooks/useCatalystIssue.ts
- src/components/catalyst-detail-views/CatalystDetailRouter.tsx
- src/components/catalyst-detail-views/shared/CatalystViewBase.tsx
- src/components/catalyst-detail-views/{epic,story,defect,task,incident,feature,subtask}/CatalystView*.tsx
- src/components/workhub/create-story/useCreateStory.ts
- src/modules/project-work-hub/hooks/useBacklogData.ts
- supabase/migrations/20260703220000_restore_wrongly_deleted_bau_issues.sql (applied to catalyst-staging)

## Not yet committed
Awaiting user go-ahead per commit gate.
