-- Fix 1: tm_defect_links.test_run_id FK → tm_cycle_scope instead of tm_test_runs
ALTER TABLE public.tm_defect_links
  DROP CONSTRAINT IF EXISTS tm_defect_links_test_run_id_fkey;

ALTER TABLE public.tm_defect_links
  ADD CONSTRAINT tm_defect_links_test_run_id_fkey
  FOREIGN KEY (test_run_id) REFERENCES public.tm_cycle_scope(id) ON DELETE CASCADE;

-- Fix 2: th_test_executions.test_case_id FK → tm_test_cases instead of th_test_cases
ALTER TABLE public.th_test_executions
  DROP CONSTRAINT IF EXISTS th_test_executions_test_case_id_fkey;

ALTER TABLE public.th_test_executions
  ADD CONSTRAINT th_test_executions_test_case_id_fkey
  FOREIGN KEY (test_case_id) REFERENCES public.tm_test_cases(id) ON DELETE CASCADE;

-- Fix 3: Allow 'not_run' in the result CHECK constraint
ALTER TABLE public.th_test_executions
  DROP CONSTRAINT IF EXISTS th_test_executions_result_check;

ALTER TABLE public.th_test_executions
  ADD CONSTRAINT th_test_executions_result_check
  CHECK (result IN ('passed', 'failed', 'blocked', 'skipped', 'not_run'));