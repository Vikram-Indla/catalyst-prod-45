-- G19: Add missing columns to support step-level execution tracking

-- 1. Add execution_mode to tm_test_runs (if not exists)
ALTER TABLE public.tm_test_runs
ADD COLUMN IF NOT EXISTS execution_mode text DEFAULT 'standard' CHECK (execution_mode IN ('standard', 'fasttrack'));

-- 2. Add step_number and comment to tm_step_results
ALTER TABLE public.tm_step_results
ADD COLUMN IF NOT EXISTS step_number integer,
ADD COLUMN IF NOT EXISTS comment text;

-- 3. Create index on (run_id, step_number) for quick lookups
CREATE INDEX IF NOT EXISTS idx_tm_step_results_run_step 
ON public.tm_step_results(test_run_id, step_number);

-- 4. Add trigger to auto-populate step_number from related tm_test_steps
CREATE OR REPLACE FUNCTION public.populate_step_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.step_number IS NULL THEN
    SELECT step_number INTO NEW.step_number
    FROM public.tm_test_steps
    WHERE id = NEW.test_step_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_step_number ON public.tm_step_results;
CREATE TRIGGER trg_populate_step_number
BEFORE INSERT ON public.tm_step_results
FOR EACH ROW
EXECUTE FUNCTION public.populate_step_number();