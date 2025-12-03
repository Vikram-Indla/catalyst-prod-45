-- Add Lean Business Case fields to epics table
ALTER TABLE public.epics 
ADD COLUMN IF NOT EXISTS success_criteria text,
ADD COLUMN IF NOT EXISTS approvers text,
ADD COLUMN IF NOT EXISTS future_state text;

-- Add funding_stage to epic_spend table
ALTER TABLE public.epic_spend 
ADD COLUMN IF NOT EXISTS funding_stage text DEFAULT 'Not Defined';