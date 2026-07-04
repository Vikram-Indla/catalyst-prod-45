# Validation Evidence — CAT-DETAIL-MODAL-404-20260702-001

## tsc
`npx tsc -p tsconfig.app.json --noEmit` — zero new errors in any touched file
(baseline ~157-186 pre-existing errors, none in: useCatalystIssue.ts,
CatalystDetailRouter.tsx, CatalystViewBase.tsx, the 7 CatalystView* files,
useCreateStory.ts, useBacklogData.ts).

## Root cause correction (mid-flight)
Initial hypothesis (swallowed Supabase error) was real but NOT the cause of
the reported symptom. Live verification via authenticated fetch from the
browser session revealed the actual cause: `ph_issues.deleted_at` set on 36
BAU rows, two bulk timestamps. Cross-checked all 36 keys against live Jira
(digital-transformation.atlassian.net) via JQL:
- 21 confirmed alive/legitimate in Jira → wrongly soft-deleted → restored.
- 14 confirmed legitimately deleted (test junk, non-existent-in-Jira rows,
  individual WF-TEST fixtures) → left alone.
- 1 (BAU-6077) ambiguous → left for manual review, not auto-restored.

## Live browser verification (localhost:8080, catalyst-staging DB)
- BAU-13 ("Chemical Permits", Epic, DONE) — detail modal now renders full
  content instead of "Issue not found". Screenshot captured.
- BAU-316 ("Mobile Revamp App", Epic, IN PROGRESS) — same. Screenshot
  captured.
- Create Story modal opened on BAU backlog — console checked for
  `[useWorkflowStatuses] lookup error` / relationship error: zero
  occurrences. Full network log (14 requests) shows no request to
  `ph_workflow_type_statuses` / `ph_workflow_statuses` failing or erroring.

## Database change
Migration `20260703220000_restore_wrongly_deleted_bau_issues.sql` applied
directly to catalyst-staging (cyijbdeuehohvhnsywig) via
`supabase db query --linked -f <file>` after `supabase link
--project-ref cyijbdeuehohvhnsywig`. `db push` was avoided — the remote
migration history had unrelated drift (naming-convention mismatches from
an older batch) that would have required a broader, out-of-scope repair.
Row count assertion (`RAISE EXCEPTION` if != 21) inside the migration's
DO block guarded against a partial/wrong match; ran clean.
Post-apply spot check: `deleted_at IS NULL` confirmed for
BAU-13/BAU-2737/BAU-316/BAU-3903.
