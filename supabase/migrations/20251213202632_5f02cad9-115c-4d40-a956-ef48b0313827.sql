-- Drop the old check constraint that's too restrictive
ALTER TABLE public.risks DROP CONSTRAINT IF EXISTS risks_context_check;

-- Add a more flexible check constraint that allows risks linked to epics/features via related_item_id
ALTER TABLE public.risks ADD CONSTRAINT risks_context_check 
CHECK (
  (program_id IS NOT NULL) OR 
  (business_request_id IS NOT NULL) OR 
  (related_item_id IS NOT NULL AND relationship IS NOT NULL)
);