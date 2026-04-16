
-- Step 1: Add new generic columns
ALTER TABLE public.user_recent_items
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS entity_key TEXT,
  ADD COLUMN IF NOT EXISTS display_summary TEXT,
  ADD COLUMN IF NOT EXISTS nav_path TEXT,
  ADD COLUMN IF NOT EXISTS project_name TEXT,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 1;

-- Step 2: Migrate existing data
UPDATE public.user_recent_items
SET entity_type = issue_type,
    entity_id = issue_id::text,
    entity_key = issue_key,
    display_summary = summary,
    nav_path = '/project-hub'
WHERE entity_type IS NULL;

-- Step 3: Make new columns NOT NULL now that data is migrated
ALTER TABLE public.user_recent_items
  ALTER COLUMN entity_type SET NOT NULL,
  ALTER COLUMN entity_id SET NOT NULL,
  ALTER COLUMN display_summary SET NOT NULL,
  ALTER COLUMN nav_path SET NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE public.user_recent_items
  DROP COLUMN IF EXISTS issue_id,
  DROP COLUMN IF EXISTS issue_key,
  DROP COLUMN IF EXISTS issue_type,
  DROP COLUMN IF EXISTS summary;

-- Step 5: Change project_id to TEXT (was UUID, but project keys are text)
ALTER TABLE public.user_recent_items
  ALTER COLUMN project_id DROP NOT NULL,
  ALTER COLUMN project_id TYPE TEXT USING project_id::text;

-- Step 6: Drop old unique constraint and add new one
DO $$
BEGIN
  -- Drop any existing unique constraints
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_recent_items_user_id_project_id_issue_id_key') THEN
    ALTER TABLE public.user_recent_items DROP CONSTRAINT user_recent_items_user_id_project_id_issue_id_key;
  END IF;
END $$;

ALTER TABLE public.user_recent_items
  ADD CONSTRAINT uq_user_recent_entity UNIQUE (user_id, entity_type, entity_id);

-- Step 7: Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_recent_items_user_visited
  ON public.user_recent_items (user_id, visited_at DESC);
