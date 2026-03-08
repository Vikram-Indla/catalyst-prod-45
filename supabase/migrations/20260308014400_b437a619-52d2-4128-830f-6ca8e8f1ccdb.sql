
-- D06: UAT scenarios table
CREATE TABLE IF NOT EXISTS public.brd_uat_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brd_id UUID NOT NULL REFERENCES public.brd_documents(id) ON DELETE CASCADE,
  scenario_key TEXT NOT NULL,
  title TEXT NOT NULL,
  steps TEXT,
  expected_result TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.brd_uat_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to brd_uat_scenarios" ON public.brd_uat_scenarios FOR ALL USING (true) WITH CHECK (true);

-- D08: Add pdf_url to brd_documents if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'brd_documents' AND column_name = 'pdf_url') THEN
    ALTER TABLE public.brd_documents ADD COLUMN pdf_url TEXT;
  END IF;
END $$;

-- D08: Storage bucket for BRD attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('brd-attachments', 'brd-attachments', true) ON CONFLICT (id) DO NOTHING;

-- D09: Activity log table
CREATE TABLE IF NOT EXISTS public.ra_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brd_id UUID REFERENCES public.brd_documents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ra_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ra_activity_log" ON public.ra_activity_log FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for activity log
ALTER PUBLICATION supabase_realtime ADD TABLE public.ra_activity_log;
