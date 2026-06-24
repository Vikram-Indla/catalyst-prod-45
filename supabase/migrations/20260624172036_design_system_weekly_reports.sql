-- Design system weekly compliance reports
-- Stores the output of scripts/weekly-compliance-report.js
-- Read/written via supabase CLI (supabase db query --linked)

CREATE TABLE IF NOT EXISTS public.design_system_weekly_reports (
  id            bigserial PRIMARY KEY,
  report_date   date        NOT NULL,
  total         integer     NOT NULL,
  health        text        NOT NULL CHECK (health IN ('EXCELLENT','GOOD','AT-RISK','CRITICAL')),
  self_test_ok  boolean     NOT NULL,
  audit_exit    integer     NOT NULL,
  categories    jsonb       NOT NULL DEFAULT '{}',
  regressions   jsonb       NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One row per calendar date (re-run on same day = upsert)
CREATE UNIQUE INDEX IF NOT EXISTS design_system_weekly_reports_date_uidx
  ON public.design_system_weekly_reports (report_date);

-- RLS: readable by all authenticated users (non-PII governance metadata)
ALTER TABLE public.design_system_weekly_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'design_system_weekly_reports'
      AND policyname = 'Anyone authenticated can read weekly reports'
  ) THEN
    CREATE POLICY "Anyone authenticated can read weekly reports"
      ON public.design_system_weekly_reports
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'design_system_weekly_reports'
      AND policyname = 'Service role writes weekly reports'
  ) THEN
    CREATE POLICY "Service role writes weekly reports"
      ON public.design_system_weekly_reports
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
