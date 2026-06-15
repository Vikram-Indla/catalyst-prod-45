-- ============================================================================
-- Product board parity migration (2026-06-15)
--
-- Adds the columns and link table that bring the product-hub kanban board to
-- 100% feature parity with the project-hub kanban board's ⋯ menu:
--
--   - is_flagged       → "Add flag" / "Remove flag"
--   - parent_request_id → "Add parent" (hierarchy navigation)
--   - business_request_relations → "Link work item" (Blocks / Relates / etc.)
--       NOTE: there is already a public.business_request_links table for
--       documentation/file attachments — different concept. We use
--       `_relations` here so the two don't collide.
--
-- Labels already work via the existing `tags text[]` column; the adapter on
-- the client maps tags ↔ labels so no migration is needed for labels.
--
-- Standups work for product without a migration: the `standups.project_key`
-- column is plain text, so the product-board call just passes the product
-- code (e.g. 'INV') as project_key.
--
-- Per CLAUDE.md the new table's RLS policies live in this same migration.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. New columns on business_requests
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.business_requests
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false;

ALTER TABLE public.business_requests
  ADD COLUMN IF NOT EXISTS parent_request_id uuid;

-- Add FK in a separate, idempotent step so the migration is safe to re-run.
ALTER TABLE public.business_requests
  DROP CONSTRAINT IF EXISTS business_requests_parent_request_id_fkey;

ALTER TABLE public.business_requests
  ADD CONSTRAINT business_requests_parent_request_id_fkey
    FOREIGN KEY (parent_request_id)
    REFERENCES public.business_requests(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS business_requests_parent_request_id_idx
  ON public.business_requests (parent_request_id);

CREATE INDEX IF NOT EXISTS business_requests_is_flagged_idx
  ON public.business_requests (is_flagged)
  WHERE is_flagged = true;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. business_request_relations — mirrors ph_issue_links shape
--
-- NAMING NOTE (2026-06-15): there is an existing public.business_request_links
-- table used for documentation links and file attachments — completely
-- different concept (title/url/file_path/etc.). We use `_relations` here to
-- avoid collision and signal the BR-to-BR Blocks/Relates/Duplicates semantics
-- mirrored from ph_issue_links.
--
-- source_key / target_key reference business_requests.request_key (text).
-- This matches the ph_issue_links pattern, which references ph_issues.issue_key.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_request_relations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key  text NOT NULL,
  target_key  text NOT NULL,
  link_type   text NOT NULL,
  created_by  uuid NOT NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_request_relations_no_self_link
    CHECK (source_key <> target_key),
  CONSTRAINT business_request_relations_type_check
    CHECK (link_type = ANY (ARRAY[
      'blocks', 'is blocked by',
      'is cloned by', 'clones',
      'is duplicated by', 'duplicates',
      'is implemented by', 'implements',
      'relates to',
      'child of', 'parent of'
    ])),
  CONSTRAINT business_request_relations_unique
    UNIQUE (source_key, target_key, link_type)
);

CREATE INDEX IF NOT EXISTS business_request_relations_source_idx
  ON public.business_request_relations (source_key);
CREATE INDEX IF NOT EXISTS business_request_relations_target_idx
  ON public.business_request_relations (target_key);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RLS for business_request_relations (same pattern as ph_issue_links)
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.business_request_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage business request links"
  ON public.business_request_relations;

CREATE POLICY "Authenticated users can manage business request links"
  ON public.business_request_relations
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Patch log_business_request_create() to remove the dead NEW.requestor ref
--
-- BUG: the AFTER INSERT trigger function `log_business_request_create()`
-- references `NEW.requestor`, but the `requestor` column was dropped from
-- business_requests by migration 20260601200000. Every INSERT into
-- business_requests therefore raises:
--   42703: record "new" has no field "requestor"
--
-- Found while wiring the product kanban board's inline create form
-- (2026-06-15). Fix: rewrite the function to resolve actor_name via a
-- profiles lookup keyed by auth.uid()/created_by, fall back to 'System'.
-- Audit log shape is unchanged.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_business_request_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.business_request_audit_logs (
    business_request_id,
    action,
    actor_id,
    actor_name,
    field_changed,
    old_value,
    new_value
  ) VALUES (
    NEW.id,
    'CREATE',
    COALESCE(auth.uid(), NEW.created_by),
    COALESCE(
      (SELECT full_name FROM public.profiles
        WHERE id = COALESCE(auth.uid(), NEW.created_by)),
      'System'
    ),
    'Request Created',
    NULL,
    NEW.title
  );
  RETURN NEW;
END;
$$;
