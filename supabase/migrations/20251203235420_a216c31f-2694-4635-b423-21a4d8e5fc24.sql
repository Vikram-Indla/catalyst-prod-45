-- Add planned_quarter column to business_requests table
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS planned_quarter text DEFAULT NULL;