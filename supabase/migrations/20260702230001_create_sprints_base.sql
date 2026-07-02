-- Prod reconciliation 2026-07-02: sprints (legacy per-project sprint table) existed
-- only out-of-band on dev/staging (no CREATE migration anywhere in the chain).
-- Base shape dumped from staging cyij pg_catalog, MINUS the slug column/trigger
-- that 20260701000008_sprints_slugs adds so that migration applies cleanly on top.
-- Staging runs this table with RLS disabled and no policies; mirrored for parity.

CREATE TABLE IF NOT EXISTS public.sprints (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name       varchar,
  status     varchar,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, name)
);
