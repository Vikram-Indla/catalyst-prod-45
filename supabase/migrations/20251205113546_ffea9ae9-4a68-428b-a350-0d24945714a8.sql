-- Add is_force_ranked column to business_requests table
ALTER TABLE public.business_requests
ADD COLUMN IF NOT EXISTS is_force_ranked boolean DEFAULT false;