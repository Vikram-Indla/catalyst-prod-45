-- Change planned_quarter from text to text[] (array)
-- Step 1: Add new column as text array
ALTER TABLE public.business_requests 
ADD COLUMN planned_quarters text[];

-- Step 2: Migrate existing data (wrap single values into arrays)
UPDATE public.business_requests 
SET planned_quarters = ARRAY[planned_quarter]
WHERE planned_quarter IS NOT NULL AND planned_quarter != '';

-- Step 3: Drop old column
ALTER TABLE public.business_requests 
DROP COLUMN planned_quarter;

-- Step 4: Rename new column to planned_quarter
ALTER TABLE public.business_requests 
RENAME COLUMN planned_quarters TO planned_quarter;