-- CAT-SPRINTS-NATIVE-20260702-002 S0.3: sprint status vocabulary (D-005).
-- planning / active / awaiting_approval / completed / canceled / archived
-- replaces the release-vocabulary CHECK (planning|in_progress|released|archived).
-- Mapping: in_progress -> active, released -> completed (identity: planning, archived).
-- Snapshot table keeps the pre-migration values because the reverse mapping is
-- lossy (completed can't distinguish original 'released' from future native rows).

BEGIN;

CREATE TABLE IF NOT EXISTS public._ph_jira_sprints_status_migration_20260703 AS
  SELECT id, status AS old_status, now() AS captured_at FROM public.ph_jira_sprints;

ALTER TABLE public.ph_jira_sprints
  DROP CONSTRAINT IF EXISTS ph_jira_sprints_status_check;

UPDATE public.ph_jira_sprints SET status = 'active'    WHERE status = 'in_progress';
UPDATE public.ph_jira_sprints SET status = 'completed' WHERE status = 'released';

ALTER TABLE public.ph_jira_sprints
  ADD CONSTRAINT ph_jira_sprints_status_check
  CHECK (status = ANY (ARRAY[
    'planning','active','awaiting_approval','completed','canceled','archived'
  ])) NOT VALID;
ALTER TABLE public.ph_jira_sprints VALIDATE CONSTRAINT ph_jira_sprints_status_check;

COMMIT;
