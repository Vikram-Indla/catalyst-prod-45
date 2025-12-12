-- Step 1: Add 'key' column to portfolios table (Programs)
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS key TEXT;

-- Step 2: Add 'key' column to programs table (Projects)
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS key TEXT;

-- Step 3: Add 'description' columns if missing
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 4: Add unique constraints on key columns
ALTER TABLE public.portfolios 
ADD CONSTRAINT portfolios_key_unique UNIQUE (key);

ALTER TABLE public.programs 
ADD CONSTRAINT programs_key_unique UNIQUE (key);

-- Step 5: Generate initial keys for existing records (uppercase from name)
UPDATE public.portfolios 
SET key = UPPER(REPLACE(REPLACE(name, ' ', ''), '-', ''))
WHERE key IS NULL;

UPDATE public.programs 
SET key = UPPER(REPLACE(REPLACE(name, ' ', ''), '-', ''))
WHERE key IS NULL;

-- Step 6: Create Default Portfolio (Program) if not exists
INSERT INTO public.portfolios (id, name, key, description, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default',
  'DEFAULT',
  'System default program for projects without explicit program assignment',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Step 7: Make key column NOT NULL after population
ALTER TABLE public.portfolios 
ALTER COLUMN key SET NOT NULL;

ALTER TABLE public.programs 
ALTER COLUMN key SET NOT NULL;