-- Create saved_reports table for persisting generated reports
CREATE TABLE IF NOT EXISTS public.tm_saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false,
  owner_id UUID NOT NULL,
  project_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tm_saved_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports or shared reports
CREATE POLICY "Users can view own or shared reports" ON public.tm_saved_reports
  FOR SELECT USING (owner_id = auth.uid() OR is_shared = true);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can insert own reports" ON public.tm_saved_reports
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Policy: Users can update their own reports
CREATE POLICY "Users can update own reports" ON public.tm_saved_reports
  FOR UPDATE USING (owner_id = auth.uid());

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete own reports" ON public.tm_saved_reports
  FOR DELETE USING (owner_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tm_saved_reports_owner ON public.tm_saved_reports(owner_id);
CREATE INDEX IF NOT EXISTS idx_tm_saved_reports_type ON public.tm_saved_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_tm_saved_reports_shared ON public.tm_saved_reports(is_shared);

-- Add trigger for updated_at
CREATE TRIGGER update_tm_saved_reports_updated_at
  BEFORE UPDATE ON public.tm_saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();