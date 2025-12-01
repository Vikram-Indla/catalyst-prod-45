-- Create shared_test_steps table for reusable test steps
CREATE TABLE IF NOT EXISTS public.shared_test_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  expected_result TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  CONSTRAINT title_not_empty CHECK (title <> '')
);

-- Create test_case_shared_steps linking table
CREATE TABLE IF NOT EXISTS public.test_case_shared_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  shared_step_id UUID NOT NULL REFERENCES public.shared_test_steps(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_test_case_shared_step_order UNIQUE(test_case_id, shared_step_id, step_order)
);

-- Modify test_steps table to support shared steps
ALTER TABLE public.test_steps 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS library_step_id UUID REFERENCES public.shared_test_steps(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS step_order INTEGER DEFAULT 1;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_steps_usage ON public.shared_test_steps(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_shared_steps_created_by ON public.shared_test_steps(created_by);
CREATE INDEX IF NOT EXISTS idx_test_case_shared_steps_order ON public.test_case_shared_steps(test_case_id, step_order);
CREATE INDEX IF NOT EXISTS idx_test_case_shared_steps_shared_step ON public.test_case_shared_steps(shared_step_id);
CREATE INDEX IF NOT EXISTS idx_test_steps_library_step ON public.test_steps(library_step_id);

-- Enable RLS
ALTER TABLE public.shared_test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_case_shared_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_test_steps
CREATE POLICY "Users can view shared test steps"
  ON public.shared_test_steps FOR SELECT
  USING (true);

CREATE POLICY "Users can create shared test steps"
  ON public.shared_test_steps FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own shared test steps"
  ON public.shared_test_steps FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own shared test steps"
  ON public.shared_test_steps FOR DELETE
  USING (created_by = auth.uid() AND usage_count = 0);

-- RLS Policies for test_case_shared_steps
CREATE POLICY "Users can view test case shared steps"
  ON public.test_case_shared_steps FOR SELECT
  USING (true);

CREATE POLICY "Users can insert test case shared steps"
  ON public.test_case_shared_steps FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update test case shared steps"
  ON public.test_case_shared_steps FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete test case shared steps"
  ON public.test_case_shared_steps FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Function to update usage count
CREATE OR REPLACE FUNCTION update_shared_step_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shared_test_steps 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.shared_step_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shared_test_steps 
    SET usage_count = GREATEST(0, usage_count - 1)
    WHERE id = OLD.shared_step_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain usage count
DROP TRIGGER IF EXISTS trigger_update_shared_step_usage ON public.test_case_shared_steps;
CREATE TRIGGER trigger_update_shared_step_usage
AFTER INSERT OR DELETE ON public.test_case_shared_steps
FOR EACH ROW
EXECUTE FUNCTION update_shared_step_usage_count();