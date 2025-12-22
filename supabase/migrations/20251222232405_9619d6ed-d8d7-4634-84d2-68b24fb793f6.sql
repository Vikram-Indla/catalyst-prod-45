-- Add EA review required column to business_requests table
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS ea_review_required BOOLEAN DEFAULT true;