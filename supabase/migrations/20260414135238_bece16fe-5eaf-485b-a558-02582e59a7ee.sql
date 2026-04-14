ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS flag_reason text;