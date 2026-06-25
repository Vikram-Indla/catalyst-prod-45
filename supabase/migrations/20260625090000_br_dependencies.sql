-- Product Hub dependencies store (canonical Dependencies surface, 2026-06-25).
--
-- Products are business_requests, whose keys (MDT-xxx) are NOT in ph_issues, so
-- they cannot use ph_issue_dependencies (its source/target FK references
-- ph_issues and rejects BR keys). This dedicated table mirrors
-- ph_issue_dependencies' shape (type + soft-delete) but holds business-request
-- keys with NO FK on the keys, so any synced BR can be linked.
CREATE TABLE IF NOT EXISTS public.br_dependencies (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_code  text NOT NULL,
  source_key    text NOT NULL,
  target_key    text NOT NULL,
  dependency_type text NOT NULL DEFAULT 'blocks',
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS br_dependencies_product_idx
  ON public.br_dependencies (product_code) WHERE deleted_at IS NULL;

ALTER TABLE public.br_dependencies ENABLE ROW LEVEL SECURITY;

-- Non-PII collaboration data — authenticated users read/write; AdminGuard +
-- product scope gate at the app layer (matches Catalyst ph_comments pattern).
DROP POLICY IF EXISTS br_dependencies_select ON public.br_dependencies;
CREATE POLICY br_dependencies_select ON public.br_dependencies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS br_dependencies_insert ON public.br_dependencies;
CREATE POLICY br_dependencies_insert ON public.br_dependencies
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS br_dependencies_update ON public.br_dependencies;
CREATE POLICY br_dependencies_update ON public.br_dependencies
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
