-- Prod reconciliation 2026-07-02: product_milestones existed only out-of-band on
-- dev/staging (no CREATE migration anywhere in the chain). This is the base shape
-- dumped from staging cyij pg_catalog, MINUS the three columns that
-- 20260630010000_product_milestone_canonical_parity adds (description,
-- section_name, section_description_adf) so that migration applies cleanly on top.
-- Staging runs this table with RLS disabled and no policies; mirrored here for
-- parity (access is gated by the app's product UI).

CREATE TABLE IF NOT EXISTS public.product_milestones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title       text NOT NULL,
  start_date  date,
  end_date    date,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  target_date date,
  status      varchar,
  sequence    integer,
  archived_at timestamptz,
  quarter     varchar,
  key         varchar UNIQUE,
  UNIQUE (product_id, title)
);

CREATE INDEX IF NOT EXISTS idx_product_milestones_product_id  ON public.product_milestones (product_id);
CREATE INDEX IF NOT EXISTS idx_product_milestones_quarter     ON public.product_milestones (quarter);
CREATE INDEX IF NOT EXISTS idx_product_milestones_target_date ON public.product_milestones (target_date);
CREATE INDEX IF NOT EXISTS idx_product_milestones_status      ON public.product_milestones (status);
CREATE INDEX IF NOT EXISTS idx_product_milestones_key         ON public.product_milestones (key);
