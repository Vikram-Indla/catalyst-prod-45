-- Add missing columns for department, business_owner, and assignee
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS business_owner text,
ADD COLUMN IF NOT EXISTS assignee text;