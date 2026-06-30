-- CAT-MILESTONE-DETAIL-20260630-001 — Slice 1
--
-- Bring product_milestones up to schema parity with ph_releases so the canonical
-- ReleaseDetailPage can mount with MILESTONE_CONFIG.
--
-- Adds:
--   - product_milestones.description              text
--   - product_milestones.section_name             text
--   - product_milestones.section_description_adf  jsonb
--   - public.product_milestone_approvers          table  (mirrors ph_release_approvers)
--
-- Touches no existing data. All adds are additive + nullable.

BEGIN;

-- 1. New columns on product_milestones
ALTER TABLE public.product_milestones
  ADD COLUMN IF NOT EXISTS description             text,
  ADD COLUMN IF NOT EXISTS section_name            text,
  ADD COLUMN IF NOT EXISTS section_description_adf jsonb;

-- 2. Approvers table (mirrors public.ph_release_approvers exactly — same column
--    set, same FK targets, same status CHECK).
CREATE TABLE IF NOT EXISTS public.product_milestone_approvers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id  uuid NOT NULL REFERENCES public.product_milestones(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id)            ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  description   text,
  added_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_milestone_approvers_milestone_id_idx
  ON public.product_milestone_approvers (milestone_id);
CREATE INDEX IF NOT EXISTS product_milestone_approvers_user_id_idx
  ON public.product_milestone_approvers (user_id);

-- updated_at trigger (mirrors release approvers behaviour)
CREATE OR REPLACE FUNCTION public.tg_product_milestone_approvers_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_milestone_approvers_set_updated_at
  ON public.product_milestone_approvers;
CREATE TRIGGER product_milestone_approvers_set_updated_at
  BEFORE UPDATE ON public.product_milestone_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_product_milestone_approvers_set_updated_at();

-- 3. RLS — mirror ph_release_approvers (all four policies USING true /
--    WITH CHECK true). Tighten later if release-approvers RLS is tightened.
ALTER TABLE public.product_milestone_approvers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_milestone_approvers_select
  ON public.product_milestone_approvers;
CREATE POLICY product_milestone_approvers_select
  ON public.product_milestone_approvers
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS product_milestone_approvers_insert
  ON public.product_milestone_approvers;
CREATE POLICY product_milestone_approvers_insert
  ON public.product_milestone_approvers
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS product_milestone_approvers_update
  ON public.product_milestone_approvers;
CREATE POLICY product_milestone_approvers_update
  ON public.product_milestone_approvers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS product_milestone_approvers_delete
  ON public.product_milestone_approvers;
CREATE POLICY product_milestone_approvers_delete
  ON public.product_milestone_approvers
  FOR DELETE
  USING (true);

COMMIT;
