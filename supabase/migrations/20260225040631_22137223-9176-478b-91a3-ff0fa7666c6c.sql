-- Persist manual initiative type selections for Jira-backed backlog items (MDT-xxx)
CREATE TABLE IF NOT EXISTS public.ph_issue_initiative_type_overrides (
  issue_key text PRIMARY KEY,
  initiative_type_id uuid NOT NULL REFERENCES public.initiative_types(id) ON DELETE RESTRICT,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ph_issue_initiative_type_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ph_issue_initiative_type_overrides'
      AND policyname = 'Authenticated users can read issue type overrides'
  ) THEN
    CREATE POLICY "Authenticated users can read issue type overrides"
      ON public.ph_issue_initiative_type_overrides
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ph_issue_initiative_type_overrides'
      AND policyname = 'Authenticated users can insert issue type overrides'
  ) THEN
    CREATE POLICY "Authenticated users can insert issue type overrides"
      ON public.ph_issue_initiative_type_overrides
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ph_issue_initiative_type_overrides'
      AND policyname = 'Authenticated users can update issue type overrides'
  ) THEN
    CREATE POLICY "Authenticated users can update issue type overrides"
      ON public.ph_issue_initiative_type_overrides
      FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;