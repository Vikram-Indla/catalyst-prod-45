-- Add smart set and versioning columns to test_sets
ALTER TABLE public.test_sets 
  ADD COLUMN IF NOT EXISTS is_smart_set BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS smart_set_criteria JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_versioned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Add index for smart sets
CREATE INDEX IF NOT EXISTS idx_test_sets_smart ON public.test_sets (is_smart_set) WHERE is_smart_set = true;

-- Comment for documentation
COMMENT ON COLUMN public.test_sets.is_smart_set IS 'If true, this set dynamically includes cases matching smart_set_criteria';
COMMENT ON COLUMN public.test_sets.smart_set_criteria IS 'JSON criteria for smart set: {status: [], priority: [], labels: [], component: [], folder_id: [], linked_story_id: []}';
COMMENT ON COLUMN public.test_sets.is_versioned IS 'If true, changes create new versions instead of updating in place';