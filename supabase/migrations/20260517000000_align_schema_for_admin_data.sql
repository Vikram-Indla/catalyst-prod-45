-- Align target schema with admin data dump for migration
-- Makes extra columns in programs table nullable to accept source data
-- (source dump doesn't populate portfolio_id or rte_id for programs)

ALTER TABLE programs
  ALTER COLUMN portfolio_id DROP NOT NULL,
  ALTER COLUMN rte_id DROP NOT NULL;

-- Add module_access column to profiles if missing (stores user module permissions as JSON)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS module_access jsonb DEFAULT '{}' NOT NULL;

-- Add owner_id column to programs if missing
ALTER TABLE programs ADD COLUMN IF NOT EXISTS owner_id uuid;
