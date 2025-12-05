-- Add missing business score input columns to business_requests
ALTER TABLE public.business_requests 
ADD COLUMN IF NOT EXISTS executive_urgency integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS business_value integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS complexity_score integer DEFAULT 0;

-- Create user preferences table for industry page column order
CREATE TABLE IF NOT EXISTS public.user_industry_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  column_order TEXT[] DEFAULT ARRAY['request_key', 'rank', 'title', 'process_step', 'business_score', 'planned_quarter', 'end_date', 'ageing'],
  column_visibility JSONB DEFAULT '{"request_key": true, "rank": true, "title": true, "process_step": true, "business_score": true, "planned_quarter": true, "end_date": true, "ageing": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_industry_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own industry preferences"
ON public.user_industry_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own industry preferences"
ON public.user_industry_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own industry preferences"
ON public.user_industry_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_industry_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_industry_preferences_updated_at
BEFORE UPDATE ON public.user_industry_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_industry_preferences_timestamp();