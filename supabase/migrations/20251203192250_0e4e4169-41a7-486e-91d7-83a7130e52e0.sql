-- Drop the foreign key constraint and change field_id to TEXT
ALTER TABLE public.epic_intake_responses 
DROP CONSTRAINT IF EXISTS epic_intake_responses_field_id_fkey;

ALTER TABLE public.epic_intake_responses 
ALTER COLUMN field_id TYPE TEXT USING field_id::TEXT;

-- Create unique constraint on epic_id + field_id for upsert support
ALTER TABLE public.epic_intake_responses
ADD CONSTRAINT epic_intake_responses_epic_field_unique UNIQUE (epic_id, field_id);