-- =============================================================================
-- Project Hub Dashboard — enable Supabase Realtime for source tables
-- =============================================================================
-- The dashboard subscribes to postgres_changes on these three tables via
-- src/hooks/useDashboardRealtime.ts. Without an entry in the
-- supabase_realtime publication, INSERT/UPDATE/DELETE events never reach the
-- client and dashboards silently fall back to the 15-minute staleTime.
--
-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if the table is already
-- in the publication, so we wrap each call in a guarded DO block.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ph_issues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ph_issues;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tm_defects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tm_defects;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'catalyst_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.catalyst_status_history;
  END IF;
END $$;

-- Realtime sends only PK by default for UPDATE/DELETE — bump to FULL replica
-- identity so the row payload includes project_key (needed by the client-side
-- filter). Skip if Postgres already at FULL.
ALTER TABLE public.ph_issues REPLICA IDENTITY FULL;
ALTER TABLE public.tm_defects REPLICA IDENTITY FULL;
ALTER TABLE public.catalyst_status_history REPLICA IDENTITY FULL;
