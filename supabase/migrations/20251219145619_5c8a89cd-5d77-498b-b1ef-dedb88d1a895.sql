-- Add missing fields to incidents table for enterprise-grade incident management

-- Business Process (Impact Context)
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS business_process_id uuid REFERENCES public.business_processes(id);

-- Affected Service/System
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS service_component text;

-- Incident Type (optional categorization)
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS incident_type text;

-- Resolution fields (required on resolve)
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS resolution_summary text;

ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS resolution_type text;

ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS root_cause text;

-- Closed timestamp
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Create index for business process lookup
CREATE INDEX IF NOT EXISTS idx_incidents_business_process_id ON public.incidents(business_process_id);