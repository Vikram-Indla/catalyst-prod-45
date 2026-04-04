-- Drop existing FK to th_cycle_test_cases
ALTER TABLE public.th_execution_attachments
  DROP CONSTRAINT th_execution_attachments_cycle_test_case_id_fkey;

-- Add new FK to tm_cycle_scope
ALTER TABLE public.th_execution_attachments
  ADD CONSTRAINT th_execution_attachments_cycle_test_case_id_fkey
  FOREIGN KEY (cycle_test_case_id) REFERENCES public.tm_cycle_scope(id) ON DELETE CASCADE;