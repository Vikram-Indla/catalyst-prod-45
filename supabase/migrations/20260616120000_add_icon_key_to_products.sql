-- Adds icon_key to products: the selected product icon (filename stem from
-- src/assets/icons/products/*.svg). Replaces color as the product visual
-- identity chosen in the create form. Color column is retained for backward
-- compatibility with existing sidebar badge rendering.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS icon_key text;
COMMENT ON COLUMN public.products.icon_key IS 'Selected product icon key (filename stem from src/assets/icons/products/*.svg). Replaces color as the product visual identity in the create form.';
