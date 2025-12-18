-- Add quarter column to dependencies table
ALTER TABLE public.dependencies 
ADD COLUMN IF NOT EXISTS quarter text;

-- Backfill quarter from PI if available, otherwise use current quarter
UPDATE public.dependencies d
SET quarter = COALESCE(
  -- Try to derive quarter from pi start_date
  (SELECT 'Q' || EXTRACT(QUARTER FROM pi.start_date)::text || ' ' || EXTRACT(YEAR FROM pi.start_date)::text
   FROM program_increments pi WHERE pi.id = d.pi_id),
  -- Fallback to current quarter
  'Q' || EXTRACT(QUARTER FROM CURRENT_DATE)::text || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::text
)
WHERE quarter IS NULL;

-- Set default for new records
ALTER TABLE public.dependencies 
ALTER COLUMN quarter SET DEFAULT ('Q' || EXTRACT(QUARTER FROM CURRENT_DATE)::text || ' ' || EXTRACT(YEAR FROM CURRENT_DATE)::text);

-- Make quarter NOT NULL after backfill
ALTER TABLE public.dependencies 
ALTER COLUMN quarter SET NOT NULL;