-- Add classification fields to features table for full editability
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id),
ADD COLUMN IF NOT EXISTS business_owner_id uuid REFERENCES public.business_owners(id),
ADD COLUMN IF NOT EXISTS risk text CHECK (risk IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS environment text,
ADD COLUMN IF NOT EXISTS labels text[],
ADD COLUMN IF NOT EXISTS components text[];

-- Add indexes for the new FK columns
CREATE INDEX IF NOT EXISTS idx_features_department_id ON public.features(department_id);
CREATE INDEX IF NOT EXISTS idx_features_product_id ON public.features(product_id);
CREATE INDEX IF NOT EXISTS idx_features_business_owner_id ON public.features(business_owner_id);

-- Comment on new columns
COMMENT ON COLUMN public.features.department_id IS 'Department responsible for this feature';
COMMENT ON COLUMN public.features.product_id IS 'Product this feature belongs to';
COMMENT ON COLUMN public.features.business_owner_id IS 'Business owner for this feature';
COMMENT ON COLUMN public.features.risk IS 'Risk level: low, medium, high, critical';
COMMENT ON COLUMN public.features.environment IS 'Target environment: development, staging, production';
COMMENT ON COLUMN public.features.labels IS 'Array of labels/tags for classification';
COMMENT ON COLUMN public.features.components IS 'Array of components/services affected';