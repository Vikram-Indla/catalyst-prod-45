-- Add rank column to business_requests table for forced ranking
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS rank integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rank_override_justification text DEFAULT NULL;