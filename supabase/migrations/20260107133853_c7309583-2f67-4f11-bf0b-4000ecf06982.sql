-- Add contract_start_date column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS contract_start_date date;