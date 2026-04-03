
-- Add action and expected_result columns to tm_shared_steps for UI compat
ALTER TABLE tm_shared_steps
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS expected_result TEXT;

-- Backfill from steps JSONB array
UPDATE tm_shared_steps
SET
  action = COALESCE(steps->0->>'action', ''),
  expected_result = steps->0->>'expected_result'
WHERE action IS NULL AND steps IS NOT NULL AND jsonb_array_length(steps) > 0;
