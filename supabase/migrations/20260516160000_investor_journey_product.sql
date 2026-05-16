-- Soft-delete stale seed products not created by the user.
-- FK constraints (features.product_id, improvement_initiatives.product_id)
-- prevent hard-delete, so is_active=false is the correct approach.
UPDATE public.products
SET is_active = false, updated_at = now()
WHERE code IN ('MINI', 'SEN', 'ENT', 'UNA');

-- Upsert the single real product line: Investor Journey Product (INV).
INSERT INTO public.products (code, name, description, color, is_active, sort_order)
VALUES (
  'INV',
  'Investor Journey Product',
  'MIM Digital Transformation Demand',
  '#0747A6',
  true,
  1
)
ON CONFLICT (code) DO UPDATE SET
  name        = 'Investor Journey Product',
  description = 'MIM Digital Transformation Demand',
  color       = '#0747A6',
  is_active   = true,
  sort_order  = 1,
  updated_at  = now();
