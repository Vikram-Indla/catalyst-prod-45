
CREATE TABLE IF NOT EXISTS public.di_weekly_awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  job_role TEXT NOT NULL,
  role_group TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  kpis JSONB NOT NULL DEFAULT '[]'::jsonb,
  projects TEXT[] NOT NULL DEFAULT '{}',
  consecutive_weeks INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department, week_number, week_start)
);

ALTER TABLE public.di_weekly_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read di_weekly_awards"
  ON public.di_weekly_awards FOR SELECT
  USING (true);

CREATE POLICY "Allow service role to insert/update di_weekly_awards"
  ON public.di_weekly_awards FOR ALL
  USING (true)
  WITH CHECK (true);
