# Objective — CAT-DETAIL-MODAL-404-20260702-001

Found incidentally while linking a test item to a sprint (unrelated to
CAT-SPRINTS-NATIVE-20260702-002). Two bugs on the BAU project backlog
(/project-hub/BAU/backlog):

1. Clicking any work item's key link (BAU-13, BAU-316, etc.) opens the
   detail modal, which renders correctly (CatalystDetailRouter →
   CatalystViewEpic/Story/etc. mounts fine) but shows "Issue not found —
   This issue may have been deleted or the key is invalid" even though the
   row is visibly present in the backlog table. Reproduces on every item
   tested — not a one-off bad row.

2. Console spam on the same pages: `[useWorkflowStatuses] lookup error:
   Could not find a relationship between 'ph_workflow_type_statuses' and
   'ph_workflow_statuses' in the schema cache`, from
   src/components/workhub/create-story/useCreateStory.ts:184.

Both are confirmed instances of the same bug class this repo fixed twice
today already (b47ae4356, c414c418b): a Supabase/PostgREST query that
destructures only `{ data }`, discards `{ error }`, and a real backend
failure gets misread by the UI as "record doesn't exist" / "empty".
