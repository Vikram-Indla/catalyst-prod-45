-- Drop the incorrect FK that references tm_test_steps itself
ALTER TABLE public.tm_test_steps
  DROP CONSTRAINT IF EXISTS tm_test_steps_shared_step_id_fkey;

-- Recreate it pointing to the correct table: tm_shared_steps
ALTER TABLE public.tm_test_steps
  ADD CONSTRAINT tm_test_steps_shared_step_id_fkey
  FOREIGN KEY (shared_step_id) REFERENCES public.tm_shared_steps(id)
  ON DELETE SET NULL;