-- Create global planner column configs table
CREATE TABLE public.planner_column_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id TEXT NOT NULL UNIQUE,          -- e.g. "qa-testing"
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  wip_limit INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.planner_column_configs ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all columns (global)
CREATE POLICY "Authenticated users can read planner columns"
  ON public.planner_column_configs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: authenticated users can insert new columns
CREATE POLICY "Authenticated users can insert planner columns"
  ON public.planner_column_configs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: authenticated users can update columns
CREATE POLICY "Authenticated users can update planner columns"
  ON public.planner_column_configs
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Policy: authenticated users can delete columns
CREATE POLICY "Authenticated users can delete planner columns"
  ON public.planner_column_configs
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.planner_column_configs;