-- jira-compare audit (2026-04-28) — v3, evidence-driven, write-safe.
-- Aligns Catalyst /producthub/kanban 'Business Request' workflow scheme to
-- Jira board 597 ("Internal Portal", project MDT, filterId 12370).
--
-- Evidence pointers:
--   * Board column structure + WIP `max` values:
--       /rest/agile/1.0/board/597/configuration → columnConfig.columns[*].max
--       (Demand validation max=5, Analysis & Design max=6, Prioritized backlog max=6)
--   * Board has 13 Jira-side columns including hidden `Backlog` (no statuses) and
--     `Ready for production` (no statuses). Both are no-ops on Jira and not
--     mirrored into Catalyst.
--   * `initiative_status` enum (declared in migration 20260217215853) currently
--     allows: new_demand, under_review, approved, in_progress, on_hold,
--     delivered, closed, cancelled. Histogram on 47 rows: closed=16,
--     in_progress=24, on_hold=1, new_demand=4, under_review=2.
--
-- Strategy:
--   * EXTEND the enum to include every active workflow slug. After this
--     migration, dragging a card to ANY column writes a valid enum value
--     (the column's `slug`).
--   * EXISTING data keeps its old enum values — slug_aliases on each column
--     route those values to the right column on read. So no data migration.
--   * When a card is dragged from one column to another, onStatusChange
--     writes the new column slug, which is now also a valid enum value.

-- ============================================================================
-- 1. Extend initiative_status enum.
--    `ADD VALUE IF NOT EXISTS` is idempotent; safe to re-run.
--    Note: ALTER TYPE ADD VALUE in pre-PG-12 cannot run inside a transaction
--    with other commands, so these are emitted outside the BEGIN/COMMIT.
-- ============================================================================
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'funnel';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'demand_intake';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'demand_validation';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'analysis_design';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'prioritized_backlog';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'implementation';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'review_qa';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'pending_uat_beta';
ALTER TYPE initiative_status ADD VALUE IF NOT EXISTS 'done';

-- ============================================================================
-- 2. Schema additions on catalyst_workflow_statuses.
-- ============================================================================
BEGIN;

ALTER TABLE catalyst_workflow_statuses
  ADD COLUMN IF NOT EXISTS wip_limit    INTEGER NULL;
ALTER TABLE catalyst_workflow_statuses
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE catalyst_workflow_statuses
  ADD COLUMN IF NOT EXISTS slug_aliases TEXT[]  NOT NULL DEFAULT '{}';

------------------------------------------------------------------------
-- 3. Insert missing 'Funnel' status.
------------------------------------------------------------------------
INSERT INTO catalyst_workflow_statuses
  (scheme_id, name, slug, category, color, position, is_initial, is_final,
   wip_limit, is_active, slug_aliases)
SELECT
  'a0000005-0000-0000-0000-000000000001',
  'Funnel', 'funnel', 'todo', '#DFE1E6', 1, FALSE, FALSE,
  NULL, TRUE, '{}'::TEXT[]
WHERE NOT EXISTS (
  SELECT 1 FROM catalyst_workflow_statuses
   WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001'
     AND slug = 'funnel'
);

------------------------------------------------------------------------
-- 4. Reorder + rename + WIP + slug_aliases per Jira column scheme.
--    slug stays stable (also now a valid initiative_status enum value).
--    slug_aliases route legacy enum values to the right column on read.
------------------------------------------------------------------------
UPDATE catalyst_workflow_statuses
   SET position = 0, name = 'On Hold', is_initial = FALSE,
       slug_aliases = '{}'::TEXT[]                       -- 'on_hold' = slug
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'on_hold';

UPDATE catalyst_workflow_statuses
   SET position = 1, name = 'Funnel', is_initial = TRUE,
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'funnel';

UPDATE catalyst_workflow_statuses
   SET position = 2, name = 'Demand Intake', is_initial = FALSE,
       slug_aliases = ARRAY['new_demand']::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'demand_intake';

UPDATE catalyst_workflow_statuses
   SET position = 3, name = 'Demand Validation', wip_limit = 5,
       slug_aliases = ARRAY['under_review']::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'demand_validation';

UPDATE catalyst_workflow_statuses
   SET position = 4, name = 'Analysis & Design', wip_limit = 6,
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'analysis_design';

UPDATE catalyst_workflow_statuses
   SET position = 5, name = 'Pending Approval',
       slug_aliases = ARRAY['approved']::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'pending_approval';

UPDATE catalyst_workflow_statuses
   SET position = 6, name = 'Prioritized Backlog', wip_limit = 6,
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'prioritized_backlog';

UPDATE catalyst_workflow_statuses
   SET position = 7, name = 'Implementation',
       slug_aliases = ARRAY['in_progress']::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'implementation';

UPDATE catalyst_workflow_statuses
   SET position = 8, name = 'Review & QA',
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'review_qa';

UPDATE catalyst_workflow_statuses
   SET position = 9, name = 'UAT',
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'pending_uat_beta';

UPDATE catalyst_workflow_statuses
   SET position = 10, name = 'Done',
       slug_aliases = ARRAY['closed', 'delivered', 'cancelled']::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'done';

------------------------------------------------------------------------
-- 5. Soft-deactivate Catalyst-only columns absent from Jira parity.
------------------------------------------------------------------------
UPDATE catalyst_workflow_statuses
   SET is_active = FALSE, position = 100, is_initial = FALSE,
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'new';

UPDATE catalyst_workflow_statuses
   SET is_active = FALSE, position = 101,
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'ready_for_production';

UPDATE catalyst_workflow_statuses
   SET is_active = FALSE, position = 102,
       slug_aliases = '{}'::TEXT[]
 WHERE scheme_id = 'a0000005-0000-0000-0000-000000000001' AND slug = 'canceled';

COMMIT;
