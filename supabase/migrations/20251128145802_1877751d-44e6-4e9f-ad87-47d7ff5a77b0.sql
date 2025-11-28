-- Enhance epic_custom_columns table with full user preferences
CREATE TABLE IF NOT EXISTS public.epic_custom_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  position INTEGER NOT NULL,
  wip_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, column_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_epic_custom_columns_user_id ON public.epic_custom_columns(user_id);

-- Enable RLS
ALTER TABLE public.epic_custom_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own custom columns"
  ON public.epic_custom_columns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom columns"
  ON public.epic_custom_columns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom columns"
  ON public.epic_custom_columns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom columns"
  ON public.epic_custom_columns FOR DELETE
  USING (auth.uid() = user_id);

-- Add WIP limit tracking to process steps
ALTER TABLE public.process_steps 
ADD COLUMN IF NOT EXISTS wip_limit INTEGER,
ADD COLUMN IF NOT EXISTS wip_limit_enabled BOOLEAN DEFAULT false;

-- Add time tracking fields to epic_process_history
ALTER TABLE public.epic_process_history
ADD COLUMN IF NOT EXISTS cycle_time_hours NUMERIC,
ADD COLUMN IF NOT EXISTS lead_time_hours NUMERIC;

-- Create function to calculate time in step
CREATE OR REPLACE FUNCTION public.calculate_epic_process_time()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate cycle time when exiting a step
  IF NEW.exited_at IS NOT NULL AND OLD.exited_at IS NULL THEN
    NEW.cycle_time_hours := EXTRACT(EPOCH FROM (NEW.exited_at - NEW.entered_at)) / 3600;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for time calculation
DROP TRIGGER IF EXISTS trigger_calculate_epic_process_time ON public.epic_process_history;
CREATE TRIGGER trigger_calculate_epic_process_time
  BEFORE UPDATE ON public.epic_process_history
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_epic_process_time();

-- Add bottom-up estimate metadata
ALTER TABLE public.epics
ADD COLUMN IF NOT EXISTS estimate_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS estimate_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS last_estimate_calculation TIMESTAMP WITH TIME ZONE;

-- Create report templates table
CREATE TABLE IF NOT EXISTS public.epic_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  filters_json JSONB,
  columns_json JSONB,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_cron TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on report templates
ALTER TABLE public.epic_report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own report templates"
  ON public.epic_report_templates FOR ALL
  USING (auth.uid() = user_id);

-- Add updated_at trigger for custom columns
CREATE TRIGGER update_epic_custom_columns_updated_at
  BEFORE UPDATE ON public.epic_custom_columns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for report templates
CREATE TRIGGER update_epic_report_templates_updated_at
  BEFORE UPDATE ON public.epic_report_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();