-- jira-compare audit (2026-04-28): align Catalyst /producthub/kanban
-- 'Business Request' workflow scheme to Jira MDT board 597 column scheme.
--
-- Jira (truth):  on-Hold / Funnel / Demand intake / Demand validation (MAX 5) /
--                Analysis & Design (MAX 66) / Pending Approval / Prioritized backlog
--                (MAX 6) / Implementation / Review & QA / UAT / Done
--
-- This migration is idempotent (uses IF NOT EXISTS / WHERE NOT EXISTS guards)
-- and preserves slugs (no FK-style breakage on ph_initiatives.status).

BEGIN;

-- 1. Add columns required for parity (idempotent).
ALTER TABLE catalyst_workflow_statuses
  ADD COLUMN IF NOT EXISTS wip_limit INTEGER NULL;
ALTER TABLE catalyst_workflow_statuses
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add the missing 'Funnel' status if not present.
INSERT INTO catalyst_workflow_statuses
  (scheme_id, name, slug, category, color, position, is_initial, is_final, is_active)
SELECT
  'a0000005-0000-0000-0000-000000000001',
  'Funnel', 'funnel', 'todo', '#DFE1E6', 1, FALSE, FALSE, TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM catalyst_workflow_statuses
  WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001'
    AND slug = 'funnel'
);

-- 3. Reorder + rename to match Jira's exact column scheme.
--    Slugs preserved; only display name (`name`) and `position` change.
UPDATE catalyst_workflow_statuses
   SET position = 0, name = 'On Hold', is_initial = FALSE
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'on_hold';

UPDATE catalyst_workflow_statuses
   SET position = 1, name = 'Funnel', is_initial = TRUE
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'funnel';

UPDATE catalyst_workflow_statuses
   SET position = 2, name = 'Demand Intake', is_initial = FALSE
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'demand_intake';

UPDATE catalyst_workflow_statuses
   SET position = 3, name = 'Demand Validation', wip_limit = 5
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'demand_validation';

UPDATE catalyst_workflow_statuses
   SET position = 4, name = 'Analysis & Design', wip_limit = 66
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'analysis_design';

UPDATE catalyst_workflow_statuses
   SET position = 5, name = 'Pending Approval'
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'pending_approval';

UPDATE catalyst_workflow_statuses
   SET position = 6, name = 'Prioritized Backlog', wip_limit = 6
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'prioritized_backlog';

UPDATE catalyst_workflow_statuses
   SET position = 7, name = 'Implementation'
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'implementation';

UPDATE catalyst_workflow_statuses
   SET position = 8, name = 'Review & QA'
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'review_qa';

UPDATE catalyst_workflow_statuses
   SET position = 9, name = 'UAT'
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'pending_uat_beta';

UPDATE catalyst_workflow_statuses
   SET position = 10, name = 'Done'
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'done';

-- 4. Soft-deactivate Catalyst-only statuses absent from Jira.
--    Initiative rows currently in these slugs (histogram says 0 right now,
--    but preserve for safety) keep their slug; the hook filters on is_active.
UPDATE catalyst_workflow_statuses
   SET is_active = FALSE, position = 100, is_initial = FALSE
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'new';

UPDATE catalyst_workflow_statuses
   SET is_active = FALSE, position = 101
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'ready_for_production';

UPDATE catalyst_workflow_statuses
   SET is_active = FALSE, position = 102
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'canceled';

COMMIT;
