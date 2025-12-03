-- Add financial columns to features table
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS estimation_method text DEFAULT 'points',
ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS work_code text,
ADD COLUMN IF NOT EXISTS capitalized boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_revenue_growth numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_cost_savings numeric DEFAULT 0;