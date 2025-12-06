-- Make program_id, program_increment_id, owner_id, and created_by nullable for demand-scoped risks
ALTER TABLE public.risks 
  ALTER COLUMN program_id DROP NOT NULL,
  ALTER COLUMN program_increment_id DROP NOT NULL,
  ALTER COLUMN owner_id DROP NOT NULL,
  ALTER COLUMN created_by DROP NOT NULL;

-- Add a check constraint to ensure either program_id OR business_request_id is set
ALTER TABLE public.risks ADD CONSTRAINT risks_context_check 
  CHECK (program_id IS NOT NULL OR business_request_id IS NOT NULL);