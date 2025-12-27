
-- Add 'excel' to mock_runs.source_type check constraint
ALTER TABLE public.mock_runs DROP CONSTRAINT mock_runs_source_type_check;

ALTER TABLE public.mock_runs ADD CONSTRAINT mock_runs_source_type_check
  CHECK (source_type = ANY (ARRAY['pdf', 'csv', 'excel', 'markdown', 'text', 'synthetic']));
