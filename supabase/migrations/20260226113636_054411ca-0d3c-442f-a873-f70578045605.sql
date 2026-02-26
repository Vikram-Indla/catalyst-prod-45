-- Add ea_review and priority columns to ph_initiatives
ALTER TABLE public.ph_initiatives ADD COLUMN IF NOT EXISTS ea_review text DEFAULT NULL;
ALTER TABLE public.ph_initiatives ADD COLUMN IF NOT EXISTS priority text DEFAULT NULL;