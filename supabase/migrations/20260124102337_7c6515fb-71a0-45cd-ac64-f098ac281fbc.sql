-- Add release_id column to tm_test_cases pointing to releases table
ALTER TABLE public.tm_test_cases 
ADD COLUMN release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_tm_test_cases_release_id ON public.tm_test_cases(release_id);

-- Comment for clarity
COMMENT ON COLUMN public.tm_test_cases.release_id IS 'FK to releases table - the release this test case is assigned to';