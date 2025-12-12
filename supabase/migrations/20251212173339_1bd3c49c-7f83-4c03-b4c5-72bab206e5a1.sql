-- Add quarters field to epics table (array of quarter strings like 'Q1 2025', 'Q2 2025')
ALTER TABLE public.epics
ADD COLUMN IF NOT EXISTS quarters text[] DEFAULT '{}'::text[];

-- Add technical_score field if not exists (alias for wsjf_score or derived calculation)
-- Note: strategic_value_score already exists, we'll use that for Technical Score column

COMMENT ON COLUMN public.epics.quarters IS 'Array of quarter strings (e.g., Q1 2025, Q2 2025) for roadmap planning';