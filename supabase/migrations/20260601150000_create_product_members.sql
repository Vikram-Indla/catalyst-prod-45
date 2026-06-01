-- Mirror of project_members for the products module.
-- Used by the canonical HeaderChip when mounted on /product-hub/:code/* surfaces.
-- RLS mirrors project_members exactly (permissive for authenticated).
-- Schema matches project_members: id / *_id / user_id / role / created_at / updated_at.

CREATE TABLE IF NOT EXISTS public.product_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS product_members_product_id_idx ON public.product_members(product_id);
CREATE INDEX IF NOT EXISTS product_members_user_id_idx ON public.product_members(user_id);

ALTER TABLE public.product_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product members are viewable by authenticated users"
  ON public.product_members FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Product members are manageable by authenticated users"
  ON public.product_members FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_product_members_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_members_updated_at_trg
  BEFORE UPDATE ON public.product_members
  FOR EACH ROW EXECUTE FUNCTION public.update_product_members_updated_at();
