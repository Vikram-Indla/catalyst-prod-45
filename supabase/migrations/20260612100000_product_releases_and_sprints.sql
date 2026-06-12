-- Product Releases: parent entity in product module
-- Release → many Sprints/Iterations (Sprint/Iteration is child of Release)
-- Attached to a product (product_id nullable to support product-agnostic releases)

CREATE TABLE IF NOT EXISTS public.product_releases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name        text NOT NULL,
  start_date  date,
  end_date    date,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_releases_name_unique UNIQUE (product_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_releases_product_id ON public.product_releases(product_id);

-- Product Sprints / Iterations: children of a Release
CREATE TABLE IF NOT EXISTS public.product_sprints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  uuid NOT NULL REFERENCES public.product_releases(id) ON DELETE CASCADE,
  name        text NOT NULL,
  start_date  date,
  end_date    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_sprints_name_unique UNIQUE (release_id, name)
);

CREATE INDEX IF NOT EXISTS idx_product_sprints_release_id ON public.product_sprints(release_id);

-- Link business_requests → product_releases
ALTER TABLE public.business_requests
  ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.product_releases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_business_requests_release_id ON public.business_requests(release_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER product_releases_updated_at
  BEFORE UPDATE ON public.product_releases
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS
ALTER TABLE public.product_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sprints  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_releases_select" ON public.product_releases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_releases_insert" ON public.product_releases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "product_releases_update" ON public.product_releases
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "product_releases_delete" ON public.product_releases
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
    )
  );

CREATE POLICY "product_sprints_select" ON public.product_sprints
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_sprints_insert" ON public.product_sprints
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "product_sprints_delete" ON public.product_sprints
  FOR DELETE TO authenticated
  USING (true);
