# Session 001 — 2026-07-02 — Discovery + Council + Plan Lock + P0

- Ran 17 agents (10 discovery, 5 council advisors, 2 planners) via /anthropic-skills:council.
- Live-DB verified: prod (lmqw) healthy for BAU workflows; cyij missing archived_at on ph_workflow_statuses → empty board root cause.
- Plan approved by Vikram (plan mode ExitPlanMode) → 03_PLAN_LOCK.md.
- Executing P0.1 (cyij repair + real CREATE migrations) and P0.2 (unswallow errors).

## P0 log
- ROOT CAUSE (deeper than plan): cyij drift = missing archived_at column + missing FKs on ph_workflow_type_statuses/transitions (PostgREST embed dead) + RLS disabled on both. AND error invisibility had TWO extra layers: (1) React Query pauses retries when tab unfocused → status pending/paused renders as neither loading nor error; (2) canonical ads SectionMessage wrapper passed action objects raw to Atlaskit → crashed error boundary the first time an error DID render.
- P0.1: migration `20260702120000_workflow_wiring_repair.sql` (archived_at, CREATE IF NOT EXISTS both tables, FK backfill DO-block, RLS enable + 4 policies). Applied to cyij via Management API; verified has_col=1, ts_fks=2, tr_fks=3, pols=4.
- P0.2: WorkflowAdminPage StatusBoard + TemplatesView + CatalystWorkflowBuilder now render SectionMessage(error, Retry) on `isError || error`; fixed SectionMessage wrapper to wrap actions in SectionMessageAction.
- VERIFIED live on 8080: board renders Story workflow 11 statuses (3 To do / 2 In progress / 6 Done, ★ initial); error banner shows real cause when column missing (probed both states). Diagram toolbar reports 11 statuses • 20 transitions.
- Gates: tsc clean, lint:colors:gate 0/0, audit:ads:gate all at baseline.
- Screenshots: before (empty board), error state, after (populated board) — captured in session.
