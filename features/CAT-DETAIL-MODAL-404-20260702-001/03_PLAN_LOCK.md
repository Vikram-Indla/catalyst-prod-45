# Plan Lock — CAT-DETAIL-MODAL-404-20260702-001

## Root causes (verified, not assumed)

**Bug 1 — "Issue not found" false positive.**
`src/components/catalyst-detail-views/shared/hooks/useCatalystIssue.ts:16-22`
— the canonical hook used by ALL 8 CatalystView* issue types (epic, story,
defect, task, incident, feature, subtask, task-catalyst) — queries
`ph_issues` by `issue_key` but only destructures `{ data }`, never checks
`error`. `CatalystDetailRouter.tsx:88-94`'s type-lookup query has the
identical pattern. When the query fails for any reason (RLS, transient
error, schema drift on `ph_issues` — the same table that's had several
migrations land in the last 24h: epic color/status columns, sprint native
columns, sprint FK backfill), `data` comes back null/undefined and
`isNotFound={!isLoading && issue === null}` in every CatalystViewEpic /
CatalystViewStory / etc. fires, rendering "Issue not found" for a real,
present row. Wiring (backlog table → router → view) is correct — this is
purely an error-swallowing bug, confirmed by the same anti-pattern already
fixed in b47ae4356 and c414c418b in this repo today.

**Bug 2 — workflow-statuses schema-cache error.**
`src/components/workhub/create-story/useCreateStory.ts:207-238`,
`useWorkflowStatuses(workType, _projectId)` (a *different* function from
the already-fixed `src/hooks/useTypeWorkflow.ts`). Uses a PostgREST
embedded join (`ph_workflow_statuses!inner(...)`) which requires a live FK
between `ph_workflow_type_statuses` and `ph_workflow_statuses`. That FK
did not exist anywhere in the migration chain until today's
`20260702120000_workflow_wiring_repair.sql` (commit b47ae4356), which
fixed the *sibling* hook `useTypeWorkflow.ts` by replacing the embed with
two flat queries joined in JS — but never touched this second call site.
Also: `_projectId` param is accepted but never used to filter, so it
over-fetches every project's statuses for a given work type.

## Non-scope
- Not touching Sprints feature work (CAT-SPRINTS-NATIVE-20260702-002).
- Not re-running/re-verifying the migration in b47ae4356 — assumed applied
  (out of scope; if the console error persists after this fix with a fresh
  schema-cache reload, that's a deploy/ops issue, not a code issue).
- Not investigating *why* `ph_issues` queries might fail beyond surfacing
  the real error — once surfaced, the actual Postgres/RLS message will be
  visible in the UI and console for follow-up if still broken.

## Timebox
Under 1 hour — mechanical, pattern-matched fix reusing an already-proven
in-repo pattern (SectionMessage + Retry from b47ae4356).

## Canonical components
- `src/components/ads/SectionMessage.tsx` (existing, already fixed for
  action-object crash in b47ae4356) — reused for the new error state, no
  new UI pattern invented.

## Files to modify
1. `src/components/catalyst-detail-views/shared/hooks/useCatalystIssue.ts`
   — destructure `error`, throw if present.
2. `src/components/catalyst-detail-views/CatalystDetailRouter.tsx` — same
   fix on the type-lookup query (~line 88-94).
3. `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` —
   add `isError`/`error`/`onRetry` props; render `SectionMessage` error
   state (checked *before* the `isNotFound` branch) instead of falling
   into "Issue not found".
4. The 8 CatalystView* type components (epic, story, defect, task,
   task-catalyst, incident, feature, subtask) — destructure
   `isError, error, refetch` from `useCatalystIssue` and pass through to
   `CatalystViewBase`. Mechanical, ~3 lines each, no logic changes beyond
   plumbing.
5. `src/components/workhub/create-story/useCreateStory.ts` —
   `useWorkflowStatuses`: replace the `!inner` embed with the two-flat-
   query pattern from `useTypeWorkflow.ts` (fetch type_statuses, collect
   status_ids, fetch statuses `in (...)`, join in JS); also wire up the
   currently-ignored `_projectId` to actually filter.

## Files forbidden
- No migration files (schema is out of scope — b47ae4356 already shipped
  the FK; not touching DB state).
- No changes to Sprints-related files.

## Data/backend rules
- Zero-assumption: on real query failure, render the actual error message
  (`SectionMessage` + Retry), never a fabricated "not found"/empty state.

## Validation
- `npx tsc -p tsconfig.app.json --noEmit` (baseline ~157 pre-existing
  errors per memory — confirm no new ones introduced).
- Manual verification on localhost:8080: open BAU backlog, click into an
  epic and a story, confirm real content renders (not "Issue not found").
  Confirm console no longer emits the `ph_workflow_type_statuses`
  relationship error when opening Create Story.
- Screenshot before/after per CLAUDE.md screenshot signoff (dark mode).

## Stop conditions
- If `ph_issues` SELECT still errors after the throw-on-error fix lands
  (i.e. the real underlying error is something other than transient/
  already-fixed), STOP and report the actual error text — do not guess a
  second fix blind.
