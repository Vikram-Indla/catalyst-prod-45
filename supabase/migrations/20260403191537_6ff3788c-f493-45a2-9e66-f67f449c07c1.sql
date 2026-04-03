
-- Add missing columns to tm_environments
ALTER TABLE tm_environments
  ADD COLUMN IF NOT EXISTS env_key TEXT,
  ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'testing',
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS url VARCHAR,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);

-- Add missing columns to tm_shared_step_categories
ALTER TABLE tm_shared_step_categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add missing columns to tm_shared_steps
ALTER TABLE tm_shared_steps
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS variables JSONB;

-- Backfill tm_environments from th_environments
UPDATE tm_environments te
SET
  env_key = th.env_key,
  type = th.type,
  status = th.status,
  url = th.url,
  owner_id = th.owner_id
FROM th_environments th
WHERE te.id = th.id;

-- Generate env_key for any rows without one
UPDATE tm_environments
SET env_key = 'ENV-' || LPAD(ROW_NUMBER::TEXT, 3, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_number
  FROM tm_environments
  WHERE env_key IS NULL
) sub
WHERE tm_environments.id = sub.id;

-- Backfill tm_shared_step_categories from th_shared_step_categories
UPDATE tm_shared_step_categories tsc
SET
  sort_order = COALESCE(th.sort_order, 0),
  description = th.description
FROM th_shared_step_categories th
WHERE tsc.id = th.id;

-- Backfill is_active on tm_shared_steps (all migrated rows are active)
UPDATE tm_shared_steps SET is_active = true WHERE is_active IS NULL;
