-- Add time tracking columns to stories table
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS original_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent_minutes integer DEFAULT 0;

-- Add time tracking columns to features table  
ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS original_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent_minutes integer DEFAULT 0;

-- Create time log entries table for detailed tracking
CREATE TABLE IF NOT EXISTS public.work_item_time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id uuid NOT NULL,
  work_item_type text NOT NULL CHECK (work_item_type IN ('story', 'feature', 'epic', 'task')),
  minutes_logged integer NOT NULL DEFAULT 0,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_item_time_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for time logs
CREATE POLICY "Users can view time logs" ON public.work_item_time_logs
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create time logs" ON public.work_item_time_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own time logs" ON public.work_item_time_logs
  FOR UPDATE USING (logged_by = auth.uid());

CREATE POLICY "Users can delete own time logs" ON public.work_item_time_logs
  FOR DELETE USING (logged_by = auth.uid());

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_time_logs_work_item ON public.work_item_time_logs(work_item_id, work_item_type);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON public.work_item_time_logs(work_date);