-- Add color column to demand_process_steps for storing brand color tokens
ALTER TABLE public.demand_process_steps 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'brand-olive';

-- Add comment for clarity
COMMENT ON COLUMN public.demand_process_steps.color IS 'Brand color token for this process step, used across the application';