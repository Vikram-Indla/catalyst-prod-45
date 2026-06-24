-- ph_issues column parity — add backlog-required columns missing on staging.
--
-- 2026-06-24: backlog (/project-hub/:key/backlog) showed 0 tickets on staging despite
-- ph_issues holding synced data (BAU 1510 rows). Root cause: useProjectListItems'
-- query references columns that exist on PROD but were missing on STAGING — PostgREST
-- rejects the entire query on an unknown column, so the backlog returns empty:
--   .is('archived_at', null)   filter
--   SELECT ... is_flagged, flag_reason, severity ...
-- Types match prod (verified via MCP on lmqwtldpfacrrlvdnmld). Idempotent.

ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS severity text;
