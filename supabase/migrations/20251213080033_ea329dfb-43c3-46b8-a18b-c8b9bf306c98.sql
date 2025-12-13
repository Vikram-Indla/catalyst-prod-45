-- Add reporter_id, assignee_id, and linked_business_request_id columns to epics table
-- These columns support the enhanced Epic domain model

-- Reporter - required field for who created/reported the epic
ALTER TABLE public.epics 
ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES auth.users(id);

-- Assignee - required field for who is assigned to work on the epic
ALTER TABLE public.epics 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id);

-- Linked Business Request - optional field to link epic to a business request
ALTER TABLE public.epics 
ADD COLUMN IF NOT EXISTS linked_business_request_id UUID REFERENCES public.business_requests(id);

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_epics_reporter_id ON public.epics(reporter_id);
CREATE INDEX IF NOT EXISTS idx_epics_assignee_id ON public.epics(assignee_id);
CREATE INDEX IF NOT EXISTS idx_epics_linked_business_request_id ON public.epics(linked_business_request_id);

-- Add delivery_track and delivery_platform columns (reusing from Business Request pattern)
ALTER TABLE public.epics 
ADD COLUMN IF NOT EXISTS delivery_track TEXT;

ALTER TABLE public.epics 
ADD COLUMN IF NOT EXISTS delivery_platform TEXT;