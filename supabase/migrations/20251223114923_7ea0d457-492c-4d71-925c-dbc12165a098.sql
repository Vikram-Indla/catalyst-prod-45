DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teams'
      AND policyname = 'Creators can view their teams'
  ) THEN
    CREATE POLICY "Creators can view their teams"
    ON public.teams
    FOR SELECT
    USING (created_by = auth.uid());
  END IF;
END $$;
