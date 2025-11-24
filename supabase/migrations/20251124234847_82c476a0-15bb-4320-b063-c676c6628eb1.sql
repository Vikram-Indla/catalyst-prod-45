-- Remove Business Request reference from epics table (non-Jira Align field)
-- This aligns the schema strictly with Jira Align specification

ALTER TABLE public.epics
DROP COLUMN IF EXISTS br_id;