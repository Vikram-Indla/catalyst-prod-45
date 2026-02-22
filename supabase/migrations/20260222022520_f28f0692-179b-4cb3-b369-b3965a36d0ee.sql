
-- Add on_hold_reason to ph_work_items for tracking why items are on hold
ALTER TABLE public.ph_work_items ADD COLUMN IF NOT EXISTS on_hold_reason text;

-- Add assigned_at and assigned_by for tracking assignment metadata
ALTER TABLE public.ph_work_items ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
ALTER TABLE public.ph_work_items ADD COLUMN IF NOT EXISTS assigned_by uuid;
