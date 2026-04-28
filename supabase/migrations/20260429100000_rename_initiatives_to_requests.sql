-- 2026-04-29 — Domain rename: initiatives → requests
--
-- Catalyst's "initiative" entity was always a misnomer for the broader
-- Business Request workflow. Renaming the entire surface so the schema
-- matches the canonical product term.
--
-- Scope:
--   * 9 tables: ph_initiatives + 8 child tables → ph_requests + ph_request_*
--   * 3 views: ph_backlog_initiatives_view, ph_initiatives_list,
--              ph_roadmap_initiatives_view (DROPped CASCADE; recreate elsewhere)
--   * Column initiative_id → request_id on every child table
--   * FK constraints, indexes, triggers, RLS policies — all renamed via
--     dynamic DO blocks for forward-compat
--
-- Rollback: reverse the ALTER TABLE RENAME statements (table-level renames
-- are reversible). Recreating the dropped views requires their original
-- DDL — capture before running this migration in production.

BEGIN;

-- ============ Drop dependent views first (will recreate at end) ============
DROP VIEW IF EXISTS ph_backlog_initiatives_view CASCADE;
DROP VIEW IF EXISTS ph_initiatives_list         CASCADE;
DROP VIEW IF EXISTS ph_roadmap_initiatives_view CASCADE;

-- ============ Rename tables ============
ALTER TABLE IF EXISTS ph_initiatives              RENAME TO ph_requests;
ALTER TABLE IF EXISTS ph_initiative_comments      RENAME TO ph_request_comments;
ALTER TABLE IF EXISTS ph_initiative_attachments   RENAME TO ph_request_attachments;
ALTER TABLE IF EXISTS ph_initiative_audit_log     RENAME TO ph_request_audit_log;
ALTER TABLE IF EXISTS ph_initiative_budget_items  RENAME TO ph_request_budget_items;
ALTER TABLE IF EXISTS ph_initiative_milestones    RENAME TO ph_request_milestones;
ALTER TABLE IF EXISTS ph_initiative_risks         RENAME TO ph_request_risks;
ALTER TABLE IF EXISTS ph_initiative_links         RENAME TO ph_request_links;
ALTER TABLE IF EXISTS ph_initiative_scores        RENAME TO ph_request_scores;

-- ============ Rename FK column initiative_id → request_id everywhere ============
ALTER TABLE ph_request_comments      RENAME COLUMN initiative_id TO request_id;
ALTER TABLE ph_request_attachments   RENAME COLUMN initiative_id TO request_id;
ALTER TABLE ph_request_audit_log     RENAME COLUMN initiative_id TO request_id;
ALTER TABLE ph_request_budget_items  RENAME COLUMN initiative_id TO request_id;
ALTER TABLE ph_request_milestones    RENAME COLUMN initiative_id TO request_id;
ALTER TABLE ph_request_risks         RENAME COLUMN initiative_id TO request_id;
ALTER TABLE ph_request_links         RENAME COLUMN initiative_id TO request_id;
ALTER TABLE ph_request_scores        RENAME COLUMN initiative_id TO request_id;

-- ============ Rename FK constraints ============
DO $$
DECLARE
  rec RECORD;
  new_name TEXT;
BEGIN
  FOR rec IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE conname LIKE '%initiative%'
  LOOP
    new_name := replace(rec.conname, 'initiative', 'request');
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
                   rec.tbl, rec.conname, new_name);
  END LOOP;
END $$;

-- ============ Rename indexes ============
DO $$
DECLARE
  rec RECORD;
  new_name TEXT;
BEGIN
  FOR rec IN
    SELECT indexname, schemaname
    FROM pg_indexes
    WHERE indexname LIKE '%initiative%' AND schemaname = 'public'
  LOOP
    new_name := replace(rec.indexname, 'initiative', 'request');
    EXECUTE format('ALTER INDEX %I.%I RENAME TO %I',
                   rec.schemaname, rec.indexname, new_name);
  END LOOP;
END $$;

-- ============ Rename triggers ============
DO $$
DECLARE
  rec RECORD;
  new_name TEXT;
BEGIN
  FOR rec IN
    SELECT tgname, tgrelid::regclass::text AS tbl
    FROM pg_trigger
    WHERE tgname LIKE '%initiative%' AND NOT tgisinternal
  LOOP
    new_name := replace(rec.tgname, 'initiative', 'request');
    EXECUTE format('ALTER TRIGGER %I ON %s RENAME TO %I',
                   rec.tgname, rec.tbl, new_name);
  END LOOP;
END $$;

-- ============ Rename RLS policies ============
DO $$
DECLARE
  rec RECORD;
  new_name TEXT;
BEGIN
  FOR rec IN
    SELECT polname, schemaname || '.' || tablename AS tbl
    FROM pg_policies
    WHERE polname LIKE '%initiative%' AND schemaname = 'public'
  LOOP
    new_name := replace(rec.polname, 'initiative', 'request');
    EXECUTE format('ALTER POLICY %I ON %s RENAME TO %I',
                   rec.polname, rec.tbl, new_name);
  END LOOP;
END $$;

-- ============ Reload PostgREST schema cache ============
NOTIFY pgrst, 'reload schema';
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE application_name ILIKE '%postgrest%' OR application_name ILIKE '%pgrst%';

-- ============ Re-grant on the new tables ============
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.ph_requests, public.ph_request_comments, public.ph_request_attachments,
  public.ph_request_audit_log, public.ph_request_budget_items,
  public.ph_request_milestones, public.ph_request_risks,
  public.ph_request_links, public.ph_request_scores
TO anon, authenticated, authenticator, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
